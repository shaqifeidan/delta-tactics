from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Table, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

# 1. 多对多关联表 (Note_Tags)
# 因为不需要独立操作这张表，我们直接用 Table 对象创建
note_tags = Table(
    'note_tags',
    Base.metadata,
    Column('note_id', Integer, ForeignKey('notes.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id'), primary_key=True)
)

# 2. 标签表模型 (Tags)
class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    category = Column(String(50), nullable=False)  # 比如: MAP, MECHANICS, PHASE
    color = Column(String(20))
    
    # 新增：指向父级标签的外键
    parent_id = Column(Integer, ForeignKey("tags.id"), nullable=True)

    # 建立与 Notes 的反向关系
    notes = relationship("Note", secondary="note_tags", back_populates="tags")
    
    # 新增：建立父子层级的自我关联关系
    parent = relationship("Tag", remote_side=[id], backref="children")
# 3. 笔记表模型 (Notes)
class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    context = Column(Text, nullable=True)
    takeaway = Column(Text, nullable=False)
    is_starred = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # ================= 新增：死亡记录专属空间坐标 =================
    map_name = Column(String(50), nullable=True)  # 记录地图名称，如 "零号大坝"
    coord_x = Column(Float, nullable=True)        # X轴百分比坐标 (0.0 ~ 100.0)
    coord_y = Column(Float, nullable=True)        # Y轴百分比坐标 (0.0 ~ 100.0)
    # ==========================================================

    tags = relationship("Tag", secondary="note_tags", back_populates="notes")
