import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { getEmailQueue } from '../queue/emailQueue';

const router = Router();

router.get('/dashboard-summary', async (req: Request, res: Response) => {
  try {
    const [scheduledCount, sentCount, failedCount, activeSendersCount] = await Promise.all([
      prisma.scheduledEmail.count({ where: { status: { in: ['SCHEDULED', 'RESCHEDULED_RATE_LIMIT', 'PROCESSING'] } } }),
      prisma.scheduledEmail.count({ where: { status: 'SENT' } }),
      prisma.scheduledEmail.count({ where: { status: 'FAILED' } }),
      prisma.sender.count(),
    ]);

    let queueStats = { waiting: 0, active: 0, delayed: 0, completed: 0, failed: 0 };
    try {
      const queue = getEmailQueue();
      const counts = await queue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed');
      queueStats = counts as any;
    } catch (qErr) {
      console.warn('[Stats] Could not query BullMQ queue counts:', qErr);
    }

    res.json({
      success: true,
      summary: {
        scheduledEmails: scheduledCount,
        sentEmails: sentCount,
        failedEmails: failedCount,
        activeSenders: activeSendersCount,
        queue: queueStats,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
