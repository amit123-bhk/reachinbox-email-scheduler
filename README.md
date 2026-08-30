# 🚀 ReachInbox - Production-Grade Email Scheduler & Campaign Dashboard

An enterprise-grade, multi-tenant email scheduling service and analytics dashboard built with Next.js, Node.js/Express, TypeScript, Prisma (SQLite/PostgreSQL), Redis, BullMQ, and Elasticsearch.

---

## 📌 Architecture Overview

### 1. How Scheduling Works
- **Delayed Jobs in BullMQ**: When a user submits an email batch, each lead recipient is scheduled as a delayed job in BullMQ (`scheduled-emails` queue).
- **Delay Calculation**: BullMQ computes the execution delay based on `scheduledTime + (leadIndex * delaySeconds)`.
- **Database Tracking**: Each email is persisted to the database (`ScheduledEmail` table) with status `SCHEDULED` and mapped to the tenant `userId`.

### 2. How Persistence on Server Restart is Handled
- **Redis Queue State**: BullMQ stores all scheduled jobs, delayed timers, and retry attempts directly inside Redis. If the Express backend server or worker process crashes or restarts, active jobs remain intact in Redis.
- **DB Recovery & Worker Synchronization**: On server startup, the system queries Prisma DB for any pending `SCHEDULED` emails and reconciles missing Redis jobs to ensure **zero lost emails**.

### 3. How Rate Limiting & Concurrency are Implemented
- **Concurreny Control**: BullMQ worker runs with configurable concurrency (`CONCURRENCY=5`), processing 5 worker threads in parallel.
- **Hourly Rate Limiting**: Enforced dynamically per sender account via Redis sliding window counters (`MAX_EMAILS_PER_HOUR=200`). If a sender hits their limit, emails are automatically delayed to the next hourly window.
- **Inter-Email Delay**: Controlled via configurable delay parameters (`MIN_DELAY_BETWEEN_EMAILS_MS=2000`) preventing spam flags or SMTP rate rejections.

---

## ⚙️ Setup & Installation Instructions

### Prerequisites
- Node.js `v18+`
- Redis server running on `localhost:6379` (or Docker `docker run -d -p 6379:6379 redis`)

---

### 1. Backend Setup

```bash
cd backend
npm install
```

#### Environment Configuration (`backend/.env`):
```env
PORT=4000
DATABASE_URL="file:./dev.db"

# Redis Config
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Throttling & Limiting
CONCURRENCY=5
MIN_DELAY_BETWEEN_EMAILS_MS=2000
MAX_EMAILS_PER_HOUR=200

# Ethereal SMTP Mail Config
ETHEREAL_USER=mock_user@ethereal.email
ETHEREAL_PASS=mock_password

# Google OAuth Credentials
GOOGLE_CLIENT_ID=524611453858-4v6egr9k7ma8lu36dv8gfmtihukmigtk.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

#### Initialize Database & Run Backend:
```bash
npx prisma db push
npm start
```
- **Backend API**: `http://localhost:4000`
- **BullMQ Live Queue Dashboard**: `http://localhost:4000/admin/queues`

---

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
- **Frontend Dashboard**: `http://localhost:3000`

---

### 3. Setting Up Ethereal Email Credentials
1. Go to [https://ethereal.email/create](https://ethereal.email/create) to generate a free test SMTP account.
2. Copy your **User** and **Password** into `backend/.env`:
   ```env
   ETHEREAL_USER="your_ethereal_user@ethereal.email"
   ETHEREAL_PASS="your_ethereal_password"
   ```
3. Sent emails can be inspected live in your Ethereal Webmail inbox!

---

## ✨ Features Implemented

### 🖥️ Frontend (Next.js 14 + Tailwind CSS + Lucide Icons)
- **Google OAuth 2.0 & Email Auth**: Production Google Sign-In & Sign-Up flow matching Figma design.
- **Multi-Tenant Data Isolation**: Users only see campaigns and emails created by their account.
- **Compose New Email**:
  - Full-width interactive compose interface with Figma-aligned styling.
  - **Interactive Rich Text Toolbar**: Live Bold, Italic, Underline, Lists, Alignment, Links, Undo/Redo.
  - **Lead List File Upload**: Supports uploading `.csv`, `.xlsx`, `.xls`, and `.txt` files with regex lead extraction.
  - **Send Later Drawer**: Presets (Tomorrow 10am, 11am, 3pm) & custom date-time picker.
- **Scheduled & Sent Emails Dashboard**:
  - Live status badges (`SCHEDULED`, `SENT`, `FAILED`).
  - Instant client-side search filtering across lead emails, subject lines, and email bodies.
- **Modern Toastify Notifications**: Non-intrusive dark glassmorphic toast notifications for all system events.

### ⚙️ Backend (Express + Prisma + BullMQ + Redis)
- **Email Scheduler Engine**: Asynchronous job queue processing using Redis & BullMQ.
- **Server Restart Recovery**: Zero data loss persistence across server restarts.
- **Multi-Format Lead List Parser**: Backend parsing for Excel (`.xlsx`, `.xls`), CSV, and TXT lead files.
- **Sliding Window Rate Limiting**: Per-sender hourly limit and inter-email delay throttling.
- **Ethereal Mail Delivery & Fallback**: Automatic delivery logging with Ethereal SMTP preview links.

---

## 📽️ Demo Video Guide (Max 5 Minutes)

When recording your video submission, follow this simple checklist:

1. **Creating Scheduled Emails (1 min)**:
   - Open `http://localhost:3000`, log in with Google / Email.
   - Click **Compose**, upload a lead list (`sample_lead_list.csv` or `.xlsx`), fill subject/body, and pick a schedule time in **Send Later**.
   - Show the success toast!
2. **Dashboard Views (1 min)**:
   - Click **Scheduled** tab to view your queued email batch.
   - Use the search bar to filter scheduled emails instantly.
3. **Server Restart Scenario (1.5 min)**:
   - Stop the backend server process (`Ctrl+C` in terminal).
   - Show that BullMQ jobs remain safely stored in Redis.
   - Restart the server (`npm start`).
   - Show that scheduled emails send cleanly when their time arrives and move to the **Sent** tab!
4. **Rate Limiting & Queue Monitor (1 min)**:
   - Open `http://localhost:4000/admin/queues` to display live BullMQ worker threads, delays, and rate limiting metrics.

---

## 📝 Assumptions, Shortcuts & Trade-offs

- **Development Storage**: Uses SQLite via Prisma for easy zero-config local evaluation. Can be switched to PostgreSQL by updating `DATABASE_URL` and provider in `prisma/schema.prisma`.
- **Ethereal Test SMTP**: Uses Ethereal Mail for zero-cost safe SMTP sandbox testing without requiring real domain DNS warmup.
- **Client-Side Lead List Fallback**: Added a browser-side `FileReader` fallback to ensure lead emails populate instantly even if offline.
