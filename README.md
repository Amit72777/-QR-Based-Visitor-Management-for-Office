# QR-Based Visitor Management System (VMS) — v2

A full-stack **Visitor Management System** that uses QR codes to streamline visitor registration, check-in, and check-out. Built with **FastAPI** on the backend and **React** on the frontend, with role-based access control, email notifications, photo capture, and a real-time dashboard.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Enabling Email (SMTP)](#enabling-email-smtp)
  - [QR Expiry](#qr-expiry)
- [Default Credentials](#default-credentials)
- [Role Access Guide](#role-access-guide)
- [API Reference](#api-reference)
- [Database Models](#database-models)
- [What's New in v2](#whats-new-in-v2)

---

## Features

- **QR Code Registration** — Visitors register and receive a unique QR code via email or on-screen
- **Real QR Scanning** — Guards scan visitor QR codes using the device camera (`html5-qrcode`)
- **Check-in / Check-out Tracking** — Visit lifecycle: `registered → checked_in → checked_out / expired`
- **Photo Capture** — Capture visitor photos via webcam or file upload during registration
- **Email Notifications** — QR code sent automatically to the visitor's email after registration
- **Role-Based Access Control** — Three roles: `guard`, `admin`, `super_admin`
- **Dark / Light Mode** — Theme toggle with preference persistence
- **Admin Dashboard** — Real-time visitor stats and daily reports
- **Audit Logs** — Full system audit trail accessible to super admins
- **Branch Management** — Multi-branch support for larger organisations
- **User Management** — Create, view, and deactivate system users
- **Profile & Password Management** — All users can update their profile and change their password
- **Forgot / Reset Password** — Secure email-based password reset flow
- **Configurable QR Expiry** — Default 24 hours, adjustable via `.env`

---

## Tech Stack

| Layer      | Technology                                              |
|------------|---------------------------------------------------------|
| Backend    | Python 3.11, FastAPI 0.111, Uvicorn                     |
| Database   | PostgreSQL, SQLAlchemy 2.0, Alembic (migrations)        |
| Auth       | JWT (`python-jose`), bcrypt 4.1                         |
| QR Code    | `qrcode` + `pillow` (generation), `html5-qrcode` (scan) |
| Email      | SMTP (Gmail App Password recommended)                   |
| Frontend   | React 18, React Router v6                               |
| HTTP Client| Axios                                                   |
| Styling    | CSS (custom, with dark/light theme support)             |

---

## Project Structure

```
vms_upgraded/
├── backend/
│   ├── main.py                       # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env                          # Your config (copy from .env.example)
│   ├── .env.example                  # Template with all options documented
│   ├── migrate.py                    # DB migration helper
│   ├── fix_db.py                     # DB repair utility
│   └── app/
│       ├── api/routes/
│       │   ├── auth.py               # Login, /me, profile update, change-password
│       │   ├── visitor_routes.py     # Register visitor, list visits
│       │   ├── visit_routes.py       # QR scan (check-in / check-out)
│       │   └── admin_routes.py       # Dashboard, report, users, branches, audit
│       ├── core/
│       │   ├── config.py             # All settings (SMTP, QR expiry, etc.)
│       │   ├── security.py           # JWT + bcrypt helpers
│       │   └── dependencies.py       # get_current_user, require_roles
│       ├── db/
│       │   ├── models.py             # SQLAlchemy ORM models
│       │   ├── session.py            # DB session factory
│       │   └── init_db.py            # Table creation + seed first admin
│       ├── schemas/schemas.py        # Pydantic request/response schemas
│       ├── services/
│       │   ├── visit_service.py      # Registration, scan, dashboard logic
│       │   └── user_service.py       # User CRUD, password change
│       └── utils/
│           ├── qr.py                 # QR token generation + image
│           ├── email.py              # SMTP email with inline QR image
│           └── audit.py              # Audit log helper
│
└── frontend/
    └── src/
        ├── App.js                    # Routes + ThemeProvider
        ├── context/
        │   ├── AuthContext.js        # Login, logout, updateUser state
        │   └── ThemeContext.js       # Dark/light mode toggle
        ├── components/
        │   ├── Navbar.js             # Navigation with theme toggle + profile link
        │   ├── CameraCapture.js      # Webcam/file-upload component
        │   ├── ProtectedRoute.js     # Route guard by role
        │   └── Loader.js             # Loading spinner
        ├── pages/
        │   ├── LoginPage.js
        │   ├── ForgotPasswordPage.js
        │   ├── ResetPasswordPage.js
        │   ├── VisitorFormPage.js    # Registration with photo capture
        │   ├── QRDisplayPage.js
        │   ├── ScannerPage.js        # Real html5-qrcode scanner
        │   ├── DashboardPage.js
        │   ├── VisitorsListPage.js
        │   ├── UsersPage.js
        │   ├── ProfilePage.js
        │   ├── BranchesPage.js
        │   └── AuditPage.js
        └── utils/api.js              # Axios client with all API endpoints
```

---

## Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- **PostgreSQL** (running locally or a hosted instance)

---

### Backend Setup

```bash
cd vms_upgraded/backend

# 1. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and SECRET_KEY

# 4. Start the server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`  
Interactive Swagger docs at `http://localhost:8000/docs`

---

### Frontend Setup

```bash
cd vms_upgraded/frontend

# 1. Install dependencies
npm install

# 2. Start the development server
npm start
```

The app will be available at `http://localhost:3000`

> The frontend proxies API calls to `http://localhost:8000` automatically (configured in `package.json`).

---

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

| Variable            | Required | Description                                          |
|---------------------|----------|------------------------------------------------------|
| `DATABASE_URL`      | ✅        | PostgreSQL connection string                         |
| `SECRET_KEY`        | ✅        | JWT signing secret (use a long random string)        |
| `ALGORITHM`         |          | JWT algorithm, default `HS256`                       |
| `ACCESS_TOKEN_EXPIRE_MINUTES` |  | Token expiry, default `60`               |
| `QR_EXPIRY_HOURS`   |          | QR code validity window, default `24`                |
| `SMTP_ENABLED`      |          | Set `True` to send QR codes by email                 |
| `SMTP_HOST`         |          | SMTP server host, default `smtp.gmail.com`           |
| `SMTP_PORT`         |          | SMTP port, default `587`                             |
| `SMTP_USER`         |          | Your email address                                   |
| `SMTP_PASSWORD`     |          | App password (not your account password)             |
| `SMTP_FROM`         |          | Sender address shown in emails                       |
| `UPLOAD_DIR`        |          | Path for storing visitor photos, default `uploads/photos` |

---

### Enabling Email (SMTP)

1. In your Google account go to **Security → App Passwords**
2. Generate a password for "Mail"
3. Set these values in `backend/.env`:

```env
SMTP_ENABLED=True
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM=your-email@gmail.com
```

4. Restart the backend. QR codes will now be emailed automatically when a visitor provides their email during registration.

---

### QR Expiry

Adjust the QR code validity window in `backend/.env`:

```env
QR_EXPIRY_HOURS=24   # 24 hours (default)
# QR_EXPIRY_HOURS=8  # 8 hours (stricter)
# QR_EXPIRY_HOURS=48 # 2 days (more lenient)
```

---

## Default Credentials

| Field    | Value               |
|----------|---------------------|
| Email    | `admin@company.com` |
| Password | `Admin@1234`        |
| Role     | `super_admin`       |

> **Change this password immediately after first login.**

---

## Role Access Guide

| Feature              | Guard | Admin | Super Admin |
|----------------------|:-----:|:-----:|:-----------:|
| Register Visitor     | ✅    | ✅    | ✅          |
| QR Scanner           | ✅    | ✅    | ✅          |
| Profile / Password   | ✅    | ✅    | ✅          |
| Visitors List        | ✅    | ✅    | ✅          |
| Dashboard            | ❌    | ✅    | ✅          |
| Users Management     | ❌    | ❌    | ✅          |
| Branches Management  | ❌    | ❌    | ✅          |
| Audit Log            | ❌    | ❌    | ✅          |

---

## API Reference

### Auth

| Method | Endpoint                       | Description                        |
|--------|--------------------------------|------------------------------------|
| `POST` | `/api/auth/login`              | Login and receive JWT token        |
| `GET`  | `/api/auth/me`                 | Get current user info              |
| `PUT`  | `/api/auth/profile`            | Update name, phone, department     |
| `POST` | `/api/auth/change-password`    | Change password (requires old password) |
| `POST` | `/api/auth/forgot-password`    | Request a password reset email     |
| `POST` | `/api/auth/reset-password`     | Reset password using token         |

### Visitors

| Method | Endpoint                       | Description                              |
|--------|--------------------------------|------------------------------------------|
| `POST` | `/api/visitors/register`       | Register a visitor and generate QR code  |
| `GET`  | `/api/visitors`                | List all visits (guard+ access)          |

### Visits (QR Scan)

| Method | Endpoint                       | Description                              |
|--------|--------------------------------|------------------------------------------|
| `POST` | `/api/visits/scan/:token`      | Check-in or check-out a visitor          |

### Admin

| Method   | Endpoint                     | Description                                 |
|----------|------------------------------|---------------------------------------------|
| `GET`    | `/api/admin/dashboard`       | Real-time visitor statistics                |
| `GET`    | `/api/admin/report`          | Daily visit counts and top hosts            |
| `GET`    | `/api/admin/branches`        | List all branches                           |
| `POST`   | `/api/admin/branches`        | Create a new branch (super_admin)           |
| `GET`    | `/api/admin/users`           | List all users (super_admin)                |
| `POST`   | `/api/admin/users`           | Create a new user (super_admin)             |
| `DELETE` | `/api/admin/users/:id`       | Deactivate a user (super_admin)             |
| `GET`    | `/api/admin/audit-logs`      | Full system audit trail (super_admin)       |

---

## Database Models

| Model      | Key Fields                                                                 |
|------------|----------------------------------------------------------------------------|
| `Branch`   | `name`, `address`, `city`, `is_active`                                     |
| `User`     | `email`, `role` (guard/admin/super_admin), `branch_id`, `is_active`        |
| `Visitor`  | `full_name`, `email`, `phone`, `company`, `photo_path`                     |
| `Visit`    | `visitor_id`, `host_name`, `purpose`, `status`, `qr_token`, `qr_expiry_hours` |
| `AuditLog` | `user_id`, `action`, `entity_type`, `entity_id`, `timestamp`               |

**Visit status lifecycle:**  
`registered` → `checked_in` → `checked_out`  
`registered` → `expired` (if QR is not used before expiry)

---

## What's New in v2

| Feature | Details |
|---|---|
| 📷 Photo Capture | Visitors can take a photo via webcam or upload one during registration |
| 🌙 Dark / Light Mode | Toggle in the navbar; preference saved in localStorage |
| 👤 Profile Page | All users can update their name, phone, and department |
| 🔒 Change Password | Secure password change with old-password verification |
| 🔑 Forgot / Reset Password | Email-based password reset flow |
| ✉️ SMTP Email | QR code sent to visitor's email after registration |
| 🏢 Branches Page | Super admin UI to view and create office branches |
| 📋 Audit Log Page | Super admin UI for the full system audit trail |
| ⏱ Configurable QR Expiry | Set via `QR_EXPIRY_HOURS` in `.env` (default 24h, was 8h) |
| 📡 Real QR Scanner | `html5-qrcode` library replaces the demo scan button |

---

## License

This project is provided as-is for internal/educational use. Replace this section with your actual license if distributing externally.
