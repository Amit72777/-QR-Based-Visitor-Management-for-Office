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


# ─── Audit Log Search (new) ───────────────────────────────────────────────────

@router.get("/audit-logs/search")
def search_audit_logs(
    # by user
    user_id:    Optional[int] = Query(None, description="Filter by user ID"),
    # by action / entity
    action:     Optional[str] = Query(None, description="Partial match on action (e.g. 'login', 'create')"),
    entity:     Optional[str] = Query(None, description="Entity type (e.g. 'visit', 'visitor', 'user')"),
    entity_id:  Optional[int] = Query(None, description="Specific entity ID"),
    # by date
    date:       Optional[str] = Query(None, description="Exact date YYYY-MM-DD"),
    date_from:  Optional[str] = Query(None, description="Range start YYYY-MM-DD"),
    date_to:    Optional[str] = Query(None, description="Range end YYYY-MM-DD"),
    last_n_days: Optional[int]= Query(None, description="Last N days shortcut"),
    # by time
    time_from:  Optional[str] = Query(None, description="Time from HH:MM"),
    time_to:    Optional[str] = Query(None, description="Time to HH:MM"),
    # by ip
    ip_address: Optional[str] = Query(None, description="IP address partial match"),
    # pagination & sort
    skip:       int           = Query(0,   ge=0),
    limit:      int           = Query(50,  le=500),
    sort_order: str           = Query("desc", description="asc | desc"),
    db:         Session       = Depends(get_db),
    _:          User          = Depends(require_roles("super_admin")),
):
    """
    Advanced search on audit logs.
    All filters are optional and combinable.
    """
    from datetime import datetime, timedelta
    from sqlalchemy import and_, func

    q = db.query(AuditLog)

    if user_id:
        q = q.filter(AuditLog.user_id == user_id)

    if action:
        q = q.filter(AuditLog.action.ilike(f"%{action.strip()}%"))

    if entity:
        q = q.filter(AuditLog.entity.ilike(f"%{entity.strip()}%"))

    if entity_id:
        q = q.filter(AuditLog.entity_id == entity_id)

    if ip_address:
        q = q.filter(AuditLog.ip_address.ilike(f"%{ip_address.strip()}%"))

    # date filters
    try:
        if last_n_days:
            cutoff = datetime.utcnow() - timedelta(days=last_n_days)
            q = q.filter(AuditLog.created_at >= cutoff)
        elif date:
            day = datetime.strptime(date, "%Y-%m-%d")
            q = q.filter(
                and_(
                    AuditLog.created_at >= day.replace(hour=0,  minute=0,  second=0),
                    AuditLog.created_at <= day.replace(hour=23, minute=59, second=59),
                )
            )
        else:
            if date_from:
                q = q.filter(AuditLog.created_at >= datetime.strptime(date_from, "%Y-%m-%d"))
            if date_to:
                dt = datetime.strptime(date_to, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
                q = q.filter(AuditLog.created_at <= dt)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD")

    # time filters
    try:
        if time_from:
            q = q.filter(func.strftime("%H:%M", AuditLog.created_at) >= time_from)
        if time_to:
            q = q.filter(func.strftime("%H:%M", AuditLog.created_at) <= time_to)
    except Exception:
        pass

    total = q.count()

    if sort_order == "asc":
        q = q.order_by(AuditLog.created_at.asc())
    else:
        q = q.order_by(AuditLog.created_at.desc())

    logs = q.offset(skip).limit(limit).all()

    return {
        "total": total,
        "skip":  skip,
        "limit": limit,
        "results": [{
            "id":         l.id,
            "user_id":    l.user_id,
            "action":     l.action,
            "entity":     l.entity,
            "entity_id":  l.entity_id,
            "details":    l.details,
            "ip_address": l.ip_address,
            "created_at": l.created_at.isoformat(),
        } for l in logs],
    }