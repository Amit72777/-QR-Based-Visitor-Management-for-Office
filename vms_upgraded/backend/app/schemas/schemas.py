"""
Pydantic schemas — request/response shapes for all API endpoints.

v2 additions:
  - ProfileUpdate: for PUT /auth/profile
  - VisitorRegister: now includes optional photo_url (base64 from frontend)
  - VisitOut: exposes qr_expiry_hours
  - BranchOut: now includes created_at
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
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


# NEW: for PUT /auth/profile
class ProfileUpdate(BaseModel):
    full_name:  Optional[str] = None
    phone:      Optional[str] = None
    department: Optional[str] = None


# ─── Visitor ──────────────────────────────────────────────────────────────────

class VisitorRegister(BaseModel):
    full_name:    str
    phone:        str
    email:        Optional[EmailStr] = None
    company_name: Optional[str]      = None
    host_name:    Optional[str]      = None
    purpose:      VisitPurpose       = VisitPurpose.meeting
    branch_id:    int
    notes:        Optional[str]      = None
    # NEW: base64 photo captured/uploaded on frontend (optional)
    photo_data:   Optional[str]      = None  # "data:image/jpeg;base64,..."


class VisitorOut(BaseModel):
    id:           int
    full_name:    str
    phone:        str
    email:        Optional[str]
    company_name: Optional[str]
    photo_path:   Optional[str]  # URL-accessible path if photo exists

    class Config:
        from_attributes = True


# ─── Visit ────────────────────────────────────────────────────────────────────

class VisitOut(BaseModel):
    id:             int
    visitor_id:     int
    branch_id:      int
    host_name:      Optional[str]     = None
    purpose:        VisitPurpose
    qr_token:       str
    qr_image:       str
    qr_expires:     datetime
    qr_expiry_hours: Optional[int]    = None
    status:         VisitStatus
    checked_in_at:  Optional[datetime] = None
    checked_out_at: Optional[datetime] = None
    duration_mins:  Optional[int]      = None
    registered_at:  datetime
    visitor:        Optional[VisitorOut] = None

    class Config:
        from_attributes = True


class ScanResult(BaseModel):
    message:       str
    visit_id:      int
    visitor_name:  str
    visitor_phone: str
    host_name:     Optional[str]
    purpose:       str
    action:        str      # "checked_in" or "checked_out"
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


# ─── Report ───────────────────────────────────────────────────────────────────

class ReportOut(BaseModel):
    period_days:  int
    daily_counts: List[dict]
    top_hosts:    List[dict]
    total_visits: int
