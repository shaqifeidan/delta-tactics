import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# 加载本地可能存在的 .env 文件（如果有的的话）
load_dotenv()

import models

# 核心：自动识别环境变量中的云端数据库地址，如果没有则退回本地 SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./delta_notes.db")

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 你的完整战术字典数据结构
INITIAL_TAGS = {
    "MAP": {
        "零号大坝": ["管道区域", "军营", "行政辖区", "水泥厂", "大小变电站", "游客中心", "野外区域"],
        "AZ3": ["应急火电站", "乏燃料处理厂", "后处理厂", "老科学院", "石棺", "RBMK反应堆", "运输仓库", "废水堆放区", "压水堆", "仿星器研究所", "海水处理区", "海边办公楼"],
        "巴克什": ["樱桃小镇", "蓝汀旅馆", "阿坦亚遗址", "停车场", "巴克什大浴场", "巴克什集市", "皇家博物馆", "蓝调山城", "阿萨拉营地"],
        "航天基地": ["中控区", "中控桥", "宿舍区", "工业区", "罐装区", "浮力室", "蓝室", "离心机室", "总裁室", "黑室", "中心花园", "水平试车场", "发射区"]
    },
    "MECHANICS": {
        "操作细节": ["正面对枪", "近点搏杀", "绕后偷袭", "团队配合", "排点侦查", "劝架机会"]
    },
    "PHASE": {
        "战局阶段": ["初期打架", "中期残局", "末期最后一战"]
    }
}

def init_db_tags():
    db = SessionLocal()
    try:
        print("🔄 正在检查并初始化云端战术字典...")
        
        # 遍历插入数据（采用增量或覆盖逻辑）
        for category, parent_dict in INITIAL_TAGS.items():
            for parent_name, children_names in parent_dict.items():
                
                # 检查父标签是否已存在（避免重复多次运行脚本导致报错）
                parent_tag = db.query(models.Tag).filter_by(name=parent_name, category=category).first()
                if not parent_tag:
                    parent_tag = models.Tag(name=parent_name, category=category, color="#4F46E5")
                    db.add(parent_tag)
                    db.commit()
                    db.refresh(parent_tag)
                
                # 遍历子级标签
                for child_name in children_names:
                    existing_child = db.query(models.Tag).filter_by(name=child_name, parent_id=parent_tag.id).first()
                    if not existing_child:
                        child_tag = models.Tag(
                            name=child_name, 
                            category=category, 
                            parent_id=parent_tag.id, 
                            color="#10B981"
                        )
                        db.add(child_tag)
                db.commit()
                
        print("✅ 战术字典初始化注入成功！")
    except Exception as e:
        print(f"❌ 注入失败: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    models.Base.metadata.create_all(bind=engine)
    init_db_tags()