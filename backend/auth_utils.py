import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserRole

SECRET_KEY = os.getenv("SECRET_KEY", "payroll_super_secret_2024_change_me")
ALGORITHM  = "HS256"
TOKEN_EXPIRE_HOURS = 24

pwd_ctx   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2    = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(pw: str) -> str:
    return pwd_ctx.hash(pw)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

def create_token(data: dict, expires: Optional[timedelta] = None) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + (expires or timedelta(hours=TOKEN_EXPIRE_HOURS))
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    exc = HTTPException(status_code=401, detail="Invalid or expired token",
                        headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise exc
    except JWTError:
        raise exc
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise exc
    return user

def require_admin_hr(user: User = Depends(get_current_user)) -> User:
    if user.role not in [UserRole.admin, UserRole.hr]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return user

def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return user
