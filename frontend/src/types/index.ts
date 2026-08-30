export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface Sender {
  id: string;
  name: string;
  email: string;
  hourlyRateLimit: number;
}

export interface ScheduledEmailItem {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: 'SCHEDULED' | 'RESCHEDULED_RATE_LIMIT' | 'PROCESSING' | 'SENT' | 'FAILED';
  scheduledForTime: string;
  sentAt?: string;
  etherealPreviewUrl?: string;
  errorMessage?: string;
  createdAt: string;
  sender?: Sender;
  senderEmail?: string;
  senderName?: string;
}

export interface StatsSummary {
  scheduledEmails: number;
  sentEmails: number;
  failedEmails: number;
  activeSenders: number;
  queue: {
    waiting: number;
    active: number;
    delayed: number;
    completed: number;
    failed: number;
  };
}

export interface SlackStatus {
  connected: boolean;
  type?: 'webhook' | 'oauth';
  channel?: string;
  connectedAt?: string;
}
