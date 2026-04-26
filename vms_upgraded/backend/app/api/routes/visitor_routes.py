"""
visitor_routes.py
─────────────────
Visitor registration endpoint.

New feature: qr_validity_type field
  - "one_time"  → QR expires after check-out (single use)
  - "hourly"    → custom hours (uses qr_hours field)
  - "daily"     → 1 day (24h)
  - "weekly"    → 7 days
  - "monthly"   → 30 days
  Only admin / super_admin can set non-default validity.
  Regular visitors get default from .env (QR_EXPIRY_HOURS).
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session        import get_db
from app.db.models         import User, Visit, Visitor
from app.schemas.schemas   import VisitorRegister, VisitOut
from app.services.visit_service import VisitService
from app.core.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/visitors", tags=["Visitor Registration"])


@router.post("/register", status_code=201)
def register_visitor(
    payload: VisitorRegister,
    db:      Session = Depends(get_db),
):
    """
    PUBLIC endpoint — no login needed.
    Returns QR code + email status.

    qr_validity_type options (admin sets this):
      one_time | hourly | daily | weekly | monthly
    qr_hours: only used when qr_validity_type = "hourly"
    """
    result = VisitService.register(payload, db)
    visit  = result["visit"]

    return {
        "id":              visit.id,
        "visitor_id":      visit.visitor_id,
        "branch_id":       visit.branch_id,
        "host_name":       visit.host_name,
        "purpose":         visit.purpose.value,
        "qr_token":        visit.qr_token,
        "qr_image":        visit.qr_image,
        "qr_expires":      visit.qr_expires.isoformat(),
        "qr_expiry_hours": visit.qr_expiry_hours,
        "qr_validity_type": getattr(visit, "qr_validity_type", "hourly"),
        "status":          visit.status.value,
        "checked_in_at":   None,
        "checked_out_at":  None,
        "duration_mins":   None,
        "registered_at":   visit.registered_at.isoformat(),
        "visitor": {
            "id":           visit.visitor.id,
            "full_name":    visit.visitor.full_name,
            "phone":        visit.visitor.phone,
            "email":        visit.visitor.email,
            "company_name": visit.visitor.company_name,
            "photo_path":   visit.visitor.photo_path,
        } if visit.visitor else None,
        "email_sent":    result["email_sent"],
        "email_address": result["email_address"],
    }


@router.get("")
def list_visitors(
    skip:  int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db:    Session = Depends(get_db),
    _:     User    = Depends(require_roles("guard", "admin", "super_admin")),
):
    visitors = db.query(Visitor).offset(skip).limit(limit).all()
    return [{
        "id":           v.id,
        "full_name":    v.full_name,
        "phone":        v.phone,
        "email":        v.email,
        "company_name": v.company_name,
        "photo_path":   v.photo_path,
        "created_at":   v.created_at.isoformat(),
    } for v in visitors]


@router.get("/{visitor_id}")
def get_visitor(
    visitor_id: int,
    db: Session = Depends(get_db),
    _:  User    = Depends(require_roles("guard", "admin", "super_admin")),
):
    v = db.query(Visitor).filter(Visitor.id == visitor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Visitor not found.")
    return {
        "id":           v.id,
        "full_name":    v.full_name,
        "phone":        v.phone,
        "email":        v.email,
        "company_name": v.company_name,
        "photo_path":   v.photo_path,
        "created_at":   v.created_at.isoformat(),
    }