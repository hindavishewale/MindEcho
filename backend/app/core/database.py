from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

class Database:
    client: AsyncIOMotorClient = None
    
db = Database()

async def connect_db():
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    
async def close_db():
    db.client.close()
    
def get_database():
    return db.client[settings.DATABASE_NAME]
