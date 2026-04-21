from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime
from app.db.models import User, Branch
from app.schemas.schemas import UserCreate, ChangePassword
from app.core.security import hash_password, verify_password
from app.utils.audit import log_action


class UserService:

    @staticmethod
    def create(payload: UserCreate, db: Session, created_by_id: int = None) -> User:
        if db.query(User).filter(User.email == payload.email).first():
            raise HTTPException(status_code=400, detail="Email already registered.")
        if payload.branch_id:
            if not db.query(Branch).filter(Branch.id == payload.branch_id).first():
                raise HTTPException(status_code=404, detail="Branch not found.")
        user = User(
            full_name=payload.full_name,
            email=payload.email,
            hashed_password=hash_password(payload.password),
            phone=payload.phone,
            department=payload.department,
            role=payload.role,
            branch_id=payload.branch_id,
        )
        db.add(user)
        db.flush()
        log_action(db, "user_created", user_id=created_by_id,
                   entity="user", entity_id=user.id,
                   details={"email": user.email, "role": user.role.value})
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def get_all(db: Session, skip=0, limit=100):
        return db.query(User).order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_by_id(user_id: int, db: Session) -> User:
        u = db.query(User).filter(User.id == user_id).first()
        if not u:
            raise HTTPException(status_code=404, detail="User not found.")
        return u

    @staticmethod
    def change_password(user: User, payload: ChangePassword, db: Session):
        if not verify_password(payload.current_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")
        user.hashed_password = hash_password(payload.new_password)
        db.commit()
        return {"message": "Password changed successfully."}

    @staticmethod
    def deactivate(user_id: int, db: Session, by_id: int = None):
        user = UserService.get_by_id(user_id, db)
        user.is_active = False
        log_action(db, "user_deactivated", user_id=by_id, entity="user", entity_id=user_id)
        db.commit()
        return {"message": f"User '{user.full_name}' deactivated."}
