# ReachInbox Full-Stack Email Job Scheduler & Operations Console 🚀

A production-grade, highly scalable email scheduler service and internal operations dashboard built for **ReachInbox.ai**.

This service allows users to compose, schedule, and send emails at scale with reliable delayed queue processing using **BullMQ + Redis**, atomic database-backed idempotency, per-sender rate limiting, configurable worker concurrency, server restart persistence recovery, and an elegant operations dashboard matching Figma guidelines.

---

## 📋 Table of Contents
- [Architecture Overview](#-architecture-overview)
- [Tech Stack](#-tech-stack)
- [Features Checklist](#-features-checklist)
- [How Scheduling & Persistence Work](#-how-scheduling--persistence-work)
- [Rate Limiting & Concurrency Architecture](#-rate-limiting--concurrency-architecture)
- [Environment Variables](#-environment-variables)
- [Getting Started](#-getting-started)
- [Demo Video & Test Scenarios](#-demo-video--test-scenarios)

---

## 🏗 Architecture Overview

```
                          ┌───────────────────────────┐
                          │   Next.js 15 Dashboard    │
                          │   (Google OAuth + UI)     │
                          └─────────────┬─────────────┘
                                        │ API Requests
                                        ▼
                          ┌───────────────────────────┐
                          │   Express.js API Service  │
                          └─────────────┬─────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             │                          │                          │
             ▼                          ▼                          ▼
  ┌───────────────────┐      ┌────────────────────┐      ┌───────────────────┐
  │ PostgreSQL / MySQL│      │  BullMQ Queue      │      │ Redis Store       │
  │ (Source of Truth) │      │  (Delayed Jobs)    │      │ (Hourly Counters) │
  └──────────┬────────┘      └──────────┬─────────┘      └─────────┬─────────┘
             │                          │                          │
             └──────────────────────────┼──────────────────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │   BullMQ Email Workers    │
                          │ (Idempotency Claim Lock)  │
                          └─────────────┬─────────────┘
                                        │ SMTP Protocol
                                        ▼
                          ┌───────────────────────────┐
                          │   Ethereal Fake SMTP      │
                          │   (Message Sandbox)       │
                          └───────────────────────────┘
```

---

## 🧪 Tech Stack

### Backend
- **Language**: TypeScript
- **Framework**: Express.js
- **Queue System**: BullMQ (backed by Redis) — *No OS cron or node-cron libraries*
- **Database**: PostgreSQL / MySQL (Prisma ORM)
- **SMTP Provider**: Ethereal Email (fake SMTP testing sandbox with preview links)

### Frontend
- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS + Warm Editorial Design System (`#FAF8F5` paper canvas, font-serif headings, `#A34A22` burnt-orange accents)
- **State Management & Live Sync**: TanStack React Query v5

---

## ✅ Features Checklist

### Backend Requirements
| Feature | Implementation | Status |
| :--- | :--- | :---: |
| **No Cron Jobs** | Pure BullMQ delayed jobs (`addBulk` with target timestamp delay score in Redis) | ✅ Complete |
| **Relational DB Storage** | PostgreSQL / MySQL database with Prisma ORM storing campaigns, recipients, and scheduled emails | ✅ Complete |
| **Server Restart Persistence** | Redis persistent job queue + `RecoveryService` scanning DB on boot to enqueue any pending/unhandled jobs without duplicates | ✅ Complete |
| **Idempotency Guarantee** | Row-level atomic claim (`UPDATE ScheduledEmail WHERE status = 'PENDING' SET status = 'PROCESSING'`) preventing double sends | ✅ Complete |
| **Worker Concurrency** | Configurable worker node concurrency level (`WORKER_CONCURRENCY`) handling parallel execution safely | ✅ Complete |
| **Throttling / Minimum Delay** | Configurable minimum delay (`minDelayMs`, default 2 seconds) enforced per send | ✅ Complete |
| **Hourly Rate Limiting** | Redis atomic `INCR` counter per sender hour window (`ratelimit:sender:{id}:window:{timestamp}`) | ✅ Complete |
| **Graceful Delay Under Load** | When hourly limit reached, jobs are delayed to the next available hour window without losing jobs | ✅ Complete |

### Frontend Requirements
| Feature | Implementation | Status |
| :--- | :--- | :---: |
| **Google Login** | Google OAuth 2.0 Sign In with header displaying user name, email, avatar, and logout option | ✅ Complete |
| **Main Dashboard** | Header, exposed Redis rate limiter capacity panel, active campaign pipeline, and tabbed view | ✅ Complete |
| **Compose New Email** | Modal dialog & dedicated page with Subject, Body, lead CSV upload parser, start time, delay, and hourly cap | ✅ Complete |
| **Scheduled Emails Table** | Table/list showing recipient email, subject/campaign, scheduled time, status, loading spinner, and empty state | ✅ Complete |
| **Sent Emails Table** | Table/list showing recipient email, subject/campaign, sent timestamp, status badge, loading spinner, and empty state | ✅ Complete |

---

## ⚙️ How Scheduling & Persistence Work

### 1. Scheduling (No Cron)
When a user submits an email campaign:
1. The campaign and its recipient rows are saved into PostgreSQL/MySQL.
2. For each recipient, a `ScheduledEmail` DB record is created with `status: PENDING`.
3. BullMQ `queueManager.emailQueue.addBulk()` enqueues jobs with calculated delay:
   $$\text{delay} = \max(\text{scheduledFor.getTime()} - \text{Date.now()}, 0)$$
4. Redis stores the delayed job in a sorted set keyed by execution timestamp.

### 2. Persistence Across Server Restarts
- If the Express server or container restarts while emails are scheduled for the future:
  1. Redis retains all delayed jobs in its persistent sorted set.
  2. On server boot, `RecoveryService.recoverPendingJobs()` runs automatically:
     - Scans for any `ScheduledEmail` records stuck in `PROCESSING` from an unexpected crash and resets them to `PENDING`.
     - Verifies whether each `PENDING` email has an active BullMQ job in Redis.
     - If missing, enqueues the job back into BullMQ at its exact target time.
  3. No emails are re-sent, restarted from Day 1, or duplicated.

---

## ⚡ Rate Limiting & Concurrency Architecture

### 1. Worker Concurrency
- `WORKER_CONCURRENCY` env variable configures how many jobs each worker thread processes simultaneously (e.g. `WORKER_CONCURRENCY=5`).
- Multi-worker safe: Database atomic updates (`claimForSending`) ensure only one worker claims a job even when running multiple node instances.

### 2. Minimum Spacing Delay
- Configurable delay between sends (e.g. `minDelayMs=2000` = 2 seconds).
- Mimics SMTP provider throttling.

### 3. Hourly Rate Limit (Per Sender)
- Configurable `MAX_EMAILS_PER_HOUR` (or per-sender limit).
- Redis atomic `INCR` window counter: `ratelimit:sender:{senderId}:window:{currentHourTimestamp}`.
- When `currentCount > maxPerHour`:
  1. The worker decrements counter back.
  2. Calculates time remaining until next hourly window:
     $$\text{delayUntilNextWindow} = \text{nextHourTimestamp} - \text{now}$$
  3. Reschedules the job using `jobProducer.rescheduleJob(job.data, delayUntilNextWindow)`.
  4. Preserves job order without failing or dropping jobs.

---

## 🔑 Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development

# Database Connection (PostgreSQL or MySQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mail_orchestrator?schema=public"

# Redis Connection
REDIS_HOST=localhost
REDIS_PORT=6379

# Queue & Worker Settings
WORKER_CONCURRENCY=5
DEFAULT_MIN_DELAY_MS=2000
DEFAULT_MAX_PER_HOUR=500

# JWT Auth Secret
JWT_SECRET=super_secret_reachinbox_key_2026

# Google OAuth Client ID (Optional for GSI popup)
GOOGLE_CLIENT_ID=your_google_client_id_here
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
```

---

## 🚀 Getting Started

### Option 1: Using Docker Compose (Recommended)

Start Redis, PostgreSQL, Backend, and Frontend in containers:
```bash
docker-compose up --build
```
- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`

### Option 2: Local Manual Setup

#### Step 1: Start Redis & Database
Ensure Redis (port 6379) and PostgreSQL/MySQL (port 5432) are running.

#### Step 2: Run Backend
```bash
cd backend
npm install
npx prisma db push
npm run dev
```

#### Step 3: Run Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 🎥 Demo Video Guide (Max 5 Minutes)

When recording your submission video, showcase the following steps:
1. **Google OAuth Sign In**:
   - Click "Google OAuth Login" in the header. Select Google account profile (or custom Google email) and demonstrate header profile update (Avatar, Name, Email, Logout).
2. **Compose & Schedule Email**:
   - Click "Compose New Email". Upload recipient CSV (or paste leads).
   - Set start time, min delay (e.g. 2s), and hourly limit. Click "Schedule Campaign".
3. **View Dashboard Tables**:
   - Click "Scheduled Emails" tab to show pending/delayed jobs with status badges.
   - Wait for dispatch and view "Sent Emails" tab showing delivered status with Ethereal SMTP message IDs.
4. **Server Restart Persistence Demo**:
   - Schedule emails for 1 minute in the future.
   - Stop backend server process (`Ctrl + C`).
   - Start backend server again (`npm run dev`).
   - Show logs printing `[RecoveryService] Server restart recovery check completed`.
   - Verify future emails send at the exact scheduled time without duplicates.
5. **Rate Limit / Delay Under Load Demo**:
   - Create a campaign with `maxPerHour=2` and min delay `2s`.
   - Schedule 5 emails. Observe first 2 emails send, and subsequent 3 emails automatically move to `DELAYED` status with exact countdown until next window.
