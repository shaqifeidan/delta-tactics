from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# ==========================
# Tag (标签) 相关 Schema
# ==========================
class TagBase(BaseModel):
    name: str
    category: str
    color: Optional[str] = None
    # 新增：允许接收和返回父级 ID
    parent_id: Optional[int] = None

# 前端发请求创建标签时用的格式
class TagCreate(TagBase):
    pass

# 后端返回给前端的标签格式（包含数据库生成的 ID）
class TagResponse(TagBase):
    id: int
    
    # Pydantic V2 语法，允许直接读取 SQLAlchemy 的 ORM 模型
    model_config = {"from_attributes": True}

# ==========================
# Note (笔记) 相关 Schema
# ==========================
class NoteBase(BaseModel):
    title: str
    context: Optional[str] = None
    takeaway: str
    is_starred: Optional[bool] = False
    
    # ================= 新增：空间坐标字段 =================
    map_name: Optional[str] = None
    coord_x: Optional[float] = None
    coord_y: Optional[float] = None
    # ====================================================

class NoteCreate(NoteBase):
    tag_ids: List[int] = []

class NoteResponse(NoteBase):
    id: int
    created_at: datetime
    tags: List['TagResponse'] = []  # 引用上面定义的 TagResponse

    model_config = {"from_attributes": True}
