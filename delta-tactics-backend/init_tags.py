from sqlalchemy.orm import Session
from database import engine, SessionLocal
import models

# 你的战术字典数据结构
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
        # 清空旧标签（防止重复执行）
        db.query(models.Tag).delete()
        
        # 遍历插入数据
        for category, parent_dict in INITIAL_TAGS.items():
            for parent_name, children_names in parent_dict.items():
                # 1. 创建父级标签 (大地图/大分类)
                parent_tag = models.Tag(name=parent_name, category=category, color="#4F46E5")
                db.add(parent_tag)
                db.commit()
                db.refresh(parent_tag)
                
                # 2. 创建子级标签 (具体区域/具体操作)
                for child_name in children_names:
                    child_tag = models.Tag(
                        name=child_name, 
                        category=category, 
                        parent_id=parent_tag.id, # 绑定父级 ID
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
    # 确保表已经创建
    models.Base.metadata.create_all(bind=engine)
    init_db_tags()