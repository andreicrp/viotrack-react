# 🛡️ VIOTRACK: A Student Violation Tracking and Monitoring System Using QR Code and Dashboard

A modern, responsive, full-featured **Student Violation Tracking and Monitoring System Using QR Code and Dashboard** built with **React 19**, **Vite 8**, and **Supabase**. Designed for Philippine basic and secondary educational institutions with cryptographically signed HMAC-SHA256 QR badge scanning, live analytics, audio/haptic feedback, automated parent summons, geolocation tracking, and SMS alerts.

---

## ✨ Key Features & Capabilities

### 📊 Disciplinary Analytics Dashboard
- Real-time KPI summary cards (Minor, Serious, Major offenses, active sanctions, resolved cases).
- Interactive violation trends area chart with toggleable severity series & date filters (Today / Week / Month / Custom Range).
- Repeat & high-risk students leaderboard with infraction count badges.
- Grade level and strand breakdown with horizontal bar visualizations.
- Integrated school calendar with color-coded event markers and upcoming events panel.
- Executive vector PDF dashboard summary export (`jspdf` + `jspdf-autotable`).

### ⚡ Global Command Palette (`Ctrl + K` / `⌘K`) & Spotlight Navigation
- **Universal Keyboard Command Spotlight**: Instant floating search accessible anywhere in the application via <kbd>Ctrl</kbd> + <kbd>K</kbd> (or <kbd>⌘</kbd> + <kbd>K</kbd> on macOS).
- **Sub-Second Student Dossier Search**: Instant query matching by Student Name, 12-digit LRN, Student ID, or Section with direct dossier routing.
- **Deep System Jump**: Direct navigation across all 11 system modules (Violations Log, QR Scanner, Summons Generator, For Approval, Campus Tracking, etc.).
- **Quick Prefect Actions**: Trigger new violation entries, export accreditation reports, launch the interactive system guide, or lock the session instantly.

### 📷 Live QR Scanner & Tamper-Proof HMAC Badges
- **HMAC-SHA256 Authenticated QR Protocol (`VT2:<student_id>:<timestamp>:<hmac>`)**:
  - Employs cryptographically secure HMAC-SHA256 signature verification to prevent badge forgery.
  - Backward compatible with legacy `VT1` checksum badges.
  - Real-time detection and explicit visual/audio security alerts for forged or altered cryptographic signatures.
  - **Anti-Passback Guard**: Tracks recent scans and alerts prefects if a student ID is re-scanned within 60 seconds.
- **Audio & Haptic Feedback Engine**:
  - 🔔 **Ascending High Chime (`C6 → E6 → B6`)** + Subtle tactile vibration on **Success / Authentic Badge**.
  - ⚠️ **Double Low Buzz (`220Hz / 180Hz`)** + Heavy double vibration on **Invalid / Tampered QR**.
  - Interactive **Feedback Settings Popover** to adjust volume, mute chimes, toggle haptics, and test profiles.
- **Real-Time Camera Scanner (`html5-qrcode`)**: High-framerate optical matrix detection with front/rear camera switcher.
- **Image File Upload Decoder**: Multi-engine canvas preprocessing for low-contrast or rotated photos.
- **1-Click Violation Logging & Student History Modal**: Instant access to infraction logs from scan results.

### 🕒 Institutional 24-Hour Clock & Header Tools
- **Live Tabular Clock (`HH:mm:ss`)**: Synchronized Philippine Standard Time with day/date badges and full locale tooltips.
- **Responsive Header Command Trigger**: OS-aware micro-keycaps (<kbd>Ctrl</kbd> <kbd>K</kbd> / <kbd>⌘</kbd> <kbd>K</kbd>) with smooth elevation and hover states.

### ⚠️ Violation Records & Case Management
- Filterable violation registry (Student name, Student ID, offense category, status, severity, grade, date).
- Dual view modes: **Table View** and **Grid/Card View** with responsive mobile layout.
- **Action Undo Toast Notifications**: 5-second countdown with `↶ Undo` button before permanently committing record updates or deletions.
- Official Parent Summons form generator with scheduled conference details.
- Case resolution modal with clearance notes and celebration confetti.
- CSV and PDF incident report exports with formula injection protection.

### 🎓 Student Directory & ID Card Generation
- Searchable student roster with photo avatars, parent/guardian contacts, and emergency info.
- Printable official Student ID cards with dynamic HMAC-signed QR codes.
- Bulk student roster import via CSV with validation and duplicate prevention.
- Individual student violation detail page with complete infraction history and status tracking.

### 📱 Universal "Save As" & Native Mobile File Explorer
- **Desktop / Web**: Automatic background downloads without modal prompts.
- **Android APK / Mobile**: Interactive Microsoft 365 / Google Drive-inspired Save As file explorer with real device filesystem navigation (`@capacitor/filesystem`), direct folder saving, and native print service integration.

### 🔒 Enterprise Security & Access Control
- **Server-Side Row Level Security (RLS)**: Database-level RBAC policies in PostgreSQL enforcing permissions for Admins, Advisers, and Teachers.
- **Offline Mutation Sync Queue**: Transparent offline caching of violation logs during network outages with auto-sync on reconnect.
- **Inactivity Workstation Lock**: Automatic screen lock after idle periods with PIN/password re-authentication.
- **In-App Privacy & Data-Retention Notice**: Full compliance with the Philippine Data Privacy Act of 2012 (RA 10173) and DepEd Child Protection Policy (DO 40, s. 2012).
- **Public Student ID Verification**: Secure `VerifyStudentPage` confirming enrollment status without leaking confidential disciplinary history.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, React Router 7, Recharts |
| **Build Tool** | Vite 8, Route-level code splitting via `React.lazy` |
| **Styling** | Vanilla CSS (Zero Tailwind), Lucide React icons |
| **Backend & Auth** | Supabase (PostgreSQL + RLS + Realtime) with SWR memory cache |
| **Audio & Haptics** | Web Audio API Synthesizer + HTML5 Audio + Navigator Vibration API |
| **Mobile** | Capacitor 8 (Android APK with native splash screen, filesystem & share) |
| **Testing & Linting** | Vitest, oxlint, GitHub Actions CI |
| **PDF & CSV** | jsPDF + jsPDF-autotable, CSV security sanitization |
| **QR Engine** | html5-qrcode, HMAC-SHA256 cryptographic signature verification |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18+ (Node 20+ recommended)
- npm 9+

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your secrets in `.env`:
```env
# Supabase Database Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Cryptographic QR HMAC Signing Key
VITE_QR_HMAC_SECRET=your-secure-institutional-hmac-secret

# iProgSMS Gateway Configuration (Optional)
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

## 📱 Android Build & Distribution

Android APK builds are compiled via Capacitor and distributed through **GitHub Releases**:

```bash
# Sync web assets to Android project
npm run cap:sync

# Build release APK
npm run build:apk

# Build debug APK
npm run build:debug
```

---

## 📁 Project Structure

```
src/
├── assets/             # Audio sound effects & graphic assets
├── components/         # Modular UI components
│   ├── admin/          # PrintDataModal, ExportDataModal, EditAdminModal
│   ├── common/         # SaveAsModal, CustomTimePicker, SectionSelect, PrivacyNoticeModal, SkeletonLoader, ScreenLockModal
│   ├── layout/         # Top navbar, sidebar navigation, responsive wrappers
│   ├── students/       # AddStudentModal, StudentIdModal, BulkImportModal
│   └── violations/     # AddViolationModal, StatusModal, ResolutionModal, ParentSummonsModal
├── context/            # AuthContext (Inactivity Lock), NotificationContext (Undo Toasts)
├── css/                # Responsive stylesheets (dashboard, scan-qr, violations, print)
├── hooks/              # useKeyboardShortcuts
├── lib/                # Supabase client, schema & supabase-rls-policies.sql
├── pages/              # Route-level pages (Dashboard, ScanQR, Violations, Students, Teachers, Advisers, ActivityLogs, VerifyStudentPage)
├── services/           # DataService, SMSService, offlineSyncQueue, caching & backup routines
└── utils/              # qrHelper (HMAC-SHA256), mobilePrintHelper, scannerFeedback, pdfHelper, csvHelper, security
```

---

## 📄 License

This project is proprietary software developed for educational institutions. All rights reserved.

