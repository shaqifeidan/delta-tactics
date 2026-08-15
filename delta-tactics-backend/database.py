import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 优先读取云端传进来的 DATABASE_URL，如果没有（在本地），则默认使用本地 SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./delta_notes.db")

# 针对 SQLite 和 PostgreSQL 的兼容配置
if DATABASE_URL.startswith("sqlite"):
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