from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.db.models import User, Visit
from app.services.visit_service import VisitService
from app.core.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/visits", tags=["Check-In / Check-Out"])


@router.post("/scan/{qr_token}")
def scan_qr(
    qr_token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("guard", "admin", "super_admin")),
):
    """
    Smart scan endpoint:
    - First scan  → CHECK IN
    - Second scan → CHECK OUT
    Security guard uses this for both operations.
    """
    return VisitService.scan(qr_token, current_user.id, db)


@router.get("")
def list_all_visits(
    branch_id:   Optional[int] = Query(None),
    status:      Optional[str] = Query(None),
    skip:        int           = Query(0, ge=0),
    limit:       int           = Query(50, le=200),
    db:          Session       = Depends(get_db),
    _:           User          = Depends(require_roles("admin", "super_admin")),
):
    visits = VisitService.get_list(db, branch_id=branch_id, status=status,
                                   skip=skip, limit=limit)
    return [{
        "visit_id":      v.id,
        "visitor_name":  v.visitor.full_name,
        "visitor_phone": v.visitor.phone,
        "company":       v.visitor.company_name,
        "purpose":       v.purpose.value,
        "host_name":     v.host_name,
        "status":        v.status.value,
        "checked_in_at": v.checked_in_at.isoformat() if v.checked_in_at else None,
        "checked_out_at": v.checked_out_at.isoformat() if v.checked_out_at else None,
        "duration_mins": v.duration_mins,
    } for v in visits]
