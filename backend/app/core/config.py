from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DB_PATH: str = "mindecho.db"
    SECRET_KEY: str = "your-secret-key-change-in-production-min-32-chars"
    MODEL_PATH: str = "models"
    UPLOAD_DIR: str = "uploads"

    class Config:
        env_file = ".env"

settings = Settings()
