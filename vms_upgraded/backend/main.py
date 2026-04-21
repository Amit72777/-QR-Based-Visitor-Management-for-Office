"""
FastAPI application entry point — v2.

Fix: 'uploads/' directory is created before app.mount() is called,
because StaticFiles checks for the directory at import time.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles    import StaticFiles
from contextlib             import asynccontextmanager

from app.core.config   import settings
from app.db.init_db    import create_tables, seed_first_admin
from app.db.session    import SessionLocal
from app.api.routes    import auth, visitor_routes, visit_routes, admin_routes


# ── Create upload directory BEFORE app.mount() ────────────────────────────────
# StaticFiles validates that the directory exists at import time, so we can't
# leave this for the lifespan hook — it would be too late.
os.makedirs("uploads/photos", exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"\n{'='*55}")
    print(f"  {settings.APP_NAME}  v{settings.APP_VERSION}")
    print(f"{'='*55}")

    create_tables()
    db = SessionLocal()
    try:
        seed_first_admin(db)
    finally:
        db.close()

    print(f"[OK] QR expiry  : {settings.QR_EXPIRY_HOURS} hours")
    print(f"[OK] SMTP email : {'enabled' if settings.SMTP_ENABLED else 'disabled'}")
    print(f"[OK] Upload dir : uploads/photos/")
    print("[OK] Server ready →  http://localhost:8000/docs\n")
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
**QR-Based Visitor Management System API — v2**

### Quick start
1. `POST /api/auth/login` → copy `access_token`
2. Click **Authorize** and paste the token
3. All protected endpoints now work

### Default credentials
- Email: `admin@company.com`
- Password: `Admin@1234`

### v2 New Endpoints
- `PUT /api/auth/profile` — update your own profile
- `POST /api/auth/change-password` — change password
    """,
    lifespan=lifespan,
)

# CORS — allow the React dev server and any local network address
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve visitor photos at /uploads/photos/<filename>
# The directory is guaranteed to exist by the os.makedirs() call above.
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

API = "/api"
app.include_router(auth.router,           prefix=API)
app.include_router(visitor_routes.router, prefix=API)
app.include_router(visit_routes.router,   prefix=API)
app.include_router(admin_routes.router,   prefix=API)


@app.get("/", tags=["Root"])
def root():
    return {
        "app":     settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs":    "/docs",
        "status":  "running",
    }
