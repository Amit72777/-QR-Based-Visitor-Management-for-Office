"""
Security helpers — JWT tokens and password hashing.

WHY we dropped passlib:
  passlib tries to read bcrypt.__about__.__version__ at import time.
  bcrypt >= 4.x removed __about__, so passlib throws a noisy warning
  and then crashes with "password cannot be longer than 72 bytes" on
  verify() because its bcrypt backend fails to initialise properly.

  Fix: call bcrypt directly. It's what passlib was wrapping anyway.
  One less layer, zero version-conflict issues.
"""
import bcrypt
from datetime   import datetime, timedelta
from typing     import Optional
from jose       import JWTError, jwt
from app.core.config import settings


# ── Password hashing ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a plain-text password with bcrypt (cost factor 12)."""
    # bcrypt requires bytes; encode first
    pw_bytes = password.encode("utf-8")
    salt     = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if plain matches the stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain.encode("utf-8"),
            hashed.encode("utf-8"),
        )
    except Exception:
        # Malformed hash or other bcrypt error — treat as wrong password
        return False


# ── JWT tokens ────────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT with an expiry timestamp."""
    payload = data.copy()
    expire  = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload["exp"] = expire
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT. Returns None if invalid or expired."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
