import json
from sqlalchemy.orm import Session
from app.db.models import AuditLog


def log_action(db: Session, action: str, user_id: int = None,
               entity: str = None, entity_id: int = None,
               details: dict = None, ip_address: str = None):
    log = AuditLog(
        user_id=user_id, action=action,
        entity=entity, entity_id=entity_id,
        details=json.dumps(details) if details else None,
        ip_address=ip_address,
    )
    db.add(log)
