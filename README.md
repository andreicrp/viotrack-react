# 🛡️ VioTrack React + Supabase

A modern, responsive, full-featured **Student Violation Tracking & Conduct Management System** built with **React**, **Vite**, and **Supabase**.

---

## ✨ Features

- 📊 **Real-Time Analytics Dashboard**: Real-time KPI counters, violation severity breakdown (Donut chart), and Grade 7–12 incident distribution (Bar chart).
- ⚠️ **Violation Records & Resolution**:
  - Multi-criteria filtering (Student name, LRN, offense, status, severity, grade level).
  - Single & Bulk incident logging with custom sanctions and parent SMS alerts.
  - Resolution modal with case clearance notes and celebration confetti.
- 🎓 **Student Directory & ID Generation**:
  - Searchable student roster with photo avatars and parent emergency contacts.
  - Printable official Student ID cards with dynamic QR codes.
  - CSV bulk roster import with preview.
- 📷 **Live QR Scanner & LRN Lookup**:
  - In-browser camera QR code scanner (`html5-qrcode`) for rapid student identification.
  - Instant violation history lookup and 1-click violation recording.
- 👨‍🏫 **Adviser / My Class Portal**: Dedicated portal for class advisers to monitor their section's conduct and roster.
- 👥 **Faculty & Adviser Assignments**: Manage teaching staff and assign teachers to Grade 7–12 sections.
- 🛡️ **Admin Users & Activity Audit Trail**: Comprehensive timestamped audit logging for all security and incident changes.
- 🖨️ **Export & Reporting**: Instant export of PDF violation reports (`jspdf-autotable`) and printable ID badges.

---

## 🚀 Getting Started

### 1. Start the Development Server

```bash
cd Viotrack_React
npm run dev
```

### 2. Connect Your Supabase Project (Optional)

1. Create a project at [supabase.com](https://supabase.com).
2. Open your Supabase project's **SQL Editor**.
3. Copy the entire contents of [`src/lib/supabase-schema.sql`](src/lib/supabase-schema.sql) and click **Run**.
4. In `Viotrack_React/.env`, update your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
5. Restart your dev server. If left with default placeholders, the application runs on a built-in reactive offline storage engine with full mock seed data so you can test all features immediately!

---

## 🔑 Demo Access Accounts

You can log in using the 1-click Quick Access buttons on the login screen or with these demo profiles:

- **Admin Portal**: `admin@viotrack.edu` (Full administrative privileges)
- **Teacher / Adviser Portal**: `juan.delacruz@viotrack.edu` (Class Adviser for Grade 10 - Rizal)
