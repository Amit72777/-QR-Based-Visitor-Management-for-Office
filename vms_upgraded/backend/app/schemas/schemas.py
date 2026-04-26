"""
schemas.py — Pydantic v2 schemas.
v2.2: VisitorRegister mein qr_validity_type + qr_hours add kiya.
"""
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Literal
from datetime import datetime
from app.db.models import UserRole, VisitPurpose, VisitStatus


# ─── Branch ───────────────────────────────────────────────────────────────────
class BranchCreate(BaseModel):
    name:    str
    city:    Optional[str] = None
    address: Optional[str] = None

class BranchOut(BaseModel):
    id:         int
    name:       str
    city:       Optional[str]
    address:    Optional[str]
    is_active:  bool
    created_at: datetime
    class Config:
        from_attributes = True


# ─── User ─────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    full_name:  str
    email:      EmailStr
    password:   str
    phone:      Optional[str] = None
    department: Optional[str] = None
    role:       UserRole      = UserRole.guard
    branch_id:  Optional[int] = None

class UserOut(BaseModel):
    id:         int
    full_name:  str
    email:      str
    phone:      Optional[str]
    department: Optional[str]
    role:       UserRole
    branch_id:  Optional[int]
    is_active:  bool
    created_at: datetime
    class Config:
        from_attributes = True

class TokenOut(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user_id:      int
    user_name:    str
    user_role:    str
    branch_id:    Optional[int]

class ChangePassword(BaseModel):
    current_password: str
    new_password:     str

class ProfileUpdate(BaseModel):
    full_name:  Optional[str] = None
    phone:      Optional[str] = None
    department: Optional[str] = None


# ─── Visitor ──────────────────────────────────────────────────────────────────

# QR validity options
QR_VALIDITY_OPTIONS = Literal["one_time", "hourly", "daily", "weekly", "monthly"]

QR_VALIDITY_HOURS = {
    "one_time": None,   # expires after checkout — handled in service
    "hourly":   None,   # uses qr_hours field
    "daily":    24,
    "weekly":   168,    # 7 * 24
    "monthly":  720,    # 30 * 24
}

class VisitorRegister(BaseModel):
    full_name:    str
    phone:        str
    email:        Optional[EmailStr] = None
    company_name: Optional[str]      = None
    host_name:    Optional[str]      = None
    purpose:      VisitPurpose       = VisitPurpose.meeting
    branch_id:    int
    notes:        Optional[str]      = None
    photo_data:   Optional[str]      = None

    # ── QR Validity (admin/super_admin sets these) ─────────────────────────
    # Default = None → uses QR_EXPIRY_HOURS from .env
    qr_validity_type: Optional[QR_VALIDITY_OPTIONS] = None
    qr_hours:         Optional[int]                 = None  # used when type=hourly

    @field_validator("qr_hours")
    @classmethod
    def validate_qr_hours(cls, v):
        if v is not None and (v < 1 or v > 8760):  # max 1 year
            raise ValueError("qr_hours must be between 1 and 8760")
        return v

class VisitorOut(BaseModel):
    id:           int
    full_name:    str
    phone:        str
    email:        Optional[str]
    company_name: Optional[str]
    photo_path:   Optional[str]
    class Config:
        from_attributes = True


# ─── Visit ────────────────────────────────────────────────────────────────────
class VisitOut(BaseModel):
    id:               int
    visitor_id:       int
    branch_id:        int
    host_name:        Optional[str]      = None
    purpose:          VisitPurpose
    qr_token:         str
    qr_image:         str
    qr_expires:       datetime
    qr_expiry_hours:  Optional[int]      = None
    status:           VisitStatus
    checked_in_at:    Optional[datetime] = None
    checked_out_at:   Optional[datetime] = None
    duration_mins:    Optional[int]      = None
    registered_at:    datetime
    visitor:          Optional[VisitorOut] = None
    class Config:
        from_attributes = True

class ScanResult(BaseModel):
    message:       str
    visit_id:      int
    visitor_name:  str
    visitor_phone: str
    host_name:     Optional[str]
    purpose:       str
    action:        str
    timestamp:     datetime

class NoteUpdate(BaseModel):
    notes: str


# ─── Dashboard ────────────────────────────────────────────────────────────────
class DashboardStats(BaseModel):
    currently_inside:      int
    total_today:           int
    total_this_week:       int
    avg_duration_mins:     float
    purpose_breakdown:     dict
    currently_inside_list: List[dict]
    recent_activity:       List[dict]
    generated_at:          str

class ReportOut(BaseModel):
    period_days:  int
    daily_counts: List[dict]
    top_hosts:    List[dict]
    total_visits: int

# ─── Password Reset ───────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token:        str
    new_password: str

class MessageResponse(BaseModel):
    message: str