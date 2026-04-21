"""
Application settings — loaded from .env file.
All new config options have sensible defaults so the app
still starts if .env isn't updated yet.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME:    str = "QR Visitor Management System"
    APP_VERSION: str = "2.0.0"
    DEBUG:       bool = True

    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/qr_visitor_db"

    # JWT / Auth
    SECRET_KEY:                  str = "change-this-secret"
    ALGORITHM:                   str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # QR code expiry — now configurable, default 24 h (was 8 h)
    QR_EXPIRY_HOURS: int = 24

    # Seed admin
    FIRST_ADMIN_EMAIL:    str = "admin@company.com"
    FIRST_ADMIN_PASSWORD: str = "Admin@1234"
    FIRST_ADMIN_NAME:     str = "System Administrator"

    # ── SMTP (email) ──────────────────────────────────────────────────────────
    # Set SMTP_ENABLED=True in .env and fill in the credentials to activate.
    # Works with Gmail — use an App Password, not your account password.
    SMTP_ENABLED:  bool = False
    SMTP_HOST:     str  = "smtp.gmail.com"
    SMTP_PORT:     int  = 587
    SMTP_USER:     str  = ""
    SMTP_PASSWORD: str  = ""
    SMTP_FROM:     str  = "noreply@visitorqr.com"

    # ── File uploads ──────────────────────────────────────────────────────────
    # Visitor photo uploads land here. Created automatically on startup.
    UPLOAD_DIR: str = "uploads/photos"

    class Config:
        env_file      = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
