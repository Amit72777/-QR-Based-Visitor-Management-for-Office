from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import decode_token
from app.db import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email: str = payload.get("sub")
    user = db.query(models.User).filter(
        models.User.email == email,
        models.User.is_active == True,
    ).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or deactivated.")
    return user


def require_roles(*roles: str):
    """Usage: Depends(require_roles("admin", "super_admin"))"""
    def checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role.value not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Allowed roles: {list(roles)}",
            )
        return current_user
    return checker
