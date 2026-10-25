# HCM Lite - AI-Assisted Human Capital Management

A production-ready, lightweight Human Capital Management web application built for the Hackathon (24 Oct 2026).

---

## 🛠️ Stack & Architecture
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom design system with dark/light mode and glassmorphism), Modern JavaScript (ES Modules). No React, no frameworks, no classes.
- **Database & Authentication**: Supabase (PostgreSQL with Row Level Security, Triggers & Security Definer Functions).
- **Libraries**: SweetAlert2 (ES Module) for modal alerts and notifications.

---

## 📂 Project Organization
```text
hcm-final/
├── css/
│   ├── style.css             # Shared global design system, navbar, modals, badges, tables
│   ├── auth.css              # Authentication card container styling
│   ├── login.css, setup.css, change.css, forget.css, reset.css
│   ├── dashboard.css, settings.css, users.css, employees.css
│   ├── attendance.css, leave.css, payroll.css, announcements.css, audit.css, profile.css, home.css
│
├── js/
│   ├── credential.js         # Supabase client export (ES Module)
│   ├── alert.js              # SweetAlert2 export (ES Module)
│   ├── validation.js         # Centralized form validations
│   ├── common.js             # Auth guard, dynamic navbar, date/tax helpers, audit logging, secondary user creation
│   ├── index.js              # Smart app router (setup vs login vs dashboard)
│   ├── setup.js              # First-run company and admin account initialization
│   ├── login.js              # Multi-role single login handler
│   ├── change.js             # Temporary password change controller
│   ├── settings.js           # Company settings, departments, designations, quotas, holidays
│   ├── users.js              # Admin HR login creation, password resets, active toggle
│   ├── employees.js          # Employee directory, registration, CSV export, CSV import (dry run)
│   ├── attendance.js         # Server-stamped punch clock, attendance board, missed punch corrections
│   ├── leave.js              # Working-day leaves (skips Sat-Sun & holidays), quota balances, approvals
│   ├── payroll.js            # Gross 1.5x basic, attendance deductions, tax slabs, lock & printable vouchers
│   ├── dashboard.js          # Executive workforce intelligence, attrition, charts, top late comers
│   ├── announcements.js      # Company-wide announcements circulars
│   ├── audit.js              # Security audit log trail with JSON before/after snapshots
│   ├── profile.js            # Profile viewer and employee phone/address updater
│   ├── home.js               # Interactive AI HR Assistant RAG engine
│   ├── forget.js, reset.js   # Password recovery and reset callbacks
│
├── sql/
│   ├── tables_and_functions.sql  # Schema, pgcrypto, tables, and server-stamping RPC functions
│   ├── policies.sql              # Strict Row Level Security (RLS) policies for all tables
│
└── *.html                    # One clean HTML5 page per view (100% ES module scripts, 0 inline onclicks)
```

---

## 🚀 Setup Instructions

1. **Supabase Database & Authentication**:
   - In your Supabase Dashboard, navigate to **Authentication** > **Providers** > **Email** and turn **OFF** "Confirm email".
   - Open the Supabase **SQL Editor**.
   - Copy and run `sql/tables_and_functions.sql`.
   - Copy and run `sql/policies.sql`.

2. **Supabase Credentials**:
   - Check `js/credential.js` and verify your `SUPABASE_URL` and `SUPABASE_KEY` (Anon Key).

3. **Running the Application**:
   - Open the project folder in VS Code and launch `index.html` with **Live Server** (or any static HTTP server).
   - On first launch with an empty database, `index.html` automatically routes to `setup.html`.

---

## 👥 Three Dedicated Roles & Access Control
All access is checked directly on the server through PostgreSQL Row Level Security (RLS):

| Feature | Admin | HR Manager | Employee |
| :--- | :---: | :---: | :---: |
| First-run Company & Admin Setup | ✅ | ❌ | ❌ |
| Company Settings & Office Timings | ✅ | 👁️ (Read Only) | ❌ |
| Departments, Designations, Holidays | ✅ | 👁️ (Read Only) | ❌ |
| Manage HR User Accounts & Resets | ✅ | ❌ | ❌ |
| Register Employees & Manage Profiles | ✅ | ✅ | ❌ |
| CSV Import (with Dry Run) & Export | ✅ | ✅ | ❌ |
| Server-Stamped Attendance Punching | ✅ | ✅ | ✅ |
| Attendance Board & Missing Punches | ✅ | ✅ | ❌ |
| Review & Approve Missed Punch Corrections | ✅ | ✅ | ❌ |
| Apply for Working-Day Leaves | ✅ | ✅ | ✅ |
| Review & Approve Leaves with Comments | ✅ | ✅ | ❌ |
| Calculate Monthly Payroll Draft | ✅ | ✅ | ❌ |
| Lock & Finalize Payroll Runs | ✅ | ❌ | ❌ |
| Download & Print Payslip PDF Voucher | ✅ | ✅ | ✅ |
| Executive Intelligence Dashboard | ✅ | ✅ | 👁️ (Personal) |
| Post Official Circulars & Announcements | ✅ | ✅ | 👁️ (Read Only) |
| Immutable Security Audit Log | ✅ | ❌ | ❌ |
| AI HR Assistant (Rules, Balances, Queries)| ✅ | ✅ | ✅ |

---

## ⚖️ Business Logic Enforced
1. **Server-Stamped Attendance**:
   - Stamped via Postgres functions (`record_check_in`, `record_check_out`). Multiple check-ins on the same day are blocked with 409 conflict.
   - Flagged as `late` if checked in after 09:15 AM (09:00 + 15m grace).
   - Flagged as `half_day` if total daily working hours are under 5.0 hours.
   - Historical check-in without check-out flagged as `missing_checkout`.
2. **Working-Day Leave Quotas**:
   - Leaves automatically exclude Saturdays, Sundays, and public holidays.
   - Overlapping date ranges or requests exceeding remaining annual balance are blocked with 422 warnings.
3. **Payroll & Progressive Tax**:
   - `Gross = 1.5 × Basic`.
   - `Per-Day Rate = Gross ÷ 22`.
   - Deductions = `(Absent Days + Unpaid Days + 0.5 × Half Days) × Per-Day Rate`.
   - Joiners joining mid-month are automatically prorated based on working days since their join date.
   - Monthly tax calculated using standard progressive annual brackets (0 to 600k = 0; 5% to 1.2M; 30k + 15% to 2.4M; 210k + 25% to 3.6M; 510k + 35% above).
   - Admin locking permanently prevents post-finalization edits.
