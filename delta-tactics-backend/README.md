Delta Tactics Backend

快速上手（Windows）

1. 在项目根目录打开 PowerShell：
   cd \path\to\delta-tactics-backend

2. 创建并激活虚拟环境（Windows）：
   python -m venv venv
   .\venv\Scripts\activate

3. 安装依赖：
   pip install -r requirements.txt

4. 启动开发服务器（热重载）：
   uvicorn main:app --reload

5. 打开浏览器：
   http://127.0.0.1:8000/  （欢迎页面）
   http://127.0.0.1:8000/docs  （FastAPI 自动生成的 API 文档界面）

说明
- 当前使用 SQLite（通过 SQLAlchemy），数据库文件会在项目目录下生成：delta_notes.db
- 将来部署到云端时，只需把 database.py 中的 SQLALCHEMY_DATABASE_URL 换成 PostgreSQL 的连接串即可（ORM 代码无需改动）。
