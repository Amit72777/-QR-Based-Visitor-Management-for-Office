from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.db.models import User, Branch, AuditLog
from app.schemas.schemas import UserCreate, UserOut, BranchCreate, BranchOut
from app.services.user_service import UserService
from app.core.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Users ────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserOut])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("super_admin")),
):
    return UserService.get_all(db, skip=skip, limit=limit)


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin")),
):
    return UserService.create(payload, db, created_by_id=current_user.id)


@router.delete("/users/{user_id}")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin")),
):
    return UserService.deactivate(user_id, db, by_id=current_user.id)


# ─── Branches ─────────────────────────────────────────────────────────────────

@router.get("/branches", response_model=list[BranchOut])
def list_branches(db: Session = Depends(get_db)):
    return db.query(Branch).filter(Branch.is_active == True).order_by(Branch.name).all()


@router.post("/branches", response_model=BranchOut, status_code=201)
def create_branch(
    payload: BranchCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("super_admin")),
):
    branch = Branch(name=payload.name, city=payload.city, address=payload.address)
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch


# ─── Dashboard ────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def dashboard(
    branch_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin", "super_admin")),
):
    from app.services.visit_service import VisitService
    return VisitService.get_dashboard(db, branch_id=branch_id)


@router.get("/report")
def report(
    branch_id: Optional[int] = Query(None),
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin", "super_admin")),
):
    from app.services.visit_service import VisitService
    return VisitService.get_report(db, branch_id=branch_id, days=days)


@router.get("/audit-logs")
def audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("super_admin")),
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return [{
        "id": l.id, "user_id": l.user_id, "action": l.action,
        "entity": l.entity, "entity_id": l.entity_id,
        "details": l.details, "ip_address": l.ip_address,
        "created_at": l.created_at.isoformat(),
    } for l in logs]
