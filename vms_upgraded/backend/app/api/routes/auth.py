"""
Auth routes — login, me, change-password, update-profile.

v2 additions:
  - PUT /auth/profile: update name, phone, department
"""
from fastapi          import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm   import Session
from datetime         import datetime

from app.db.session          import get_db
from app.db.models           import User
from app.schemas.schemas     import TokenOut, ChangePassword, UserOut, ProfileUpdate
from app.core.security       import verify_password, create_access_token
from app.core.dependencies   import get_current_user
from app.utils.audit         import log_action
from fastapi.security         import OAuth2PasswordRequestForm

import secrets
from datetime                        import timedelta
from app.db.models                   import PasswordResetToken
from app.schemas.schemas             import ForgotPasswordRequest, ResetPasswordRequest, MessageResponse
from app.utils.email                 import send_reset_password_email
from app.core.config                 import settings
from app.core.security               import hash_password

import logging
log = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenOut)
def login(
    request:   Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db:        Session = Depends(get_db),
):
    """Login with email + password. Returns a JWT access token."""
    user = db.query(User).filter(
        User.email     == form_data.username,
        User.is_active == True,
    ).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    user.last_login = datetime.utcnow()
    log_action(db, "user_login", user_id=user.id,
               ip_address=request.client.host if request.client else None)
    db.commit()

    token = create_access_token({"sub": user.email})
    return TokenOut(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        user_name=user.full_name,
        user_role=user.role.value,
        branch_id=user.branch_id,
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently logged-in user's profile."""
    return current_user


@router.put("/profile", response_model=UserOut)
def update_profile(
    payload:      ProfileUpdate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """
    Update the logged-in user's own profile.
    Only name, phone, and department can be changed here.
    Role and branch changes require a super_admin.
    """
    if payload.full_name  is not None: current_user.full_name  = payload.full_name.strip()
    if payload.phone      is not None: current_user.phone      = payload.phone.strip()
    if payload.department is not None: current_user.department = payload.department.strip()

    log_action(db, "profile_updated", user_id=current_user.id, entity="user",
               entity_id=current_user.id)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
def change_password(
    payload:      ChangePassword,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """Change password — requires the current password for verification."""
    from app.services.user_service import UserService
    return UserService.change_password(current_user, payload, db)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    db:      Session = Depends(get_db),
):
    """
    Request a password reset link.
    Always returns success (to avoid user enumeration attacks).
    """
    user = db.query(User).filter(
        User.email     == payload.email,
        User.is_active == True,
    ).first()

    if user:
        # Delete any existing unused tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used    == False,
        ).delete()

        # Generate a secure random token
        token      = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(minutes=30)

        reset_token = PasswordResetToken(
            user_id    = user.id,
            token      = token,
            expires_at = expires_at,
        )
        db.add(reset_token)
        db.commit()

        # Build reset link and send email
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        send_reset_password_email(
            to_email   = user.email,
            user_name  = user.full_name,
            reset_link = reset_link,
        )

        log.info("Password reset requested for user %s", user.email)

    return MessageResponse(message="If that email exists, a reset link has been sent.")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    payload: ResetPasswordRequest,
    db:      Session = Depends(get_db),
):
    """Reset password using the token from the email link."""
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == payload.token,
        PasswordResetToken.used  == False,
    ).first()

    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    if reset_token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new one.")

    # Update the password
    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.hashed_password = hash_password(payload.new_password)

    # Mark token as used
    reset_token.used = True

    log.info("Password reset successfully for user %s", user.email)
    db.commit()

    return MessageResponse(message="Password reset successfully. You can now log in.")