import { Queue } from 'bullmq';
import { getRedisOptions } from '../services/redisService';

export const EMAIL_QUEUE_NAME = 'email-queue';

export interface EmailJobData {
  scheduledEmailId: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  etherealUser?: string | null;
  etherealPass?: string | null;
  recipientEmail: string;
  subject: string;
  body: string;
  hourlyLimit: number;
  delaySeconds: number;
}

let emailQueue: Queue | null = null;

export function getEmailQueue(): Queue {
  if (!emailQueue) {
    const opts = getRedisOptions();
    console.log(`[BullMQ Queue] Initializing queue '${EMAIL_QUEUE_NAME}' on ${opts.host}:${opts.port}`);
    emailQueue = new Queue(EMAIL_QUEUE_NAME, {
      connection: {
        host: opts.host,
        port: opts.port,
        password: opts.password,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 86400 * 7 },
      },
    });
  }
  return emailQueue;
}

export async function addEmailJob(data: EmailJobData, delayMs: number): Promise<string> {
  const queue = getEmailQueue();
  const job = await queue.add('send-email', data, {
    delay: Math.max(0, delayMs),
    jobId: data.scheduledEmailId,
  });
  return job.id!;
}
