"""
Visit service — visitor registration + QR scan logic.

v2.1 change:
  - register() ab Visit ke saath email_sent flag bhi return karta hai
    taaki frontend ko pata chale email gaya ya nahi.
"""
import os, base64, logging
from sqlalchemy.orm import Session
from sqlalchemy      import func
from fastapi         import HTTPException
from datetime        import datetime, timedelta

from app.db.models        import Visitor, Visit, Branch, User, VisitStatus, VisitPurpose
from app.schemas.schemas  import VisitorRegister
from app.utils.qr         import generate_token, build_qr_image, qr_expiry, validate_qr
from app.utils.audit      import log_action
from app.utils.email      import send_qr_email
from app.core.config      import settings

log = logging.getLogger(__name__)


def _save_photo(photo_data: str, visitor_phone: str) -> str | None:
    """Base64 photo decode karke disk pe save karo."""
    try:
        if "," in photo_data:
            header, raw = photo_data.split(",", 1)
            ext = header.split("/")[1].split(";")[0]
        else:
            raw, ext = photo_data, "jpg"

        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        safe_phone = "".join(c for c in visitor_phone if c.isalnum())
        filename   = f"{safe_phone}_{int(datetime.utcnow().timestamp())}.{ext}"
        filepath   = os.path.join(settings.UPLOAD_DIR, filename)

        with open(filepath, "wb") as f:
            f.write(base64.b64decode(raw))
        return filepath
    except Exception as exc:
        log.warning("Could not save visitor photo: %s", exc)
        return None


class VisitService:

    @staticmethod
    def register(payload: VisitorRegister, db: Session) -> dict:
        """
        Visitor register karo aur ek dict return karo jisme:
          - visit: Visit object (QR data ke saath)
          - email_sent: True/False (frontend pop-up ke liye)
          - email_address: visitor ka email (pop-up mein dikhane ke liye)
        """
        # Branch check
        branch = db.query(Branch).filter(
            Branch.id == payload.branch_id,
            Branch.is_active == True,
        ).first()
        if not branch:
            raise HTTPException(
                status_code=404,
                detail=f"Branch id={payload.branch_id} nahi mili. /api/admin/branches check karo."
            )

        # Visitor dhundo ya naya banao
        visitor = db.query(Visitor).filter(Visitor.phone == payload.phone).first()
        if not visitor:
            visitor = Visitor(
                full_name=payload.full_name,
                phone=payload.phone,
                email=payload.email,
                company_name=payload.company_name,
            )
            db.add(visitor)
            db.flush()
        else:
            visitor.full_name = payload.full_name
            # Agar email update hua toh save karo
            if payload.email:
                visitor.email = payload.email

        # Photo save karo agar tha
        if payload.photo_data:
            path = _save_photo(payload.photo_data, payload.phone)
            if path:
                visitor.photo_path = path

        # ── QR validity calculate karo ──────────────────────────────────────
        from app.schemas.schemas import QR_VALIDITY_HOURS
        from datetime import timedelta

        validity_type = getattr(payload, "qr_validity_type", None) or "hourly"
        qr_hours_custom = getattr(payload, "qr_hours", None)

        if validity_type == "one_time":
            # one_time = 100 years expiry (expires logically after checkout)
            expiry_hours = settings.QR_EXPIRY_HOURS  # use default, handle in scan
            is_one_time  = True
        elif validity_type == "hourly":
            expiry_hours = qr_hours_custom if qr_hours_custom else settings.QR_EXPIRY_HOURS
            is_one_time  = False
        else:
            expiry_hours = QR_VALIDITY_HOURS.get(validity_type) or settings.QR_EXPIRY_HOURS
            is_one_time  = False

        token   = generate_token()
        qr_img  = build_qr_image(token)
        expires = datetime.utcnow() + timedelta(hours=expiry_hours)

        visit = Visit(
            visitor_id=visitor.id,
            branch_id=payload.branch_id,
            host_name=payload.host_name,
            purpose=payload.purpose,
            notes=payload.notes,
            qr_token=token,
            qr_image=qr_img,
            qr_expires=expires,
            qr_expiry_hours=expiry_hours,
            status=VisitStatus.registered,
        )
        db.add(visit)
        db.flush()

        log_action(db, "visitor_registered", entity="visit", entity_id=visit.id,
                   details={"name": visitor.full_name, "branch_id": payload.branch_id})
        db.commit()
        db.refresh(visit)
        db.refresh(visitor)
        visit.visitor  # lazy load

        # Email bhejo aur result note karo
        email_sent    = False
        email_address = visitor.email or ""

        if visitor.email:
            expires_str = expires.strftime("%b %d, %Y at %I:%M %p UTC")
            email_sent  = send_qr_email(
                to_email=visitor.email,
                visitor_name=visitor.full_name,
                qr_image_b64=qr_img,
                host_name=payload.host_name,
                qr_expires_str=expires_str,
            )

        # Visit object ke saath email status bhi return karo
        return {
            "visit":         visit,
            "email_sent":    email_sent,
            "email_address": email_address,
        }

    @staticmethod
    def scan(qr_token: str, guard_id: int, db: Session):
        """Smart scan — pehla scan check-in, doosra check-out."""
        visit = db.query(Visit).filter(Visit.qr_token == qr_token).first()
        if not visit:
            raise HTTPException(status_code=404, detail="Invalid QR code — koi visit nahi mila.")

        visitor = visit.visitor

        # Check-out path
        if visit.status == VisitStatus.checked_in:
            now      = datetime.utcnow()
            duration = max(1, int((now - visit.checked_in_at).total_seconds() / 60))

            visit.checked_out_at = now
            visit.duration_mins  = duration
            visit.status         = VisitStatus.checked_out
            visit.scanned_by     = guard_id

            log_action(db, "visitor_checkout", user_id=guard_id, entity="visit",
                       entity_id=visit.id,
                       details={"visitor": visitor.full_name, "duration_mins": duration})
            db.commit()
            return {
                "message":       f"{visitor.full_name} checked out successfully.",
                "visit_id":      visit.id,
                "visitor_name":  visitor.full_name,
                "visitor_phone": visitor.phone,
                "host_name":     visit.host_name,
                "purpose":       visit.purpose.value,
                "action":        "checked_out",
                "timestamp":     visit.checked_out_at,
                "duration_mins": duration,
            }

        # Check-in path
        valid, reason = validate_qr(visit.status.value, visit.qr_expires)
        if not valid:
            raise HTTPException(status_code=400, detail=reason)

        now = datetime.utcnow()
        visit.status        = VisitStatus.checked_in
        visit.checked_in_at = now
        visit.scanned_by    = guard_id

        log_action(db, "visitor_checkin", user_id=guard_id, entity="visit",
                   entity_id=visit.id, details={"visitor": visitor.full_name})
        db.commit()
        return {
            "message":       f"{visitor.full_name} checked in successfully.",
            "visit_id":      visit.id,
            "visitor_name":  visitor.full_name,
            "visitor_phone": visitor.phone,
            "host_name":     visit.host_name,
            "purpose":       visit.purpose.value,
            "action":        "checked_in",
            "timestamp":     visit.checked_in_at,
            "duration_mins": None,
        }

    @staticmethod
    def get_list(db: Session, branch_id: int = None, status: str = None,
                 skip: int = 0, limit: int = 50):
        q = db.query(Visit)
        if branch_id:
            q = q.filter(Visit.branch_id == branch_id)
        if status:
            q = q.filter(Visit.status == status)
        return q.order_by(Visit.registered_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_dashboard(db: Session, branch_id: int = None) -> dict:
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        week_start  = today_start - timedelta(days=today_start.weekday())

        def bq(q):
            return q.filter(Visit.branch_id == branch_id) if branch_id else q

        currently_inside = bq(
            db.query(Visit).filter(Visit.status == VisitStatus.checked_in)
        ).count()

        total_today = bq(
            db.query(Visit).filter(Visit.checked_in_at >= today_start)
        ).count()

        total_week = bq(
            db.query(Visit).filter(Visit.checked_in_at >= week_start)
        ).count()

        avg_q = db.query(func.avg(Visit.duration_mins)).filter(
            Visit.duration_mins != None,
            Visit.checked_in_at >= today_start,
        )
        if branch_id:
            avg_q = avg_q.filter(Visit.branch_id == branch_id)
        avg_duration = round(float(avg_q.scalar() or 0), 1)

        inside_q = db.query(Visit).filter(Visit.status == VisitStatus.checked_in)
        if branch_id:
            inside_q = inside_q.filter(Visit.branch_id == branch_id)
        inside_visits = inside_q.order_by(Visit.checked_in_at.asc()).all()

        inside_list = []
        for v in inside_visits:
            mins_inside = int((datetime.utcnow() - v.checked_in_at).total_seconds() / 60)
            inside_list.append({
                "visit_id":       v.id,
                "visitor_name":   v.visitor.full_name,
                "visitor_phone":  v.visitor.phone,
                "company":        v.visitor.company_name,
                "purpose":        v.purpose.value,
                "host_name":      v.host_name,
                "checked_in_at":  v.checked_in_at.isoformat(),
                "minutes_inside": mins_inside,
                "photo_path":     v.visitor.photo_path,
            })

        recent_q = db.query(Visit).filter(Visit.checked_in_at != None)
        if branch_id:
            recent_q = recent_q.filter(Visit.branch_id == branch_id)
        recent = recent_q.order_by(Visit.checked_in_at.desc()).limit(15).all()

        recent_list = [{
            "visit_id":       v.id,
            "visitor_name":   v.visitor.full_name,
            "visitor_phone":  v.visitor.phone,
            "company":        v.visitor.company_name,
            "purpose":        v.purpose.value,
            "host_name":      v.host_name,
            "checked_in_at":  v.checked_in_at.isoformat() if v.checked_in_at else None,
            "checked_out_at": v.checked_out_at.isoformat() if v.checked_out_at else None,
            "duration_mins":  v.duration_mins,
            "status":         v.status.value,
        } for v in recent]

        pb_q = db.query(Visit.purpose, func.count(Visit.id)).filter(
            Visit.checked_in_at >= today_start
        )
        if branch_id:
            pb_q = pb_q.filter(Visit.branch_id == branch_id)
        purpose_breakdown = {
            row[0].value: row[1]
            for row in pb_q.group_by(Visit.purpose).all()
        }

        return {
            "currently_inside":      currently_inside,
            "total_today":           total_today,
            "total_this_week":       total_week,
            "avg_duration_mins":     avg_duration,
            "purpose_breakdown":     purpose_breakdown,
            "currently_inside_list": inside_list,
            "recent_activity":       recent_list,
            "generated_at":          datetime.utcnow().isoformat(),
        }

    @staticmethod
    def get_report(db: Session, branch_id: int = None, days: int = 30) -> dict:
        since = datetime.utcnow() - timedelta(days=days)

        q = db.query(
            func.date(Visit.checked_in_at).label("date"),
            func.count(Visit.id).label("count"),
        ).filter(Visit.checked_in_at >= since)
        if branch_id:
            q = q.filter(Visit.branch_id == branch_id)
        rows  = q.group_by(func.date(Visit.checked_in_at)).order_by("date").all()
        daily = [{"date": str(r.date), "count": r.count} for r in rows]

        total_q = db.query(func.count(Visit.id)).filter(Visit.checked_in_at >= since)
        if branch_id:
            total_q = total_q.filter(Visit.branch_id == branch_id)
        total = total_q.scalar() or 0

        host_q = db.query(
            Visit.host_name, func.count(Visit.id).label("visits")
        ).filter(Visit.checked_in_at >= since, Visit.host_name != None)
        if branch_id:
            host_q = host_q.filter(Visit.branch_id == branch_id)
        top_hosts = [
            {"host_name": r[0], "visits": r[1]}
            for r in host_q.group_by(Visit.host_name)
                           .order_by(func.count(Visit.id).desc()).limit(5).all()
        ]

        return {
            "period_days":  days,
            "daily_counts": daily,
            "top_hosts":    top_hosts,
            "total_visits": total,
        }