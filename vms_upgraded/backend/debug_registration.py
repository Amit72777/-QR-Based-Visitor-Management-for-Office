"""
debug_registration.py — Tests visitor registration directly in Python
without needing the frontend. Run this to see the exact error.

Run from backend folder:
    python debug_registration.py
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.db.session import SessionLocal
from app.db.models import Branch, Visitor, Visit
from app.services.visit_service import VisitService
from app.schemas.schemas import VisitorRegister

db = SessionLocal()

print("\n" + "="*50)
print("  Registration Debug Test")
print("="*50)

# Step 1: Check branches
branches = db.query(Branch).filter(Branch.is_active == True).all()
print(f"\n[Branches found]: {len(branches)}")
if not branches:
    print("[ERROR] No active branches! Run fix_db.py first.")
    db.close()
    sys.exit(1)

for b in branches:
    print(f"  → ID={b.id}, Name={b.name}")

branch_id = branches[0].id
print(f"\nUsing branch_id = {branch_id}")

# Step 2: Try registration
print("\n[Attempting registration...]")
try:
    payload = VisitorRegister(
        full_name="Test Visitor",
        phone="9876543210",
        email="test@example.com",
        company_name="Test Corp",
        host_name="Priya Sharma",
        purpose="meeting",
        branch_id=branch_id,
    )

    visit = VisitService.register(payload, db)

    print(f"\n[SUCCESS] Registration worked!")
    print(f"  Visit ID   : {visit.id}")
    print(f"  QR Token   : {visit.qr_token}")
    print(f"  QR Expires : {visit.qr_expires}")
    print(f"  Status     : {visit.status}")
    print(f"  Visitor    : {visit.visitor.full_name}")
    print(f"  QR Image   : {'YES (base64)' if visit.qr_image else 'MISSING'}")

except Exception as e:
    print(f"\n[ERROR] Registration failed: {e}")
    import traceback
    traceback.print_exc()
    print("\nFix: Run fix_db.py first, then try again.")

db.close()
