import aiosqlite
import json
import os

DB_PATH = os.environ.get("DB_PATH", "mindecho.db")

async def connect_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                hashed_password TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                user_id TEXT,
                session_type TEXT,
                status TEXT,
                created_at TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS analyses (
                session_id TEXT PRIMARY KEY,
                video_path TEXT,
                analysis_type TEXT,
                segments TEXT,
                overall_emotion TEXT,
                created_at TEXT
            )
        """)
        await db.commit()

async def close_db():
    pass

def get_database():
    return SQLiteDB()

class SQLiteDB:
    class _Users:
        async def find_one(self, query: dict):
            async with aiosqlite.connect(DB_PATH) as db:
                db.row_factory = aiosqlite.Row
                if "email" in query:
                    cur = await db.execute("SELECT * FROM users WHERE email=?", (query["email"],))
                elif "user_id" in query:
                    cur = await db.execute("SELECT * FROM users WHERE user_id=?", (query["user_id"],))
                else:
                    return None
                row = await cur.fetchone()
                return dict(row) if row else None

        async def insert_one(self, doc: dict):
            async with aiosqlite.connect(DB_PATH) as db:
                await db.execute(
                    "INSERT INTO users (user_id,email,full_name,hashed_password,is_active,created_at) VALUES (?,?,?,?,?,?)",
                    (doc["user_id"], doc["email"], doc["full_name"],
                     doc["hashed_password"], int(doc.get("is_active", True)),
                     str(doc.get("created_at", "")))
                )
                await db.commit()

    class _Sessions:
        async def find_one(self, query: dict):
            async with aiosqlite.connect(DB_PATH) as db:
                db.row_factory = aiosqlite.Row
                cur = await db.execute("SELECT * FROM sessions WHERE session_id=?", (query["session_id"],))
                row = await cur.fetchone()
                return dict(row) if row else None

        async def insert_one(self, doc: dict):
            async with aiosqlite.connect(DB_PATH) as db:
                await db.execute(
                    "INSERT INTO sessions (session_id,user_id,session_type,status,created_at) VALUES (?,?,?,?,?)",
                    (doc["session_id"], doc.get("user_id", ""),
                     doc.get("session_type", ""), doc.get("status", ""),
                     str(doc.get("start_time", "")))
                )
                await db.commit()

        async def update_one(self, query: dict, update: dict):
            set_data = update.get("$set", {})
            async with aiosqlite.connect(DB_PATH) as db:
                for key, val in set_data.items():
                    await db.execute(
                        f"UPDATE sessions SET {key}=? WHERE session_id=?",
                        (val, query["session_id"])
                    )
                await db.commit()

    class _Analyses:
        async def find_one(self, query: dict):
            async with aiosqlite.connect(DB_PATH) as db:
                db.row_factory = aiosqlite.Row
                cur = await db.execute("SELECT * FROM analyses WHERE session_id=?", (query["session_id"],))
                row = await cur.fetchone()
                if not row:
                    return None
                d = dict(row)
                d["segments"] = json.loads(d["segments"]) if d["segments"] else []
                d["overall_emotion"] = json.loads(d["overall_emotion"]) if d["overall_emotion"] else {}
                return d

        async def find(self, query: dict):
            return _AnalysesCursor(query)

        async def insert_one(self, doc: dict):
            segs_list = []
            for s in doc.get("segments", []):
                segs_list.append(s.model_dump() if hasattr(s, "model_dump") else s)
            async with aiosqlite.connect(DB_PATH) as db:
                await db.execute(
                    "INSERT OR REPLACE INTO analyses (session_id,video_path,analysis_type,segments,overall_emotion,created_at) VALUES (?,?,?,?,?,?)",
                    (doc["session_id"], doc.get("video_path", ""),
                     doc.get("analysis_type", ""),
                     json.dumps(segs_list, default=str),
                     json.dumps(doc.get("overall_emotion", {}), default=str),
                     str(doc.get("created_at", "")))
                )
                await db.commit()

    users    = _Users()
    sessions = _Sessions()
    analyses = _Analyses()


class _AnalysesCursor:
    def __init__(self, query):
        self.query = query

    async def to_list(self, length=100):
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            if "session_id" in self.query:
                cur = await db.execute("SELECT * FROM analyses WHERE session_id=?", (self.query["session_id"],))
            else:
                cur = await db.execute("SELECT * FROM analyses LIMIT ?", (length,))
            rows = await cur.fetchall()
            results = []
            for row in rows:
                d = dict(row)
                d["segments"] = json.loads(d["segments"]) if d["segments"] else []
                d["overall_emotion"] = json.loads(d["overall_emotion"]) if d["overall_emotion"] else {}
                results.append(d)
            return results
