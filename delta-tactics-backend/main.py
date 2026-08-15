from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from fastapi.middleware.cors import CORSMiddleware

import models
import schemas
import database

app = FastAPI()

# 在启动事件中尝试创建表（带重试），避免在应用导入时因 DB 暂不可达导致程序直接崩溃
import time
import logging

@app.on_event("startup")
def startup_event():
    max_retries = 3
    delay = 2
    for attempt in range(1, max_retries + 1):
        try:
            models.Base.metadata.create_all(bind=database.engine)
            logging.info("Database tables ensured on startup")
            break
        except Exception as e:
            msg = str(e)
            logging.exception("Database unavailable on startup (attempt %s/%s): %s", attempt, max_retries, e)
            # 如果因网络不可达并且看起来是 IPv6 问题，尝试 IPv4 回退一次
            if "Network is unreachable" in msg and attempt == 1:
                logging.info("Detected network unreachable; attempting IPv4 fallback")
                database.replace_engine_with_ipv4()
                # 重试立即进行（不增加延迟）
                continue
            if attempt < max_retries:
                time.sleep(delay)
                delay *= 2
            else:
                logging.error("Could not connect to database after %s attempts; continuing without DB initialization", max_retries)

# 核心：配置允许跨域访问的白名单
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境也可以写具体的前端网址，开发测试用 ["*"] 最省心
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有请求方法 (GET, POST 等)
    allow_headers=["*"],  # 允许所有请求头
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Delta Tactics Vault!"}

# 健康检查端点：快速检测数据库连通性
from sqlalchemy import text

@app.get("/health")
def health():
    try:
        with database.engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as e:
        logging.exception("Health check DB failed: %s", e)
        raise HTTPException(status_code=503, detail="database unreachable")

# ==========================
# 标签 (Tags) API
# ==========================
@app.post("/api/tags", response_model=schemas.TagResponse)
def create_tag(tag: schemas.TagCreate, db: Session = Depends(database.get_db)):
    # 创建标签（models.Tag 不包含 parent_id，目前只保存 name, category, color）
    db_tag = models.Tag(name=tag.name, category=tag.category, color=tag.color)
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag

@app.get("/api/tags", response_model=List[schemas.TagResponse])
def get_tags(db: Session = Depends(database.get_db)):
    return db.query(models.Tag).all()

# ==========================
# 笔记 (Notes) API
# ==========================
@app.post("/api/notes", response_model=schemas.NoteResponse)
def create_note(note: schemas.NoteCreate, db: Session = Depends(database.get_db)):
    # 创建笔记（Note 模型目前包含 title, context, action, takeaway, is_starred）
    db_note = models.Note(
        title=note.title,
        context=note.context,
        action=note.action,
        takeaway=note.takeaway,
        is_starred=note.is_starred
    )

    # 绑定标签（如果提供）
    if note.tag_ids:
        tags = db.query(models.Tag).filter(models.Tag.id.in_(note.tag_ids)).all()
        db_note.tags = tags

    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

@app.get("/api/notes", response_model=List[schemas.NoteResponse])
def get_notes(db: Session = Depends(database.get_db)):
    return db.query(models.Note).all()

@app.delete("/api/notes/{note_id}")
def delete_note(note_id: int, db: Session = Depends(database.get_db)):
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    db.delete(db_note)
    db.commit()
    return {"message": "笔记已删除"}

# 2. 更新笔记（包含修改心得和坐标等）
@app.put("/api/notes/{note_id}", response_model=schemas.NoteResponse)
def update_note(note_id: int, note_update: schemas.NoteCreate, db: Session = Depends(database.get_db)):
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    
    # 更新基础字段
    db_note.title = note_update.title
    db_note.context = note_update.context
    db_note.takeaway = note_update.takeaway
    db_note.map_name = note_update.map_name
    db_note.coord_x = note_update.coord_x
    db_note.coord_y = note_update.coord_y
    
    # 更新标签（先清空再重新绑定）
    if note_update.tag_ids is not None:
        tags = db.query(models.Tag).filter(models.Tag.id.in_(note_update.tag_ids)).all()
        db_note.tags = tags
        
    db.commit()
    db.refresh(db_note)
    return db_note