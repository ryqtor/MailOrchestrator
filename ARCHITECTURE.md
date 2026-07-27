# MailOrchestrator - System Architecture & Technical Specifications

This document outlines the engineering architecture, concurrency design, idempotency model, rate limiting algorithm, and worker monitoring strategy of **MailOrchestrator**.

---

## 1. High-Level System Architecture Diagram

```mermaid
graph TD
    Client["Next.js 15 Frontend (Google OAuth)"]
    API["Express REST API Service (Clean Arch)"]
    DB[("PostgreSQL DB (Source of Truth)")]
    Redis[("Redis (BullMQ & Atomic Counters)")]
    Worker1["BullMQ Email Worker Node 1"]
    Worker2["BullMQ Email Worker Node 2"]
    SMTP["Nodemailer Transporter (SMTP / Ethereal)"]

    Client -->|HTTP REST / Cookies| API
    API -->|Prisma ORM Queries & Status Locks| DB
    API -->|Enqueue Delayed / Batch Jobs| Redis
    Worker1 -->|Poll & Pop Jobs| Redis
    Worker2 -->|Poll & Pop Jobs| Redis
    Worker1 -->|Atomic Status Lock PENDING->PROCESSING| DB
    Worker2 -->|Atomic Status Lock PENDING->PROCESSING| DB
    Worker1 -->|Check Hourly Rate Limit (INCR)| Redis
    Worker2 -->|Check Hourly Rate Limit (INCR)| Redis
    Worker1 -->|Dispatch Outbound Mail| SMTP
    Worker2 -->|Dispatch Outbound Mail| SMTP
    Worker1 -->|Update State to SENT| DB
    Worker2 -->|Update State to SENT| DB
```

---

## 2. Campaign & Job Lifecycle Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Dashboard
    participant API as Express API
    participant DB as PostgreSQL
    participant Producer as BullMQ Job Producer
    participant Redis as Redis Store
    participant Worker as BullMQ Worker
    participant Limiter as Redis Rate Limiter
    participant SMTP as SMTP / Ethereal

    User->>API: POST /campaigns/upload (CSV + Template)
    API->>API: Parse CSV (separate valid and invalid rows)
    API->>DB: Insert Campaign & bulk insert Recipient rows
    API->>DB: Insert ScheduledEmail rows (Status: PENDING)
    API->>Producer: Schedule batch jobs into BullMQ
    Producer->>Redis: Enqueue jobs (opts: delay, attempts=3)
    API->>User: 201 Created (Campaign Processing + Invalid Rows Download)

    loop Asynchronous Worker Execution
        Worker->>Redis: Pop job (emailId, senderId, campaignId)
        Worker->>DB: ATOMIC LOCK: UPDATE ScheduledEmail SET status='PROCESSING' WHERE id=emailId AND status='PENDING'
        alt Lock failed (count == 0)
            DB-->>Worker: Lock failed (Already claimed)
            Worker-->>Redis: Ack job as no-op (Database-backed Idempotency Protection)
        else Lock acquired (count == 1)
            Worker->>Limiter: INCR ratelimit:sender:{senderId}:window:{hour}
            alt Limit Exceeded (> MAX_EMAILS_PER_HOUR)
                Limiter-->>Worker: Limit reached (delayMs)
                Worker->>DB: Revert status to PENDING
                Worker->>Producer: Reschedule job with delayMs in BullMQ
                Worker->>DB: Log RATE_LIMITED event
            else Allowed
                Worker->>Worker: Render template body with recipient metadata
                Worker->>SMTP: sendMail(from, to, subject, body)
                SMTP-->>Worker: Success (messageId)
                Worker->>DB: UPDATE ScheduledEmail SET status='SENT', sentAt=now()
                Worker->>DB: UPDATE EmailRecipient SET status='SENT'
                Worker->>DB: INCREMENT EmailCampaign sentCount
                Worker->>DB: Log EMAIL_SENT audit trail
            end
        end
    end
```

---

## 3. Entity-Relationship (ER) Model Diagram

```mermaid
erDiagram
    USER ||--o{ EMAIL_SENDER : owns
    USER ||--o{ EMAIL_CAMPAIGN : creates
    EMAIL_SENDER ||--o{ EMAIL_CAMPAIGN : sends_with
    EMAIL_CAMPAIGN ||--o{ EMAIL_RECIPIENT : contains
    EMAIL_CAMPAIGN ||--o{ SCHEDULED_EMAIL : schedules
    EMAIL_RECIPIENT ||--o{ SCHEDULED_EMAIL : targeted_by
    EMAIL_CAMPAIGN ||--o{ EMAIL_LOG : records

    USER {
        string id PK
        string email UK
        string name
        string avatarUrl
        string googleId UK
    }

    EMAIL_SENDER {
        string id PK
        string name
        string fromEmail
        int maxPerHour
        int minDelayMs
    }

    EMAIL_CAMPAIGN {
        string id PK
        string title
        string subject
        string bodyTemplate
        string status
        int totalRecipients
        int sentCount
        int failedCount
    }

    EMAIL_RECIPIENT {
        string id PK
        string campaignId FK
        string email
        json metadataJson
        string status
    }

    SCHEDULED_EMAIL {
        string id PK
        string campaignId FK
        string recipientId FK
        string status
        datetime scheduledFor
        string jobId UK
        int attempts
    }

    EMAIL_LOG {
        string id PK
        string campaignId FK
        string eventType
        json detailsJson
    }
```

---

## 4. Database-backed Idempotency Protection

In distributed email worker clusters, duplicate job execution can occur due to worker crashes or network timeouts. MailOrchestrator enforces **Database-backed Idempotency Protection**:

```typescript
const result = await prisma.scheduledEmail.updateMany({
  where: {
    id: emailId,
    status: ScheduledEmailStatus.PENDING, // Conditional status check
  },
  data: {
    status: ScheduledEmailStatus.PROCESSING, // Atomic state transition
    attempts: { increment: 1 },
  },
});

if (result.count === 0) {
  // Lock failed: another worker node or retry attempt already claimed/sent this email.
  return { status: 'skipped_duplicate' };
}
```

---

## 5. Redis Atomic Rate Limiting Algorithm

- **Key Format**: `ratelimit:sender:{senderId}:window:{hourTimestamp}`
- **Atomic Counter**: Uses Redis `INCR` to track outbound emails sent within the current hour window.
- **Window Reset Calculation**:
  $$\text{DelayMs} = \text{NextHourTimestamp} - \text{CurrentTime}$$
- When a worker encounters an over-limit counter (`currentCount > maxPerHour`), it reverts DB status to `PENDING` and enqueues a delayed job in BullMQ scheduled for $\text{DelayMs}$ into the future, preserving order without dropping jobs.
