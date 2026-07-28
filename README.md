# MailOrchestrator — Production-Grade Email Job Scheduler & Operations Console

> **ReachInbox.ai Full-Stack Internship Assignment Submission**
> A production-grade email scheduler service and operations dashboard that accepts email campaigns via API, schedules them using BullMQ delayed jobs (no cron), sends emails via Ethereal/Gmail SMTP, survives server restarts without duplicating jobs, and exposes a full-featured Next.js dashboard.

---

## Live Deployment

| Service | URL |
| :--- | :--- |
| **Frontend (Vercel)** | [https://mail-orchestrator.vercel.app](https://mail-orchestrator.vercel.app) |
| **Backend API (Railway)** | [https://mailorchestrator-production.up.railway.app](https://mailorchestrator-production.up.railway.app) |

---

## Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Features Implemented](#-features-implemented)
- [How Scheduling Works (No Cron)](#-how-scheduling-works-no-cron)
- [Persistence Across Server Restarts](#-persistence-across-server-restarts)
- [Rate Limiting & Concurrency Architecture](#-rate-limiting--concurrency-architecture)
- [Behavior Under Load (1000+ Emails)](#-behavior-under-load-1000-emails)
- [Environment Variables Setup](#-environment-variables-setup)
- [Getting Started](#-getting-started)
- [Ethereal Email Setup](#-ethereal-email-setup)
- [Demo Video Script](#-demo-video-script)
- [Trade-offs & Assumptions](#-trade-offs--assumptions)

---

##  Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                 │
│                                                                     │
│   Next.js 15 Dashboard (App Router)                                │
│   ├── Google OAuth 2.0 Login (Clerk)                               │
│   ├── Compose Email (CSV Upload + Paste + Template Variables)      │
│   ├── Scheduled Emails Table (Live 3s Polling)                     │
│   ├── Sent Emails Table (Live 3s Polling)                          │
│   ├── Campaign Pipeline View                                       │
│   └── Redis Rate Limit Capacity Panel (Real-Time)                  │
│                                                                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ REST API (JSON)
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API LAYER                                    │
│                                                                     │
│   Express.js + TypeScript                                          │
│   ├── POST /api/campaigns         → Create campaign + enqueue jobs │
│   ├── POST /api/campaigns/upload  → CSV file upload endpoint       │
│   ├── GET  /api/campaigns         → List all campaigns             │
│   ├── GET  /api/campaigns/:id     → Campaign detail + recipients   │
│   ├── GET  /api/emails/scheduled  → Pending email queue            │
│   ├── GET  /api/emails/sent       → Delivered email archive        │
│   ├── GET  /api/metrics           → System telemetry + rate limits │
│   ├── POST /api/senders           → Configure SMTP sender          │
│   └── GET  /api/health            → Health check                   │
│                                                                     │
└───────┬─────────────────────┬───────────────────────┬───────────────┘
        │                     │                       │
        ▼                     ▼                       ▼
┌───────────────┐   ┌─────────────────┐     ┌─────────────────────┐
│  PostgreSQL   │   │  BullMQ Queue   │     │   Redis Store       │
│  (Prisma ORM) │   │  (Delayed Jobs) │     │   (Rate Counters)   │
│               │   │                 │     │                     │
│  • Campaigns  │   │  • Sorted Set   │     │  • INCR/DECR atomic │
│  • Recipients │   │    by timestamp │     │    hourly window    │
│  • Sched.Email│   │  • 3 retries    │     │    counters         │
│  • Email Logs │   │  • Exp backoff  │     │  • Per-sender keys  │
│  • Workers    │   │  • Persistence  │     │  • Auto TTL cleanup │
└───────┬───────┘   └────────┬────────┘     └──────────┬──────────┘
        │                    │                         │
        └────────────────────┼─────────────────────────┘
                             │
                             ▼
              ┌───────────────────────────┐
              │   BullMQ Email Workers    │
              │                           │
              │  1. Claim Lock (DB)       │
              │  2. Rate Limit Check      │
              │  3. Template Rendering    │
              │  4. SMTP Dispatch         │
              │  5. Status Transition     │
              │  6. Audit Log Entry       │
              └─────────────┬─────────────┘
                            │ SMTP Protocol
                            ▼
              ┌───────────────────────────┐
              │   Ethereal / Gmail SMTP   │
              │   (Sandbox or Real)       │
              └───────────────────────────┘
```

---

##  Tech Stack

### Backend
| Technology | Purpose |
| :--- | :--- |
| **TypeScript** | Type-safe backend language |
| **Express.js** | REST API framework |
| **BullMQ** | Persistent delayed job queue (backed by Redis) — **No cron jobs** |
| **PostgreSQL** | Relational database (source of truth) |
| **Prisma ORM** | Type-safe database access and migrations |
| **Redis** | BullMQ job persistence + atomic rate limit counters |
| **Nodemailer** | SMTP email dispatch (Ethereal + Gmail App Password) |
| **Pino** | Structured JSON logging |
| **Zod** | Runtime environment variable validation |

### Frontend
| Technology | Purpose |
| :--- | :--- |
| **Next.js 15** | React framework (App Router) |
| **React 19** | UI library |
| **TypeScript** | Type-safe frontend |
| **Tailwind CSS** | Utility-first CSS framework |
| **TanStack React Query v5** | Server state management with 3-second live polling |
| **Clerk** | Google OAuth 2.0 authentication |
| **Lucide React** | Icon library |

### Infrastructure
| Technology | Purpose |
| :--- | :--- |
| **Docker Compose** | Local development orchestration (Postgres + Redis + Backend + Worker + Frontend) |
| **Vercel** | Frontend production hosting |
| **Railway** | Backend + Redis production hosting |

---

##  Project Structure

```
MailOrchestrator/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma              # Database schema (7 models)
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts                 # Zod-validated environment config
│   │   │   └── redis.ts              # ioredis connection with retry strategy
│   │   ├── controllers/
│   │   │   ├── campaign.controller.ts # Campaign CRUD + CSV upload
│   │   │   ├── email.controller.ts    # Scheduled/Sent email queries
│   │   │   ├── health.controller.ts   # Health check + system metrics
│   │   │   └── sender.controller.ts   # SMTP sender configuration
│   │   ├── db/
│   │   │   └── prisma.ts             # Prisma client singleton
│   │   ├── errors/
│   │   │   └── customErrors.ts       # Typed error classes
│   │   ├── logger/
│   │   │   └── logger.ts             # Pino structured logger
│   │   ├── middleware/
│   │   │   └── errorHandler.middleware.ts
│   │   ├── queue/
│   │   │   ├── queueManager.ts       # BullMQ Queue singleton + metrics
│   │   │   └── jobProducer.ts        # Job enqueue + bulk scheduling
│   │   ├── repositories/
│   │   │   ├── campaign.repository.ts
│   │   │   ├── recipient.repository.ts
│   │   │   ├── scheduledEmail.repository.ts
│   │   │   └── user.repository.ts
│   │   ├── routes/
│   │   │   ├── campaign.routes.ts
│   │   │   ├── email.routes.ts
│   │   │   ├── health.routes.ts
│   │   │   └── sender.routes.ts
│   │   ├── services/
│   │   │   ├── email.service.ts       # Nodemailer SMTP dispatch + template engine
│   │   │   ├── metrics.service.ts     # System telemetry aggregator
│   │   │   ├── rateLimiter.service.ts # Redis atomic hourly rate limiting
│   │   │   └── recovery.service.ts    # Server restart job recovery
│   │   ├── validators/
│   │   │   └── campaign.validator.ts  # Zod request validation
│   │   ├── workers/
│   │   │   ├── emailWorker.ts        # BullMQ worker processor
│   │   │   └── workerHealth.ts       # Worker heartbeat monitor
│   │   ├── app.ts                     # Express app factory
│   │   └── server.ts                  # Server bootstrap + graceful shutdown
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                   # Main Dashboard (Scheduled + Sent tables)
│   │   ├── compose/page.tsx           # Compose Email (CSV + paste + template)
│   │   ├── campaigns/page.tsx         # Campaign pipeline list
│   │   ├── campaigns/[id]/page.tsx    # Campaign detail + recipient table
│   │   ├── emails/scheduled/page.tsx  # Scheduled Emails dedicated view
│   │   ├── emails/sent/page.tsx       # Sent Emails dedicated view
│   │   ├── metrics/page.tsx           # System metrics dashboard
│   │   ├── settings/page.tsx          # SMTP sender configuration
│   │   ├── sign-in/page.tsx           # Google OAuth login page
│   │   ├── layout.tsx                 # Root layout with ClerkProvider
│   │   └── globals.css                # Tailwind + design tokens
│   ├── components/
│   │   ├── auth/
│   │   │   └── GoogleLoginModal.tsx   # Google OAuth + reviewer quick-access
│   │   ├── campaigns/
│   │   │   └── CreateCampaignModal.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx             # Navigation + user profile + logout
│   │   │   └── Sidebar.tsx            # Sidebar navigation
│   │   └── ui/                        # Reusable UI primitives
│   ├── lib/
│   │   └── api.ts                     # Type-safe API client layer
│   ├── types/
│   │   └── index.ts                   # Shared TypeScript interfaces
│   ├── middleware.ts                   # Clerk auth middleware
│   ├── Dockerfile
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── docker-compose.yml                 # Full-stack local orchestration
└── README.md
```

---

## Features Implemented

### Backend Features (Mapped to Assignment Requirements)

| # | Requirement | Implementation | Status |
| :---: | :--- | :--- | :---: |
| 1 | **No Cron Jobs** | Pure BullMQ delayed jobs with `addBulk()`. Delay calculated as `scheduledFor.getTime() - Date.now()`. Redis sorted set stores jobs by execution timestamp. | ✅ |
| 2 | **Relational DB Storage** | PostgreSQL with Prisma ORM. 7 models: `User`, `EmailSender`, `EmailCampaign`, `EmailRecipient`, `ScheduledEmail`, `EmailLog`, `WorkerState`. | ✅ |
| 3 | **Email Scheduling via API** | `POST /api/campaigns` accepts title, subject, bodyTemplate, recipients array, scheduledAt, minDelayMs, maxPerHour. Also supports CSV upload via `POST /api/campaigns/upload`. | ✅ |
| 4 | **Ethereal Email (Fake SMTP)** | Nodemailer Ethereal transporter auto-generates test accounts. Preview URLs logged for each sent email. Also supports real Gmail SMTP with App Password. | ✅ |
| 5 | **Server Restart Persistence** | `RecoveryService` runs on boot: (a) resets stale `PROCESSING` → `PENDING`, (b) verifies each `PENDING` email has active BullMQ job, (c) re-enqueues missing jobs at exact target timestamp. Zero duplicates, zero lost emails. | ✅ |
| 6 | **Idempotency Guarantee** | Atomic DB claim lock: `UPDATE ScheduledEmail SET status='PROCESSING' WHERE id=? AND status='PENDING'`. Returns `count > 0` for exactly one worker to proceed. | ✅ |
| 7 | **Worker Concurrency** | Configurable via `WORKER_CONCURRENCY` env var (default: 5). BullMQ worker processes N jobs in parallel. Atomic DB claims ensure safety across concurrent workers. | ✅ |
| 8 | **Min Delay Between Sends** | Configurable `minDelayMs` (default: 2000ms = 2 seconds). Redis tracks `last_sent` timestamp per sender. Worker applies spacing delay when consecutive sends are too fast. | ✅ |
| 9 | **Hourly Rate Limiting (Per-Sender)** | Redis atomic `INCR` counter keyed by `ratelimit:sender:{senderId}:window:{hourTimestamp}`. Auto-expiring TTL (2 hours). When limit exceeded: decrements counter, calculates delay to next window, reschedules job via BullMQ without dropping. | ✅ |
| 10 | **Multiple Senders** | `EmailSender` model supports multiple SMTP configurations per user. Each sender has independent rate limits and credentials. Configurable via Settings page. | ✅ |
| 11 | **Graceful Rate Limit Behavior** | Over-limit jobs are delayed to the next hourly window, not dropped or failed. Job order is preserved. Audit log records `RATE_LIMITED` events with delay duration. | ✅ |

### Frontend Features (Mapped to Assignment Requirements)

| # | Requirement | Implementation | Status |
| :---: | :--- | :--- | :---: |
| 1 | **Google OAuth Login** | Clerk-powered Google OAuth 2.0. After login, redirects to dashboard. Header shows user name, email, avatar, and logout button. | ✅ |
| 2 | **Main Dashboard** | Header with user info + logout. Tabbed sections for Scheduled/Sent emails. "Compose New Email" primary button. Redis rate limit capacity panel with real-time counters. | ✅ |
| 3 | **Compose New Email** | Full compose modal + dedicated `/compose` page. Subject, body with `{{name}}`, `{{company}}` template variables. CSV file upload with validation. Paste recipient list. Start time picker. Configurable delay and hourly cap. Live template preview. | ✅ |
| 4 | **Scheduled Emails Table** | Table showing recipient email, campaign title, subject, scheduled time, status badge, job attempts. Loading spinner. Empty state with CTA. 3-second live polling. | ✅ |
| 5 | **Sent Emails Table** | Table showing recipient email, campaign title, sent timestamp, status badge (SENT/FAILED). Loading spinner. Empty state. 3-second live polling. | ✅ |
| 6 | **Clean Folder Structure** | Feature-based component organization: `components/auth/`, `components/campaigns/`, `components/layout/`, `components/ui/`. Shared `lib/api.ts` and `types/index.ts`. | ✅ |
| 7 | **TypeScript Types** | Full TypeScript with interfaces for all API responses, component props, and state. `types/index.ts` defines `EmailCampaign`, `ScheduledEmailItem`, `SystemMetrics`. | ✅ |
| 8 | **UX Quality** | Loading spinners on all data fetches. Empty states with descriptive messages. Error toasts on API failures. Smooth transitions and hover effects. | ✅ |

### Bonus Features

| Feature | Description |
| :--- | :--- |
| **Campaign Pipeline View** | `/campaigns` page showing all campaigns with progress bars, status badges, and drill-down to individual recipient statuses |
| **System Metrics Dashboard** | `/metrics` page showing queue depth, worker count, throughput, retry count, and SMTP latency |
| **SMTP Settings Page** | `/settings` page to configure sender SMTP credentials with connection test and Quick Gmail Setup presets |
| **CSV Validation** | Client-side CSV parser that validates email format, detects column headers, and allows downloading invalid rows |
| **Live Template Preview** | Real-time preview of email body with template variables resolved using sample recipient data |
| **Audit Logging** | Every email lifecycle event (SCHEDULED, SENT, FAILED, RETRY, RATE_LIMITED) is logged to `EmailLog` table |
| **Docker Compose** | One-command full-stack setup: `docker-compose up --build` |
| **Reviewer Quick Access** | Pre-populated reviewer accounts (Mitrajit Lead, Sarvagya Chaudhary) for instant sign-in during review |

---

## How Scheduling Works

This system uses **zero cron jobs** — no `node-cron`, no `crontab`, no `agenda`. All scheduling is done through **BullMQ delayed jobs backed by Redis**.

### Step-by-Step Flow

```
User submits campaign → API validates → DB records created → BullMQ jobs enqueued → Redis waits → Worker fires at exact time
```

1. **Campaign Creation** (`POST /api/campaigns`):
   - Validates request payload with Zod schema
   - Creates `EmailCampaign` record in PostgreSQL
   - Creates `EmailRecipient` records for each lead
   - Creates `ScheduledEmail` records with `status: PENDING`

2. **Job Enqueuing** (`jobProducer.scheduleEmailJobs()`):
   - For each recipient, calculates BullMQ delay:
     ```
     delay = max(scheduledFor.getTime() - Date.now(), 0) + (index * minDelayMs)
     ```
   - Calls `emailQueue.addBulk()` to enqueue all jobs atomically
   - Each job has a unique `jobId` stored in `ScheduledEmail.jobId` for dedup

3. **Redis Storage**:
   - BullMQ stores delayed jobs in a Redis sorted set, scored by execution timestamp
   - Redis polls the sorted set and promotes jobs to the "waiting" state when their timestamp arrives

4. **Worker Processing** (`emailWorker.processJob()`):
   - Claims job via atomic DB update (`PENDING → PROCESSING`)
   - Checks per-sender hourly rate limit (Redis counter)
   - Renders template variables (`{{name}}`, `{{company}}`, `{{email}}`)
   - Dispatches email via SMTP (Ethereal or Gmail)
   - Transitions status to `SENT` and creates audit log entry

---

##  Persistence Across Server Restarts

### How It Works

If the server crashes or restarts while emails are scheduled for the future:

1. **Redis retains all delayed jobs** — BullMQ jobs are stored in Redis sorted sets and survive Node.js process restarts.

2. **Recovery Service runs on boot** (`recovery.service.ts`):
   ```
   Server starts → RecoveryService.recoverPendingJobs() runs automatically
   ```
   
   The recovery service performs two critical operations:
   
   - **Step 1: Reset stale jobs** — Any `ScheduledEmail` stuck in `PROCESSING` status for more than 60 seconds (indicating a mid-processing crash) is reset back to `PENDING`.
   
   - **Step 2: Verify queue integrity** — For each `PENDING` email, checks if a corresponding BullMQ job exists in Redis. If the job is missing (e.g., Redis was cleared), re-enqueues it at the exact original target timestamp.

3. **Guarantees**:
   - ✅ Future scheduled emails still send at the correct time
   - ✅ No emails are re-sent or duplicated (unique `jobId` prevents duplicate enqueue)
   - ✅ System does not restart from Day 1 — only pending/orphaned jobs are recovered

---

##  Rate Limiting & Concurrency Architecture

### 1. Worker Concurrency

- **Config**: `WORKER_CONCURRENCY` environment variable (default: `5`)
- BullMQ worker instantiated with `concurrency: env.WORKER_CONCURRENCY`
- Supports multiple parallel job executions safely
- **Multi-worker safety**: Atomic DB claim lock (`UPDATE WHERE status='PENDING'`) ensures exactly one worker processes each email, even with multiple Node instances

### 2. Minimum Delay Between Emails

- **Config**: `minDelayMs` per sender (default: `2000` ms = 2 seconds between sends)
- Implementation: Redis key `ratelimit:sender:{senderId}:last_sent` tracks the timestamp of the last email sent
- If elapsed time since last send < `minDelayMs`, worker applies an in-process delay before sending
- Mimics real SMTP provider throttling (Gmail, SendGrid, etc.)

### 3. Hourly Rate Limiting (Per-Sender, Redis-Backed)

- **Config**: `maxPerHour` per sender (default: `500`)
- **Redis Counter Key**: `ratelimit:sender:{senderId}:window:{currentHourTimestamp}`
- **Algorithm**:

```
1. Worker calls rateLimiterService.checkAndIncrement(senderId, maxPerHour)
2. Redis INCR atomically increments the hourly counter
3. If counter > maxPerHour:
   a. Redis DECR rolls back the increment
   b. Calculate: delayMs = nextHourTimestamp - now
   c. Reschedule job via jobProducer.rescheduleJob(data, delayMs)
   d. Reset ScheduledEmail status back to PENDING
   e. Log RATE_LIMITED event to EmailLog audit table
4. If counter <= maxPerHour:
   a. Proceed with email dispatch
   b. Apply minDelayMs spacing if needed
```

- **Key Properties**:
  - Counters are **per-sender** (not global), supporting multi-sender deployments
  - Redis `INCR`/`DECR` is **atomic** and safe across multiple workers/instances
  - Counter auto-expires via `PEXPIRE` (2-hour TTL) for self-cleaning
  - Over-limit jobs are **delayed, not dropped** — they reschedule to the next available window
  - Job order is preserved as much as possible

---

##  Behavior Under Load (1000+ Emails)

When 1000+ emails are scheduled for roughly the same time:

1. **BullMQ enqueues all jobs** with staggered delays (`index * minDelayMs`):
   - Email #0: delay 0ms
   - Email #1: delay 2000ms
   - Email #2: delay 4000ms
   - ...and so on

2. **Worker processes `WORKER_CONCURRENCY` jobs in parallel** (default: 5 concurrent)

3. **Rate limiter enforces hourly cap**:
   - With `maxPerHour=500`: first 500 emails send in the current hour
   - Remaining 500+ emails are automatically rescheduled to the next hourly window
   - No jobs are dropped or permanently failed

4. **Idempotency claim lock** ensures no duplicate sends even under high concurrency

5. **Estimated throughput** with default settings:
   - 5 concurrent workers × 1 email every 2 seconds = ~150 emails/minute
   - Capped by hourly limit: 500/hour per sender

---

## Environment Variables Setup

### Backend (`backend/.env`)

Create a `.env` file in the `backend/` directory:

```env
# Server
NODE_ENV=development
PORT=5000

# Database (PostgreSQL connection string)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mailorchestrator?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your_jwt_secret_key_here

# Worker Configuration
WORKER_CONCURRENCY=5
DEFAULT_MAX_EMAILS_PER_HOUR=500
DEFAULT_MIN_DELAY_MS=100
```

### Frontend (`frontend/.env.local`)

Create a `.env.local` file in the `frontend/` directory:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Clerk Authentication (get keys from https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
```

---

##  Getting Started

### Option 1: Docker Compose (Recommended)

Start all services (PostgreSQL, Redis, Backend, Worker, Frontend) with one command:

```bash
git clone https://github.com/ryqtor/MailOrchestrator.git
cd MailOrchestrator
docker-compose up --build
```

| Service | URL |
| :--- | :--- |
| Frontend Dashboard | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### Option 2: Manual Local Setup

#### Prerequisites
- Node.js 18+
- PostgreSQL running on port 5432
- Redis running on port 6379

#### Step 1: Backend

```bash
cd backend
npm install
cp .env.example .env    # Edit with your database credentials
npx prisma generate      # Generate Prisma client
npx prisma db push       # Push schema to database
npm run dev              # Start API server on port 5000
```

#### Step 2: Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local    # Edit with your API URL
npm run dev                          # Start Next.js on port 3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📧 Ethereal Email Setup

[Ethereal Email](https://ethereal.email/) is a fake SMTP service for testing — emails are captured and viewable via web preview links instead of being delivered to real inboxes.

### How It Works in MailOrchestrator

1. When no real SMTP sender is configured, the system **automatically generates an Ethereal test account** on first email dispatch.
2. Ethereal credentials are logged in the backend console.
3. Each sent email generates an **Ethereal preview URL** — click it to view the rendered email in your browser.

### Configuring a Sender

1. Navigate to **Settings** (`/settings`) in the dashboard.
2. Choose one of:
   - **Ethereal (Sandbox)**: Toggle "Use Ethereal" — no credentials needed, auto-generated.
   - **Gmail App Password**: Enter your Gmail address and a 16-character [Google App Password](https://myaccount.google.com/apppasswords).
3. Click **Test Connection** to verify SMTP connectivity.
4. Click **Save Sender** to persist the configuration.

### Gmail App Password Quick Guide

1. Go to [Google Account → App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" as the app and generate a password
3. Copy the 16-character password (spaces are auto-stripped by the system)
4. Enter it in the Settings page SMTP Password field

---

