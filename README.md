# MailOrchestrator 🚀

**MailOrchestrator** is a production-grade, highly scalable email campaign orchestration microservice and internal operations console designed for ReachInbox.

Built for SaaS applications handling automated email dispatches at scale, it features CSV ingestion, invalid row reporting, live template previewing, BullMQ delayed job processing, Redis atomic rate-limiting, PostgreSQL database-backed idempotency locks, and a Swiss editorial design system inspired by Notion, Raycast, and Superhuman.

---

## 🛠 Architecture Overview

```
Frontend (Next.js 15 + React Query)
      │
      ▼
Express API Service (Clean Architecture)
      │
      ├────────► PostgreSQL DB (Source of Truth)
      │
      ▼
BullMQ Job Producer
      │
      ▼
Redis Queue & Rate Limit Store
      │
      ▼
BullMQ Email Workers (Idempotent locks)
      │
      ▼
Nodemailer SMTP Transporter (Ethereal Sandbox)
```

---

## 🧪 Tech Requirements

### Backend
- **Language**: TypeScript
- **Framework**: Express.js
- **Queue**: BullMQ (backed by Redis)
- **Database**: PostgreSQL 16 (Prisma ORM)
- **SMTP**: Ethereal Email (fake SMTP test sandbox with auto web preview links)

### Frontend
- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: Light Editorial Theme (`#FAF8F5` paper canvas, IBM Plex Serif headings, Plus Jakarta Sans body, Burnt Orange `#A34A22` accents)
- **State & Telemetry**: TanStack React Query v5 (polling live telemetry)

---

## ✨ Features Implemented

### Backend
- **No Cron Jobs**: Scheduling executed purely via BullMQ delayed jobs backed by Redis.
- **Server Restart Persistence**: Scheduled emails persist in PostgreSQL and Redis. Restarting the server does not lose jobs or restart from Day 1.
- **Database-backed Idempotency Protection**: Enforces row-level atomic status locks (`PENDING` $\rightarrow$ `PROCESSING`) before calling Nodemailer.
- **CSV Parsing & Invalid Row Exporter**: Parses valid recipient rows and categorizes invalid rows (missing/malformed emails) with line numbers and reasons.
- **Configurable Rate Limiting & Concurrency**: Support for worker concurrency, custom `minDelayMs` between emails, and per-sender `maxPerHour` hourly caps.
- **Worker Health Monitoring**: Worker processes ping heartbeat state to PostgreSQL every 15 seconds.

### Frontend
- **Google OAuth Login Bar**: Header displays user avatar, name, email, and a functional Logout option.
- **Operations Overview (`/`)**: Exposed Rate Limit Capacity Panel (`Max Limit`, `Used`, `Remaining`, `Reset Countdown`), Pipeline Stage Visualizer, and Execution Timeline Stream.
- **Campaign Builder (`/compose`)**: Notion-style document composition view, CSV file upload & text paste zone with valid/invalid contact breakdown, **Invalid CSV Row Exporter** (`.csv` download), **Live Interactive Template Previewer**, and estimated execution duration math.
- **Execution Queue (`/emails/scheduled`)**: High-density table tracking pending and delayed queue items with status chips, loading skeletons, and empty state views.
- **Delivery Archive (`/emails/sent`)**: Audit log of sent emails.
- **Campaign Execution Timeline (`/campaigns/[id]`)**: Step-by-step chronological log stream (`Campaign Created` $\rightarrow$ `Recipients Imported` $\rightarrow$ `BullMQ Enqueued` $\rightarrow$ `Worker Started` $\rightarrow$ `Rate Limited` $\rightarrow$ `Window Resumed` $\rightarrow$ `Completed`).

---

## 🚀 Quick Start Guide

### Option 1: Docker Compose (Recommended)

```bash
docker-compose up --build
```

Access the applications:
- **Next.js Dashboard**: `http://localhost:3000`
- **Express Backend API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/health`
- **Metrics Telemetry**: `http://localhost:5000/metrics`

### Option 2: Local Development

```bash
# Backend
cd backend
npm install
npx prisma db push
npm run dev

# Frontend (in separate terminal)
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.
