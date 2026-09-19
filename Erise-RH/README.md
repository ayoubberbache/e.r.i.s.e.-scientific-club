# ERISE-RH — Human Resources Desktop Platform

A standalone desktop application for the **ERISE Scientific Club** (Higher National School of Renewable Energies, Batna) built with **Electron + React 19 + Vite + TypeScript + Tailwind CSS + Framer Motion + Supabase Realtime**.

---

## Key Features

1. **50% Baseline Evaluation Engine**:
   - Every club member starts at an objective **50.0% baseline rating**.
   - **Workshops & Bootcamps Attendance**: Synchronized with `attendance_logs` (+5.0% per Present session, -5.0% per unexcused absence).
   - **Department Task Completion**: Projects, Organization, and Media tasks award +5.0% upon verification.
   - **HR Appraisals**: Evaluates Punctuality, Teamwork, Initiative, and Quality of Deliverables (-10% to +10% per category).
   - Dynamic tier classification:
     - **Exceptional**: $\ge 85\%$
     - **Solid Standing**: $65\% - 84\%$
     - **Baseline Active**: $45\% - 64\%$
     - **Needs Improvement**: $< 45\%$

2. **Real-Time Club Activity Ticker**:
   - Live Supabase `postgres_changes` subscriptions on `registrations`, `event_registrations`, `projects`, and `attendance_logs`.
   - Native OS desktop push notifications via Electron IPC.
   - Built-in Web Audio API notification chime.
   - Test simulator for instant preview of alerts without waiting for live external submissions.

3. **Tasks & HR Point Allocation**:
   - Centralized review of tasks from Projects, Organization, and Media.
   - 1-click **"Award +5% to Assignees"** button.

4. **Attendance Log Verification**:
   - Real-time audit of check-in records submitted by the Projects Department during technical workshops and bootcamps.

5. **Intake Candidate Review**:
   - Screen pending applicant submissions with motivation statements, skills, and academic year.
   - 1-click Approve or Decline.

6. **Design & UX**:
   - Strictly **zero emojis** — clean Lucide SVG icons.
   - Dark minimal theme matching the club palette: `#0a1628` background, `#0f213e` cards, `#1e293b` borders, subtle `#00e5ff` cyan highlights.
   - Framer Motion page and modal transitions.

---

## Launching the Desktop Application

### Option 1: 1-Click Launch (Windows)
Double-click `launch-rh.bat` in the root project folder.

### Option 2: Command Line
```bash
cd Erise-RH
npm start
```

### Development Mode:
```bash
cd Erise-RH
npm run dev
```
And in another terminal:
```bash
cd Erise-RH
npx electron . --dev
```
