# 🛡️ VIOTRACK: A Student Violation Tracking and Monitoring System Using QR Code and Dashboard

A modern, responsive, full-featured **Student Violation Tracking and Monitoring System Using QR Code and Dashboard** built with **React 19**, **Vite 8**, and **Supabase**. Designed for Philippine basic and secondary educational institutions with cryptographically signed QR badge scanning, live analytics, audio/haptic feedback, automated parent summons, geolocation tracking, and SMS alerts.

---

## ✨ Key Features & Capabilities

### 📊 Disciplinary Analytics Dashboard
- Real-time KPI summary cards (Minor, Serious, Major offenses, active sanctions, resolved cases).
- Interactive violation trends area chart with toggleable severity series & date filters (Today / Week / Month / Custom Range).
- Repeat & high-risk students leaderboard with infraction count badges.
- Grade level and strand breakdown with horizontal bar visualizations.
- Integrated school calendar with color-coded event markers and upcoming events panel.
- Executive PDF dashboard summary export (`jspdf` + `jspdf-autotable`).

### 📷 Live QR Scanner & Tamper-Proof Badges
- **Cryptographically Signed QR Protocol (`VT1:<lrn>:<checksum>`)**: Protects against forged QR codes generated on mobile phones.
- **Audio & Haptic Feedback Engine**:
  - 🔔 **Ascending High Chime (`C6 → E6 → B6`)** + Subtle tactile vibration on **Success / Authentic Badge**.
  - ⚠️ **Double Low Buzz (`220Hz / 180Hz`)** + Heavy double vibration on **Invalid / Tampered QR**.
  - Interactive **Feedback Settings Popover** to adjust volume, mute chimes, toggle haptics, and test profiles.
- **Real-Time Camera Scanner (`html5-qrcode`)**: High-framerate optical matrix detection with front/rear camera switcher.
- **Image File Upload Decoder**: Multi-engine canvas preprocessing for low-contrast or rotated photos.
- **1-Click Violation Logging & Student History Modal**: Instant access to infraction logs from scan results.

### ⚠️ Violation Records & Case Management
- Filterable violation registry (Student name, LRN, offense category, status, severity, grade, date).
- Dual view modes: **Table View** and **Grid/Card View** with responsive mobile layout.
- **Action Undo Toast Notifications**: 5-second countdown with `↶ Undo` button before permanently committing record updates or deletions.
- Official Parent Summons form generator with scheduled conference details.
- Case resolution modal with clearance notes and celebration confetti.
- CSV and PDF incident report exports.

### 🎓 Student Directory & ID Card Generation
- Searchable student roster with photo avatars, parent/guardian contacts, and emergency info.
- Printable official Student ID cards with dynamic signed QR codes.
- Bulk student roster import via CSV with validation and duplicate prevention.
- Individual student violation detail page with complete infraction history and status tracking.

### ⌨️ Keyboard Navigation Shortcuts
- **`/`**: Automatically focuses and selects the search bar on any page.
- **`Esc`**: Closes active modals, drawers, or clears search focus.
- **`N`**: Instantly opens the "Add Violation" modal on the Violations page.

### 💀 Skeleton Loading Placeholders
- Smooth animated shimmer pulse placeholders for tables, cards, feeds, and profiles, eliminating jarring screen flashes.

### 🖨️ High-Contrast Print Stylesheet (`@media print`)
- Ink-saving, pure black-and-white print styles for violation summary slips, data reports, and conference letters, optimized for school laser and dot-matrix printers.

### 🔒 Enterprise Security & Access Control
- **Inactivity Workstation Lock**: Automatic screen lock after idle periods with PIN/password re-authentication.
- **Role-Based Access Control (RBAC)**: Super Admin, Prefect of Discipline, and Teacher/Adviser permissions.
- Protected routes with custom 403 Forbidden and 404 handler pages.
- CSV Formula Injection (`=`, `+`, `-`, `@`) sanitization.
- Timestamped activity audit trail logging all security and data modifications.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, React Router 7, Recharts |
| **Build Tool** | Vite 8, Route-level code splitting via `React.lazy` |
| **Styling** | Vanilla CSS (Zero Tailwind), Lucide React icons |
| **Backend & Auth** | Supabase (PostgreSQL + RLS + Realtime) or built-in offline mock data engine |
| **Audio & Haptics** | Web Audio API Synthesizer + HTML5 Audio + Navigator Vibration API |
| **Mobile** | Capacitor 8 (Android APK with native splash screen & status bar) |
| **Testing & Linting** | Vitest, oxlint, GitHub Actions CI |
| **PDF & CSV** | jsPDF + jsPDF-autotable, CSV security sanitization |
| **QR Engine** | html5-qrcode, cryptographic FNV-1a checksum verification |

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

Configure your secrets in `.env`:
```env
# Supabase Database Configuration (Optional - runs on offline engine if empty)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# iProgSMS Gateway Configuration
VITE_IPROGSMS_API_TOKEN=your-iprogsms-api-token
VITE_IPROGSMS_ENDPOINT=https://sms.iprogtech.com/api/v1/sms_messages
VITE_IPROGSMS_SENDER_NAME=PHCM VioTrack
```

> ⚠️ **Security Notice**: `.env` and `*.keystore` files are strictly excluded in `.gitignore`. Never commit API tokens, passwords, or release keystores to source control.

### 3. Start the Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

---

## 🧪 Testing & Build

```bash
# Run unit tests (Vitest)
npm test

# Run linter (oxlint)
npm run lint

# Run production build (Vite)
npm run build
```

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

---

## 🔑 Demo Access Accounts

Log in using the **1-Click Quick Access** buttons on the login screen, or with these demo profiles:

| Role | Email | Password | Access |
|---|---|---|---|
| **Admin** | `admin@viotrack.edu` | `admin123` | Full administrative & prefect privileges |
| **Teacher / Adviser** | `juan.delacruz@viotrack.edu` | `teacher123` | Class Adviser for Grade 10 – Rizal |

---

## 📁 Project Structure

```
src/
├── assets/             # Audio sound effects & graphic assets
├── components/         # Modular UI components (violations, students, admin, layout)
│   ├── common/         # SkeletonLoader, ScreenLockModal, CustomDatePicker, CustomSelect
│   ├── layout/         # Top navbar, sidebar navigation, responsive wrappers
│   ├── students/       # AddStudentModal, StudentIdModal, BulkImportModal
│   └── violations/     # AddViolationModal, StatusModal, ResolutionModal, ParentSummonsModal
├── context/            # AuthContext (Inactivity Lock), NotificationContext (Undo Toasts)
├── css/                # Responsive stylesheets (dashboard, scan-qr, violations, print)
├── hooks/              # useKeyboardShortcuts
├── lib/                # Supabase client & SQL schema
├── pages/              # Route-level pages (Dashboard, ScanQR, Violations, Students, Notifications)
├── services/           # DataService, SMSService, caching & backup routines
└── utils/              # qrHelper, scannerFeedback, pdfHelper, csvHelper, security
```

---

## 📄 License

This project is proprietary software developed for educational institutions. All rights reserved.
