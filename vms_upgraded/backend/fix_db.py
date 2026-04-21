"""
fix_db.py — Run this ONCE to fix all database issues:

1. Drops and recreates all tables (fresh start)
2. Creates 'super_admin' role user correctly
3. Creates a default branch

Run from backend folder:
    python fix_db.py
"""

import sys
import os

# Make sure Python can find the app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text
from app.db.session import engine, SessionLocal
from app.db.models import Base, User, Branch, UserRole
from app.core.security import hash_password

print("\n" + "="*55)
print("  QR Visitor Management — Database Fix Script")
print("="*55)


def fix_database():
    db = SessionLocal()

    try:
        print("\n[Step 1] Dropping all existing tables...")
        # Drop in correct order (foreign keys first)
        with engine.connect() as conn:
            conn.execute(text("DROP TABLE IF EXISTS audit_logs  CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS visits      CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS visitors    CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS users       CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS branches    CASCADE"))
            # Also drop the enum types so they get recreated cleanly
            conn.execute(text("DROP TYPE IF EXISTS userrole    CASCADE"))
            conn.execute(text("DROP TYPE IF EXISTS visitpurpose CASCADE"))
            conn.execute(text("DROP TYPE IF EXISTS visitstatus  CASCADE"))
            conn.commit()
        print("[OK] All old tables dropped.")

        print("\n[Step 2] Creating fresh tables with correct schema...")
        Base.metadata.create_all(bind=engine)
        print("[OK] All tables created.")

        print("\n[Step 3] Creating default branch...")
        branch = Branch(
            name="Head Office",
            city="Delhi",
            address="Main HQ Building"
        )
        db.add(branch)
        db.flush()
        print(f"[OK] Branch created → ID={branch.id}, Name={branch.name}")

        print("\n[Step 4] Creating super_admin user...")
        # Load from .env or use defaults
        email    = os.getenv("FIRST_ADMIN_EMAIL",    "admin@company.com")
        password = os.getenv("FIRST_ADMIN_PASSWORD", "Admin@1234")
        name     = os.getenv("FIRST_ADMIN_NAME",     "System Administrator")

        admin = User(
            full_name=name,
            email=email,
            hashed_password=hash_password(password),
            role=UserRole.super_admin,   # <-- super_admin, NOT admin
            branch_id=branch.id,
            is_active=True,
        )
        db.add(admin)
        db.commit()

        print(f"[OK] super_admin created!")
        print(f"     Email    : {email}")
        print(f"     Password : {password}")
        print(f"     Role     : super_admin")

        print("\n[Step 5] Verifying...")
        user_check = db.query(User).filter(User.email == email).first()
        if user_check and user_check.role == UserRole.super_admin:
            print(f"[OK] Verification passed — role is '{user_check.role.value}'")
        else:
            print("[ERROR] Verification failed!")
            return

        print("\n" + "="*55)
        print("  Database fixed successfully!")
        print("="*55)
        print(f"\n  Login URL  : http://localhost:3000/login")
        print(f"  Email      : {email}")
        print(f"  Password   : {password}")
        print(f"  API Docs   : http://localhost:8000/docs")
        print("\n  Now restart your backend:")
        print("  uvicorn main:app --reload --port 8000\n")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] {e}")
        print("\nTroubleshooting:")
        print("1. Make sure PostgreSQL is running")
        print("2. Check DATABASE_URL in .env file")
        print("3. Make sure qr_visitor_db database exists")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    fix_database()
