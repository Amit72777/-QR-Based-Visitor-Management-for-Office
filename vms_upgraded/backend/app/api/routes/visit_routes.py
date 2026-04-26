"""
visit_routes.py
───────────────
Scan / Check-in / Check-out endpoints.

Routes:
  POST /visits/scan/{qr_token}   — guard scans QR (check-in or check-out)
  GET  /visits                   — list visits (admin/guard)
  GET  /visits/{id}              — single visit detail
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session        import get_db
from app.db.models         import User, Visit
from app.schemas.schemas   import VisitOut
from app.services.visit_service import VisitService
from app.core.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/visits", tags=["Visit Scan"])


# ── Scan endpoint ─────────────────────────────────────────────────────────────
@router.post("/scan/{qr_token}")
def scan_qr(
    qr_token:     str,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(require_roles("guard", "admin", "super_admin")),
):
    """
    Smart scan:
      - 1st scan → Check-In
      - 2nd scan → Check-Out
    Guard must be logged in.
    """
    return VisitService.scan(qr_token.strip(), current_user.id, db)


# ── List visits ───────────────────────────────────────────────────────────────
@router.get("")
def list_visits(
    branch_id: Optional[int] = Query(None),
    status:    Optional[str] = Query(None),
    skip:      int           = Query(0, ge=0),
    limit:     int           = Query(50, le=200),
    db:        Session       = Depends(get_db),
    _:         User          = Depends(require_roles("guard", "admin", "super_admin")),
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
        "registered_at": v.registered_at.isoformat(),
        "checked_in_at": v.checked_in_at.isoformat() if v.checked_in_at else None,
    } for v in visits]


# ── Single visit ──────────────────────────────────────────────────────────────
@router.get("/{visit_id}", response_model=VisitOut)
def get_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    _:  User    = Depends(require_roles("guard", "admin", "super_admin")),
):
    v = db.query(Visit).filter(Visit.id == visit_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Visit not found.")
    return v