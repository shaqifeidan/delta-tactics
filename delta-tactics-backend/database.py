import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 优先读取云端传进来的 DATABASE_URL，如果没有（在本地），则默认使用本地 SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./delta_notes.db")

# 有些平台（Heroku / Render）会提供以 postgres:// 开头的 URL，
# SQLAlchemy 2.x 期望使用 postgresql:// 或 postgresql+psycopg2://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 针对 SQLite 和其他数据库的兼容配置
if DATABASE_URL.startswith("sqlite"):
    # SQLite 在多线程/多进程场景下需要这个参数
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
