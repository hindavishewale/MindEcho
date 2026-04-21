from pydantic import BaseModel, Field, EmailStr
from typing import List, Dict, Optional
from datetime import datetime

class EmotionSegment(BaseModel):
    timestamp: float
    face_emotion: Optional[Dict] = None
    voice_emotion: Optional[Dict] = None
    text_emotion: Optional[Dict] = None
    fused_emotion: Optional[Dict] = None
    transcription: Optional[str] = None

class VideoAnalysis(BaseModel):
    session_id: str
    video_path: str
    analysis_type: str
    segments: List[EmotionSegment]
    overall_emotion: Dict
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserSession(BaseModel):
    session_id: str
    user_id: Optional[str] = None
    session_type: str
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    status: str = "active"

class User(BaseModel):
    user_id: str
    email: EmailStr
    full_name: str
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict
