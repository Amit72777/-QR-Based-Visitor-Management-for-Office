# QR-Based Visitor Management System — v2

A full-stack visitor management system built with **FastAPI** (backend) and **React** (frontend).

---

## What's New in v2

| Feature | Details |
|---|---|
| 📷 Camera + Photo Upload | Visitors can capture a photo or upload one during registration |
| 🌙 Dark / Light Mode | Toggle button in navbar; preference saved in localStorage |
| 👤 Profile Page | All users can update their name, phone, department |
| 🔒 Change Password | Secure password change with old-password verification |
| ✉️ SMTP Email | QR code sent to visitor's email after registration |
| 🏢 Branches Page | Super admin UI to view and create office branches |
| 📋 Audit Log Page | Super admin UI for the full system audit trail |
| ⏱ 24h QR Expiry | Configurable via `QR_EXPIRY_HOURS` in `.env` (was 8h) |
| 📡 Real QR Scanner | `html5-qrcode` library replaces the demo scan button |

---

## Project Structure

```
fullstack/
├── backend/
│   ├── main.py                      # FastAPI app entry point
│   ├── .env                         # Your config (copy from .env.example)
│   ├── .env.example                 # Template with all options documented
│   ├── requirements.txt
│   └── app/
│       ├── api/routes/
│       │   ├── auth.py              # login, /me, PUT /profile, change-password
│       │   ├── visitor_routes.py    # POST /visitors/register, GET /visitors
│       │   ├── visit_routes.py      # POST /visits/scan/:token
│       │   └── admin_routes.py      # dashboard, report, users, branches, audit
│       ├── core/
│       │   ├── config.py            # All settings (SMTP, QR_EXPIRY, etc.)
│       │   ├── security.py          # JWT + bcrypt
│       │   └── dependencies.py      # get_current_user, require_roles
│       ├── db/
│       │   ├── models.py            # SQLAlchemy ORM models
│       │   ├── session.py           # DB session factory
│       │   └── init_db.py           # Table creation + first admin seed
│       ├── schemas/schemas.py       # Pydantic request/response schemas
│       ├── services/
│       │   ├── visit_service.py     # Registration, scan, dashboard logic
│       │   └── user_service.py      # User CRUD, password change
│       └── utils/
│           ├── qr.py                # QR token generation + image
│           ├── email.py             # SMTP email with inline QR image (NEW)
│           └── audit.py             # Audit log helper
│
└── frontend/
    └── src/
        ├── App.js                   # Routes + ThemeProvider
        ├── context/
        │   ├── AuthContext.js       # Login, logout, updateUser
        │   └── ThemeContext.js      # Dark/light mode toggle (NEW)
        ├── components/
        │   ├── Navbar.js            # With theme toggle + profile link
        │   ├── CameraCapture.js     # Camera/upload component (NEW)
        │   ├── ProtectedRoute.js
        │   └── Loader.js
        ├── pages/
        │   ├── LoginPage.js
        │   ├── VisitorFormPage.js   # With camera capture
        │   ├── QRDisplayPage.js
        │   ├── ScannerPage.js       # Real html5-qrcode scanner
        │   ├── DashboardPage.js
        │   ├── UsersPage.js
        │   ├── ProfilePage.js       # NEW
        │   ├── BranchesPage.js      # NEW
        │   └── AuditPage.js         # NEW
        └── utils/api.js             # Axios client with all endpoints
```

---

## Setup & Run

### 1. Clone / unzip the project

```bash
cd fullstack/
```

### 2. Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and edit config
cp .env.example .env
# → Edit .env: set DATABASE_URL, SECRET_KEY, and optionally SMTP settings

# Start the server
uvicorn main:app --reload --port 8000
```

The API will be at `http://localhost:8000`
Swagger docs at `http://localhost:8000/docs`

### 3. Frontend setup

```bash
cd frontend

# Install dependencies (includes html5-qrcode for real QR scanning)
npm install

# Start dev server
npm start
```

The app will be at `http://localhost:3000`

---

## Default Login

| Field | Value |
|---|---|
| Email | `admin@company.com` |
| Password | `Admin@1234` |
| Role | `super_admin` |

---

## Enabling Email (SMTP)

1. Go to your Gmail account → Security → **App Passwords**
2. Generate a password for "Mail"
3. In `backend/.env` set:

```env
SMTP_ENABLED=True
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM=your-email@gmail.com
```

4. Restart the backend. QR codes will now be emailed automatically when a visitor provides their email during registration.

---

## Role Access Guide

| Page | Guard | Admin | Super Admin |
|---|---|---|---|
| Register Visitor | ✓ | ✓ | ✓ |
| QR Scanner | ✓ | ✓ | ✓ |
| Profile | ✓ | ✓ | ✓ |
| Dashboard | — | ✓ | ✓ |
| Users | — | — | ✓ |
| Branches | — | — | ✓ |
| Audit Log | — | — | ✓ |

---

## QR Expiry Configuration

Change `QR_EXPIRY_HOURS` in `.env` (default: 24 hours):

```env
QR_EXPIRY_HOURS=24    # 24 hours
# QR_EXPIRY_HOURS=8   # 8 hours (original)
# QR_EXPIRY_HOURS=48  # 2 days
```

---

## API Quick Reference

```
POST   /api/auth/login            → login, get JWT
GET    /api/auth/me               → current user info
PUT    /api/auth/profile          → update name/phone/dept
POST   /api/auth/change-password  → change password

POST   /api/visitors/register     → register visitor, get QR
GET    /api/visitors              → list visits (guard+)

POST   /api/visits/scan/:token    → check-in or check-out

GET    /api/admin/dashboard       → real-time stats
GET    /api/admin/report          → daily counts + top hosts
GET    /api/admin/branches        → list branches
POST   /api/admin/branches        → create branch (super_admin)
GET    /api/admin/users           → list users (super_admin)
POST   /api/admin/users           → create user (super_admin)
DELETE /api/admin/users/:id       → deactivate user (super_admin)
GET    /api/admin/audit-logs      → audit trail (super_admin)
```
