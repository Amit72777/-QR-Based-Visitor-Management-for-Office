from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.db.models import User, Visit
from app.schemas.schemas import VisitorRegister, VisitOut
from app.services.visit_service import VisitService
from app.core.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/visitors", tags=["Visitor Registration"])


@router.post("/register", response_model=VisitOut, status_code=201)
def register_visitor(payload: VisitorRegister, db: Session = Depends(get_db)):
    """
    PUBLIC endpoint — no login needed.
    Visitor fills form → gets QR code back.
    """
    return VisitService.register(payload, db)


@router.get("")
def list_visits(
    branch_id:  Optional[int] = Query(None),
    status:     Optional[str] = Query(None),
    skip:       int           = Query(0, ge=0),
    limit:      int           = Query(50, le=200),
    db:         Session       = Depends(get_db),
    _:          User          = Depends(require_roles("guard", "admin", "super_admin")),
):
    visits = VisitService.get_list(db, branch_id=branch_id, status=status,
                                   skip=skip, limit=limit)
    result = []
    for v in visits:
        result.append({
            "visit_id":      v.id,
            "visitor_name":  v.visitor.full_name,
            "visitor_phone": v.visitor.phone,
            "company":       v.visitor.company_name,
            "purpose":       v.purpose.value,
            "host_name":     v.host_name,
            "status":        v.status.value,
            "registered_at": v.registered_at.isoformat(),
            "checked_in_at": v.checked_in_at.isoformat() if v.checked_in_at else None,
        })
    return result


@router.get("/{visit_id}", response_model=VisitOut)
def get_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("guard", "admin", "super_admin")),
):
    v = db.query(Visit).filter(Visit.id == visit_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Visit not found.")
    return v
