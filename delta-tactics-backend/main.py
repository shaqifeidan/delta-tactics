from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from fastapi.middleware.cors import CORSMiddleware

import models
import schemas
from database import engine, get_db

# 自动创建表
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

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

# ==========================
# 标签 (Tags) API
# ==========================
@app.post("/api/tags", response_model=schemas.TagResponse)
def create_tag(tag: schemas.TagCreate, db: Session = Depends(get_db)):
    db_tag = models.Tag(name=tag.name, category=tag.category, color=tag.color, parent_id=tag.parent_id)
    db.add(db_tag)
    db.commit()          # 提交到数据库
    db.refresh(db_tag)   # 刷新以获取自动生成的 ID
    return db_tag

@app.get("/api/tags", response_model=List[schemas.TagResponse])
def get_tags(db: Session = Depends(get_db)):
    return db.query(models.Tag).all()

# ==========================
# 笔记 (Notes) API
# ==========================
@app.post("/api/notes", response_model=schemas.NoteResponse)
def create_note(note: schemas.NoteCreate, db: Session = Depends(get_db)):
    # 1. 创建笔记本身（包含空间地理坐标）
    db_note = models.Note(
        title=note.title,
        context=note.context,
        takeaway=note.takeaway,
        is_starred=note.is_starred,
        map_name=note.map_name,
        coord_x=note.coord_x,
        coord_y=note.coord_y
    )
    
    # 2. 如果前端传了标签 ID，绑定这些标签
    if note.tag_ids:
        tags = db.query(models.Tag).filter(models.Tag.id.in_(note.tag_ids)).all()
        db_note.tags = tags
        
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

@app.get("/api/notes", response_model=List[schemas.NoteResponse])
def get_notes(db: Session = Depends(get_db)):
    return db.query(models.Note).all()

@app.delete("/api/notes/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db)):
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    db.delete(db_note)
    db.commit()
    return {"message": "笔记已删除"}

# 2. 更新笔记（包含修改心得和坐标等）
@app.put("/api/notes/{note_id}", response_model=schemas.NoteResponse)
def update_note(note_id: int, note_update: schemas.NoteCreate, db: Session = Depends(get_db)):
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