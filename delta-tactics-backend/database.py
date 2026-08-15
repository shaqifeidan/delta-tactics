from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 本地 SQLite 数据库文件名为 delta_notes.db
SQLALCHEMY_DATABASE_URL = "sqlite:///./delta_notes.db"

# connect_args={"check_same_thread": False} 是 SQLite 特有的要求
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# 获取数据库会话的依赖函数
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
