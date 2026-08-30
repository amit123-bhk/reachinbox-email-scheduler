import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobData, getEmailQueue } from './emailQueue';
import { getRedisOptions } from '../services/redisService';
import { checkAndIncrementRateLimit } from '../services/rateLimiterService';
import { sendEmailViaEthereal } from '../services/smtpService';
import { indexEmail } from '../services/elasticsearchService';
import { prisma } from '../db/prisma';
import { config } from '../config/env';

let worker: Worker | null = null;

export function initEmailWorker() {
  const opts = getRedisOptions();
  console.log(`[BullMQ Worker] Connecting worker to Redis at ${opts.host}:${opts.port}`);

  worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const {
        scheduledEmailId,
        senderId,
        senderEmail,
        senderName,
        etherealUser,
        etherealPass,
        recipientEmail,
        subject,
        body,
        hourlyLimit,
        delaySeconds,
      } = job.data;

      console.log(`[Worker] Processing Job ${job.id} for recipient: ${recipientEmail}`);

      // 1. Minimum Throttling Delay
      const interEmailDelayMs = Math.max(config.minDelayBetweenEmailsMs, (delaySeconds || 0) * 1000);
      if (interEmailDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, interEmailDelayMs));
      }

      // 2. Check Hourly Rate Limit (Redis counter)
      const limitResult = await checkAndIncrementRateLimit(senderId, senderEmail, senderName, hourlyLimit);

      if (!limitResult.allowed) {
        const delayUntilNextWindowMs = Math.max(1000, limitResult.nextWindowStart.getTime() - Date.now());
        console.warn(
          `[Worker] Sender ${senderEmail} reached hourly limit (${limitResult.currentCount}/${hourlyLimit}). Rescheduling job ${job.id} into next hour window (${limitResult.nextWindowStart.toISOString()}) in ${Math.round(delayUntilNextWindowMs / 1000)}s.`
        );

        // Update DB status
        await prisma.scheduledEmail.update({
          where: { id: scheduledEmailId },
          data: {
            status: 'RESCHEDULED_RATE_LIMIT',
            scheduledForTime: limitResult.nextWindowStart,
          },
        });

        // Re-enqueue job delayed to next window start
        const queue = getEmailQueue();
        const newJobId = `${scheduledEmailId}_rescheduled_${Date.now()}`;
        await queue.add('send-email', job.data, {
          delay: delayUntilNextWindowMs,
          jobId: newJobId,
        });

        return { status: 'RESCHEDULED', nextWindowStart: limitResult.nextWindowStart };
      }

      // 3. Mark DB as PROCESSING
      await prisma.scheduledEmail.update({
        where: { id: scheduledEmailId },
        data: { status: 'PROCESSING', attempts: { increment: 1 } },
      });

      // 4. Send Email via Fake SMTP (Ethereal Email)
      try {
        const sendResult = await sendEmailViaEthereal({
          fromEmail: senderEmail,
          fromName: senderName,
          etherealUser,
          etherealPass,
          to: recipientEmail,
          subject,
          body,
        });

        const sentAt = new Date();

        // 5. Update DB as SENT
        const updatedEmail = await prisma.scheduledEmail.update({
          where: { id: scheduledEmailId },
          data: {
            status: 'SENT',
            sentAt,
            etherealMessageId: sendResult.messageId,
            etherealPreviewUrl: sendResult.previewUrl || undefined,
          },
          include: { sender: true },
        });

        // 6. Index in Elasticsearch
        await indexEmail({
          id: updatedEmail.id,
          recipientEmail: updatedEmail.recipientEmail,
          subject: updatedEmail.subject,
          body: updatedEmail.body,
          senderEmail: updatedEmail.sender?.email,
          senderName: updatedEmail.sender?.name,
          status: 'SENT',
          scheduledForTime: updatedEmail.scheduledForTime.toISOString(),
          sentAt: sentAt.toISOString(),
          etherealPreviewUrl: sendResult.previewUrl || undefined,
          createdAt: updatedEmail.createdAt.toISOString(),
        });

        return {
          status: 'SENT',
          messageId: sendResult.messageId,
          previewUrl: sendResult.previewUrl,
        };
      } catch (err: any) {
        console.error(`[Worker] Error sending email for job ${job.id}:`, err);

        await prisma.scheduledEmail.update({
          where: { id: scheduledEmailId },
          data: {
            status: 'FAILED',
            errorMessage: err.message || 'SMTP Send Failed',
          },
        });

        throw err;
      }
    },
    {
      connection: {
        host: opts.host,
        port: opts.port,
        password: opts.password,
      },
      concurrency: config.concurrency,
    }
  );

  worker.on('completed', (job: Job) => {
    console.log(`[Worker Event] Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`[Worker Event] Job ${job?.id} failed with error:`, err);
  });

  console.log(`[Worker] BullMQ Worker started on ${opts.host}:${opts.port} with concurrency = ${config.concurrency}`);
  return worker;
}

export async function stopEmailWorker() {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
