import os
import socket
import logging
from urllib.parse import urlparse, urlunparse
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 优先读取云端传进来的 DATABASE_URL，如果没有（在本地），则默认使用本地 SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./delta_notes.db")

# 有些平台（Heroku / Render）会提供以 postgres:// 开头的 URL，
# SQLAlchemy 2.x 期望使用 postgresql:// 或 postgresql+psycopg2://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 工厂方法：根据 URL 创建 engine（方便之后重建）
def _create_engine_from_url(url: str):
    if url.startswith("sqlite"):
        engine = create_engine(
            url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
        )
    else:
        engine = create_engine(
            url,
            connect_args={"sslmode": "require", "connect_timeout": 10},
            pool_pre_ping=True,
        )
    return engine

# 首次创建 engine
engine = _create_engine_from_url(DATABASE_URL)

# SessionLocal 初始绑定到 engine；如果 later 替换 engine，下面的函数会被更新
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


from sqlalchemy import text
from sqlalchemy.exc import OperationalError


def get_db():
    """Yield a DB session. On OperationalError caused by network/IPv6 issues,
    attempt IPv4 fallback once and retry.
    """
    global SessionLocal
    session = None
    try:
        session = SessionLocal()
        # force a quick test query to surface connection issues early
        session.execute(text("SELECT 1"))
        yield session
    except OperationalError as e:
        msg = str(e)
        logging.exception("DB OperationalError when acquiring session: %s", e)
        # If network unreachable (likely IPv6 problem) or operator forced IPv4, try fallback
        if ("Network is unreachable" in msg) or (os.getenv("FORCE_IPV4", "").lower() == "true"):
            logging.info("Attempting IPv4 fallback due to DB OperationalError or FORCE_IPV4")
            replace_engine_with_ipv4()
            # rebuild session with new SessionLocal
            session = SessionLocal()
            # try test query again to raise if still failing
            session.execute(text("SELECT 1"))
            yield session
        else:
            raise
    finally:
        if session:
            try:
                session.close()
            except Exception:
                pass


# IPv4 回退逻辑
def _resolve_ipv4(hostname: str):
    """返回 hostname 对应的第一个 IPv4 地址，找不到则抛异常。"""
    try:
        # getaddrinfo 可以返回多个地址，过滤出 AF_INET（IPv4）
        for res in socket.getaddrinfo(hostname, None):
            family, _, _, _, sockaddr = res
            if family == socket.AF_INET:
                return sockaddr[0]
    except Exception as e:
        logging.debug("IPv4 resolve failed for %s: %s", hostname, e)
    raise RuntimeError(f"No IPv4 address found for {hostname}")


def replace_engine_with_ipv4():
    """如果 DATABASE_URL 的主机名解析到 IPv4，可用该 IPv4 替换 URL 中的 host 并重建 engine 和 SessionLocal。
    仅在需要时调用。"""
    global engine, SessionLocal, DATABASE_URL
    parsed = urlparse(DATABASE_URL)
    hostname = parsed.hostname
    if not hostname:
        logging.error("Cannot parse hostname from DATABASE_URL")
        return

    try:
        ipv4 = _resolve_ipv4(hostname)
    except Exception as e:
        logging.error("Could not resolve IPv4 for %s: %s", hostname, e)
        return

    # 重建 netloc：保留 username:password@ 和 port
    userinfo = ""
    if parsed.username:
        userinfo += parsed.username
        if parsed.password:
            userinfo += f":{parsed.password}"
        userinfo += "@"
    port = f":{parsed.port}" if parsed.port else ""
    new_netloc = f"{userinfo}{ipv4}{port}"

    new_parts = (
        parsed.scheme,
        new_netloc,
        parsed.path or "",
        parsed.params or "",
        parsed.query or "",
        parsed.fragment or "",
    )
    new_url = urlunparse(new_parts)

    logging.info("Replacing DB host %s with IPv4 %s for connection (new_url masked)", hostname, ipv4)

    try:
        new_engine = _create_engine_from_url(new_url)
        # Test a short connection to ensure it's usable
        conn = new_engine.connect()
        conn.close()
    except Exception as e:
        logging.exception("Failed to connect using IPv4 %s: %s", ipv4, e)
        return

    # 替换全局 engine 和 SessionLocal
    engine = new_engine
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logging.info("Engine replaced to use IPv4 %s", ipv4)
