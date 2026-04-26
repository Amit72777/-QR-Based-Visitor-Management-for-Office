"""
init_db.py — table creation, auto-migration, and first-admin seeding.

v2 fix: create_tables() now also runs ensure_columns() which adds
any missing columns (photo_path, qr_expiry_hours) to existing tables.
This handles databases created by v1 that were never migrated.
"""
import logging
from sqlalchemy     import text
from sqlalchemy.orm import Session
from app.db.models import Base, User, Branch, Visitor, Visit, AuditLog, PasswordResetToken, UserRole
from app.db.session import engine
from app.core.security import hash_password
from app.core.config   import settings

log = logging.getLogger(__name__)


# ── Column definitions that must exist ────────────────────────────────────────
# Add new columns here whenever the model gains a new field.
REQUIRED_COLUMNS = [
    # (table_name,  column_name,     sql_type)
    ("visitors", "photo_path",      "VARCHAR(300)"),
    ("visits",   "qr_expiry_hours", "INTEGER"),
    ("visitors", "photo_data",      "TEXT"), 
]


def _column_exists(conn, table: str, column: str) -> bool:
    """Check information_schema — works on PostgreSQL."""
    result = conn.execute(text("""
        SELECT 1 FROM information_schema.columns
        WHERE table_name   = :table
          AND column_name  = :column
    """), {"table": table, "column": column})
    return result.fetchone() is not None


def ensure_columns():
    """
    Add any columns that are missing from existing tables.
    Safe to run every startup — skips columns that already exist.
    This is our lightweight alternative to Alembic for simple additions.
    """
    with engine.begin() as conn:
        for table, column, col_type in REQUIRED_COLUMNS:
            if not _column_exists(conn, table, column):
                conn.execute(text(
                    f'ALTER TABLE "{table}" ADD COLUMN "{column}" {col_type}'
                ))
                log.warning("[MIGRATION] Added missing column: %s.%s (%s)", table, column, col_type)
                print(f"[MIGRATION] Added {table}.{column} ({col_type})")
            # If column already exists, silently skip it


def create_tables():
    """Create all tables, then ensure any new columns exist."""
    # Step 1: create tables that don't exist yet
    Base.metadata.create_all(bind=engine)
    print("[DB] Tables created / verified.")

    # Step 2: add missing columns to EXISTING tables (the v1 → v2 migration)
    ensure_columns()


def seed_first_admin(db: Session):
    """
    On first run: create default branch + super_admin user.
    Skips silently if super_admin already exists.
    """
    existing_super = db.query(User).filter(
        User.role == UserRole.super_admin
    ).first()

    if existing_super:
        print(f"[DB] super_admin already exists → {existing_super.email}")
        return

    # Create default branch if none exists
    branch = db.query(Branch).first()
    if not branch:
        branch = Branch(name="Head Office", city="Delhi", address="Main HQ")
        db.add(branch)
        db.flush()
        print(f"[DB] Default branch created → {branch.name}")

    admin = User(
        full_name=settings.FIRST_ADMIN_NAME,
        email=settings.FIRST_ADMIN_EMAIL,
        hashed_password=hash_password(settings.FIRST_ADMIN_PASSWORD),
        role=UserRole.super_admin,
        branch_id=branch.id,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    print(f"[DB] super_admin created → {settings.FIRST_ADMIN_EMAIL}")
