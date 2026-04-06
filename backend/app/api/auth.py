from fastapi import APIRouter, HTTPException, status, Depends
from app.models.schemas import UserRegister, UserLogin, Token, User
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.database import get_database
from app.core.deps import get_current_user
import uuid

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=Token)
async def register(user_data: UserRegister):
    db = get_database()
    
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    user = User(
        user_id=str(uuid.uuid4()),
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password)
    )
    
    await db.users.insert_one(user.model_dump(by_alias=True, exclude={'id'}))
    
    access_token = create_access_token(data={"sub": user.user_id})
    
    return Token(
        access_token=access_token,
        user={"user_id": user.user_id, "email": user.email, "full_name": user.full_name}
    )

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    db = get_database()
    
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    
    access_token = create_access_token(data={"sub": user["user_id"]})
    
    return Token(
        access_token=access_token,
        user={"user_id": user["user_id"], "email": user["email"], "full_name": user["full_name"]}
    )

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "user_id": current_user["user_id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"]
    }
