"""
Database models.

Changes from v1:
  - Visitor: added photo_path field (stores uploaded or captured photo)
  - Visit:   qr_expiry_hours stored on the record itself (for audit purposes)
"""
import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean,
    DateTime, ForeignKey, Enum as SAEnum,
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    guard       = "guard"        # Scan only
    admin       = "admin"        # Dashboard + visitors
    super_admin = "super_admin"  # Full access


class VisitPurpose(str, enum.Enum):
    meeting     = "meeting"
    delivery    = "delivery"
    interview   = "interview"
    maintenance = "maintenance"
    other       = "other"


class VisitStatus(str, enum.Enum):
    registered  = "registered"   # QR generated, not arrived yet
    checked_in  = "checked_in"   # Currently inside
    checked_out = "checked_out"  # Left the building
    expired     = "expired"      # QR expired, never showed up


# ─── Branch ───────────────────────────────────────────────────────────────────

class Branch(Base):
    __tablename__ = "branches"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(100), nullable=False)
    address    = Column(Text,        nullable=True)
    city       = Column(String(60),  nullable=True)
    is_active  = Column(Boolean,     default=True)
    created_at = Column(DateTime,    default=datetime.utcnow)

    users  = relationship("User",  back_populates="branch")
    visits = relationship("Visit", back_populates="branch")


# ─── User ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    full_name       = Column(String(100), nullable=False)
    email           = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    phone           = Column(String(20),  nullable=True)
    department      = Column(String(80),  nullable=True)
    role            = Column(SAEnum(UserRole), default=UserRole.guard, nullable=False)
    branch_id       = Column(Integer, ForeignKey("branches.id"), nullable=True)
    is_active       = Column(Boolean,  default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    last_login      = Column(DateTime, nullable=True)

    branch         = relationship("Branch", back_populates="users")
    scanned_visits = relationship(
        "Visit", back_populates="scanned_by_user",
        foreign_keys="Visit.scanned_by"
    )


# ─── Visitor ──────────────────────────────────────────────────────────────────

class Visitor(Base):
    __tablename__ = "visitors"

    id           = Column(Integer, primary_key=True, index=True)
    full_name    = Column(String(100), nullable=False)
    phone        = Column(String(20),  nullable=False)
    email        = Column(String(150), nullable=True)
    company_name = Column(String(100), nullable=True)
    # NEW: path to uploaded/captured photo (relative to UPLOAD_DIR)
    photo_path   = Column(String(300), nullable=True)
    created_at   = Column(DateTime,    default=datetime.utcnow)

    visits = relationship("Visit", back_populates="visitor")


# ─── Visit ────────────────────────────────────────────────────────────────────

class Visit(Base):
    __tablename__ = "visits"

    id         = Column(Integer, primary_key=True, index=True)
    visitor_id = Column(Integer, ForeignKey("visitors.id"), nullable=False)
    branch_id  = Column(Integer, ForeignKey("branches.id"), nullable=False)
    scanned_by = Column(Integer, ForeignKey("users.id"),    nullable=True)

    # Visit details
    host_name = Column(String(100), nullable=True)
    purpose   = Column(SAEnum(VisitPurpose), default=VisitPurpose.meeting)
    notes     = Column(Text, nullable=True)

    # QR
    qr_token        = Column(String(36), unique=True, nullable=False, index=True)
    qr_image        = Column(Text,       nullable=True)   # base64 PNG data URI
    qr_expires      = Column(DateTime,   nullable=False)
    # Store the expiry hours used — makes auditing easier
    qr_expiry_hours = Column(Integer,    nullable=True)

    # Status & timing
    status         = Column(SAEnum(VisitStatus), default=VisitStatus.registered)
    checked_in_at  = Column(DateTime, nullable=True)
    checked_out_at = Column(DateTime, nullable=True)
    duration_mins  = Column(Integer,  nullable=True)
    registered_at  = Column(DateTime, default=datetime.utcnow)

    visitor         = relationship("Visitor", back_populates="visits")
    branch          = relationship("Branch",  back_populates="visits")
    scanned_by_user = relationship(
        "User", back_populates="scanned_visits",
        foreign_keys=[scanned_by]
    )


# ─── AuditLog ─────────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=True)
    action     = Column(String(100), nullable=False)
    entity     = Column(String(60),  nullable=True)
    entity_id  = Column(Integer,     nullable=True)
    details    = Column(Text,        nullable=True)
    ip_address = Column(String(50),  nullable=True)
    created_at = Column(DateTime,    default=datetime.utcnow)


# ─── PasswordResetToken ───────────────────────────────────────────────────────

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    token      = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used       = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")