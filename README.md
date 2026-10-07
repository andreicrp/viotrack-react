# 🛡️ VIOTRACK: A Student Violation Tracking and Monitoring System Using QR Code and Dashboard

A modern, responsive, full-featured **Student Violation Tracking and Monitoring System Using QR Code and Dashboard** built with **React 19**, **Vite 8**, and **Supabase**. Designed for schools in the Philippines with QR code scanning, live analytics, geolocation tracking, and SMS alerts via iProgTech.

---

## ✨ Features

### 📊 Analytics Dashboard
- Real-time KPI stat cards (Minor, Serious, Major offenses, total students & violations)
- Interactive violation trends area chart with toggleable severity series & date filters (Today / Week / Month / Custom Range)
- Repeat & high-risk students leaderboard with infraction badges
- Section breakdown by grade level with horizontal bar visualization
- Integrated school calendar with color-coded event dots and upcoming events panel
- Executive PDF summary report export

### ⚠️ Violation Records & Resolution
- Full-page violation log with multi-criteria filtering (Student name, LRN, offense type, status, severity, grade level)
- Table view and Grid/Card view toggle with responsive layouts
- Single & bulk incident logging with custom sanctions
- Resolution modal with case clearance notes and celebration confetti animation
- CSV export for violation records

### 📋 Violation Types Management
- Complete CRUD for violation categories (Minor / Serious / Major)
- Sortable, searchable list with table and grid view modes
- Bulk import via CSV with preview and validation

### 🎓 Student Directory & ID Generation
- Searchable student roster with photo avatars, parent/guardian info, and emergency contacts
- Printable official Student ID cards with dynamic QR codes
- CSV bulk student roster import with column mapping preview
- Individual student violation detail page with complete infraction history

### 📷 Live QR Scanner & LRN Lookup
- Real-time in-browser camera QR code scanner (`html5-qrcode`) for rapid student identification
- Instant violation history lookup and 1-click violation recording from scan results
- Manual LRN search fallback

### 👨‍🏫 Adviser / My Class Portal
- Dedicated portal for class advisers to monitor their assigned section's conduct and roster
- Section-specific violation statistics and student list

### 👥 Faculty & Adviser Management
- Full CRUD for teaching staff with department, position, and contact info
- Adviser assignment to Grade 7–12 sections
- Bulk teacher import via CSV

### 🛡️ Admin Users & Access Control
- Role-based access (Super Admin / Discipline Officer / Faculty Teacher)
- Admin user management with role assignment
- Protected routes with 403 Forbidden handling

### 📝 Activity Audit Trail
- Comprehensive timestamped audit logging for all security and data changes
- Filterable activity log with user, action type, and timestamp columns

### 🖨️ Export & Reporting
- Executive PDF dashboard summary report (`jspdf` + `jspdf-autotable`)
- CSV export for violations, students, and teachers with formula injection protection
- Printable Student ID badge cards

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, React Router 7, Recharts |
| **Build** | Vite 8, Route-level code splitting via `React.lazy` |
| **Styling** | Vanilla CSS (no Tailwind), Lucide React icons |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime) or built-in offline mock data engine |
| **Mobile** | Capacitor 8 (Android APK with native splash screen & status bar) |
| **Testing & CI** | Vitest, oxlint, GitHub Actions |
| **PDF & CSV** | jsPDF + jsPDF-autotable, CSV security sanitization |
| **QR** | html5-qrcode |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (Node 20+ recommended)
- npm 9+

### 1. Install Dependencies

```bash
cd Viotrack_React
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your secrets and endpoints in `.env`:

```env
# Supabase Database Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# iProgSMS Gateway Configuration
VITE_IPROGSMS_API_TOKEN=your-iprogsms-api-token
VITE_IPROGSMS_ENDPOINT=https://sms.iprogtech.com/api/v1/sms_messages
VITE_IPROGSMS_SENDER_NAME=PHCM VioTrack
```

> ⚠️ **Security Notice**: `.env` and `*.keystore` files are excluded in `.gitignore`. Never commit API tokens, passwords, or release keystores to source control.

### 3. Start the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🧪 Testing & Linting

```bash
# Run unit tests (Vitest)
npm test

# Run linter (oxlint)
npm run lint

# Run production build
npm run build
```

Continuous Integration is pre-configured via GitHub Actions in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## 🗄️ Supabase Setup (Optional)

1. Create a project at [supabase.com](https://supabase.com).
2. Open your Supabase project's **SQL Editor**.
3. Copy the entire contents of [`src/lib/supabase-schema.sql`](src/lib/supabase-schema.sql) and click **Run**.
4. Update your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`.
5. Restart your development server.

> **Note:** If Supabase keys are left blank, the application automatically runs on its built-in reactive offline storage engine with full mock seed data — all features work immediately without external dependencies!

---

## 📱 Android Build (Capacitor)

```bash
# Sync web assets to Android project
npm run cap:sync

# Open in Android Studio
npm run cap:open

# Build release APK
npm run build:apk

# Build debug APK
npm run build:debug
```

### Android Signing Security:
- Release keystores (`*.keystore`, `*.jks`) and passwords must be stored locally in `gradle.properties` or CI secrets, not committed into repository JSON files.

---

## 🔑 Demo Access Accounts

Log in using the **1-click Quick Access** buttons on the login screen, or with these demo profiles:

| Role | Email | Access |
|---|---|---|
| **Admin** | `admin@viotrack.edu` | Full administrative privileges |
| **Teacher / Adviser** | `juan.delacruz@viotrack.edu` | Class Adviser for Grade 10 – Rizal |

---

## 📁 Project Structure

```
src/
├── components/         # Modular UI components (modals, selects, layouts)
├── context/            # AuthContext, NotificationContext
├── css/                # Component-level stylesheets
├── lib/                # Supabase client & database schema
├── pages/              # Route-level page components
├── services/           # Data & SMS services
└── utils/              # Security, CSV helpers, and unit tests
```

---

## 📄 License

This project is proprietary software. All rights reserved.
