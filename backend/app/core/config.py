from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "emotion_analyzer"
    SECRET_KEY: str = "your-secret-key"
    DATASET_PATH_RAVDESS: str = "G:/My Drive/EmotionAI_Project/dataset/Actor_01/"
    DATASET_PATH_FER2013: str = "G:/My Drive/EmotionAI_Project/fer2013"
    DATASET_PATH_GOEMOTIONS: str = "G:/My Drive/EmotionAI_Project/goemotions_1.csv"
    MODEL_PATH: str = "models"
    UPLOAD_DIR: str = "uploads"
    
    class Config:
        env_file = ".env"

settings = Settings()
