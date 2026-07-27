export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PAUSED';
export type RecipientStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'BOUNCED';
export type ScheduledEmailStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface EmailSender {
  id: string;
  name: string;
  fromEmail: string;
  isEthereal: boolean;
  maxPerHour: number;
  minDelayMs: number;
}

export interface EmailCampaign {
  id: string;
  title: string;
  subject: string;
  bodyTemplate: string;
  status: CampaignStatus;
  scheduledAt?: string | null;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
  sender?: EmailSender;
}

export interface EmailRecipient {
  id: string;
  campaignId: string;
  email: string;
  metadataJson?: Record<string, unknown>;
  status: RecipientStatus;
  sentAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface ScheduledEmailItem {
  id: string;
  campaignId: string;
  recipientId: string;
  senderId: string;
  status: ScheduledEmailStatus;
  scheduledFor: string;
  jobId?: string | null;
  attempts: number;
  lastError?: string | null;
  sentAt?: string | null;
  createdAt: string;
  recipient?: EmailRecipient;
  campaign?: {
    id: string;
    title: string;
    subject: string;
  };
}

export interface SystemMetrics {
  timestamp: string;
  queue: {
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    completed: number;
  };
  rateLimit?: {
    maxPerHour: number;
    used: number;
    remaining: number;
    resetInMinutes: number;
    resetInMs: number;
  };
  telemetry: {
    sentToday: number;
    failedToday: number;
    totalCampaigns: number;
    processingCampaigns: number;
    totalRecipients: number;
    activeWorkers: number;
    retryCount?: number;
    averageSendTimeMs?: number;
    workerUtilizationPct?: number;
    smtpThroughputPerMin?: number;
  };
}
