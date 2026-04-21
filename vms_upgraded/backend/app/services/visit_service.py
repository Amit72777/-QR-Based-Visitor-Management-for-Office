"""
Visit service — handles all visitor registration and scan logic.

v2 changes:
  - register(): saves visitor photo (base64 → file), sends QR email
  - scan():     uses configurable QR_EXPIRY_HOURS from settings
  - qr_expiry_hours stored on the Visit record for auditing
"""
import os, base64, logging
from sqlalchemy.orm import Session
from sqlalchemy      import func
from fastapi         import HTTPException
from datetime        import datetime, timedelta

from app.db.models   import Visitor, Visit, Branch, User, VisitStatus, VisitPurpose
from app.schemas.schemas  import VisitorRegister
from app.utils.qr    import generate_token, build_qr_image, qr_expiry, validate_qr
from app.utils.audit import log_action
from app.utils.email import send_qr_email
from app.core.config import settings

log = logging.getLogger(__name__)


def _save_photo(photo_data: str, visitor_phone: str) -> str | None:
    """
    Decode a base64 photo string and write it to disk.
    Returns the relative file path (e.g. 'uploads/photos/9876543210.jpg')
    or None if anything goes wrong.
    """
    try:
        # Strip the data URI header if present ("data:image/jpeg;base64,...")
        if "," in photo_data:
            header, raw = photo_data.split(",", 1)
            ext = header.split("/")[1].split(";")[0]  # jpeg, png, webp…
        else:
            raw, ext = photo_data, "jpg"

        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

        # Use phone as filename — sanitise it first
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
    def register(payload: VisitorRegister, db: Session) -> Visit:
        """
        Register a visitor:
          1. Validate the branch exists
          2. Find or create Visitor record (keyed on phone number)
          3. Save photo if provided
          4. Generate QR token + image
          5. Create Visit record
          6. Fire-and-forget: send QR via email
        """
        # Make sure the branch is real and active
        branch = db.query(Branch).filter(
            Branch.id == payload.branch_id,
            Branch.is_active == True,
        ).first()
        if not branch:
            raise HTTPException(
                status_code=404,
                detail=f"Branch with id={payload.branch_id} not found. Check /api/admin/branches."
            )

        # Look up existing visitor by phone, or create new one
        visitor = db.query(Visitor).filter(Visitor.phone == payload.phone).first()
        if not visitor:
            visitor = Visitor(
                full_name=payload.full_name,
                phone=payload.phone,
                email=payload.email,
                company_name=payload.company_name,
            )
            db.add(visitor)
            db.flush()  # gives us visitor.id without committing
        else:
            # Returning visitor — update their name in case it changed
            visitor.full_name = payload.full_name

        # Save photo to disk if the frontend sent one
        if payload.photo_data:
            path = _save_photo(payload.photo_data, payload.phone)
            if path:
                visitor.photo_path = path

        # Build the QR code
        token   = generate_token()
        qr_img  = build_qr_image(token)
        expires = qr_expiry()

        visit = Visit(
            visitor_id=visitor.id,
            branch_id=payload.branch_id,
            host_name=payload.host_name,
            purpose=payload.purpose,
            notes=payload.notes,
            qr_token=token,
            qr_image=qr_img,
            qr_expires=expires,
            qr_expiry_hours=settings.QR_EXPIRY_HOURS,
            status=VisitStatus.registered,
        )
        db.add(visit)
        db.flush()

        log_action(db, "visitor_registered", entity="visit", entity_id=visit.id,
                   details={"name": visitor.full_name, "branch_id": payload.branch_id})
        db.commit()
        db.refresh(visit)
        db.refresh(visitor)
        visit.visitor  # trigger lazy load before returning

        # Send QR via email (non-blocking — failure won't break registration)
        if visitor.email:
            expires_str = expires.strftime("%b %d, %Y at %I:%M %p UTC")
            send_qr_email(
                to_email=visitor.email,
                visitor_name=visitor.full_name,
                qr_image_b64=qr_img,
                host_name=payload.host_name,
                qr_expires_str=expires_str,
            )

        return visit

    @staticmethod
    def scan(qr_token: str, guard_id: int, db: Session):
        """
        Smart scan — first scan checks IN, second scan checks OUT.
        Guards use the same button for both actions.
        """
        visit = db.query(Visit).filter(Visit.qr_token == qr_token).first()
        if not visit:
            raise HTTPException(status_code=404, detail="Invalid QR code — no matching visit found.")

        visitor = visit.visitor

        # ── Check-out path ────────────────────────────────────────
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

        # ── Check-in path — validate QR first ─────────────────────
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

        # Small helper to optionally filter by branch
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

        # Build the "currently inside" list
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

        # Recent 15 check-in events
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

        # Purpose breakdown for today
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
            "period_days": days,
            "daily_counts": daily,
            "top_hosts": top_hosts,
            "total_visits": total,
        }
