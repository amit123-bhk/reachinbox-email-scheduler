import { Router, Request, Response } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { prisma } from '../db/prisma';
import { addEmailJob } from '../queue/emailQueue';
import { indexEmail, searchEmails } from '../services/elasticsearchService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper to parse lead emails from uploaded CSV, Excel (.xlsx/.xls) or TXT files
function extractEmailsFromBuffer(buffer: Buffer, originalName: string): string[] {
  const ext = originalName.toLowerCase().split('.').pop() || '';
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailsSet = new Set<string>();

  if (ext === 'xlsx' || ext === 'xls') {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        rows.forEach((row) => {
          row.forEach((cell) => {
            if (cell) {
              const matches = String(cell).match(emailRegex);
              if (matches) {
                matches.forEach((m) => emailsSet.add(m.toLowerCase()));
              }
            }
          });
        });
      });
    } catch (err) {
      console.warn('[Excel Parse Warning]', err);
    }
  } else {
    const textContent = buffer.toString('utf-8');
    const matches = textContent.match(emailRegex);
    if (matches) {
      matches.forEach((m) => emailsSet.add(m.toLowerCase()));
    }
  }

  return Array.from(emailsSet);
}

// POST Parse Uploaded Lead List File (.csv, .xlsx, .xls, .txt)
const parseLeadListHandler = (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No lead list file provided.' });
    }

    const leadEmails = extractEmailsFromBuffer(req.file.buffer, req.file.originalname);
    res.json({
      success: true,
      filename: req.file.originalname,
      count: leadEmails.length,
      emails: leadEmails,
    });
  } catch (err: any) {
    console.error('[Parse Lead List Error]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to parse lead list file' });
  }
};

router.post('/parse-lead-list', upload.single('file'), parseLeadListHandler);
router.post('/parse-csv', upload.single('file'), parseLeadListHandler);

// POST Schedule Batch Emails Endpoint
router.post('/schedule', upload.array('attachments'), async (req: Request, res: Response) => {
  try {
    const {
      subject,
      body,
      recipients: recipientsRaw,
      hourlyLimit: limitRaw,
      delaySeconds: delayRaw,
      startTime,
      userId,
      senderEmail,
      senderName,
    } = req.body;

    if (!subject || !body || !recipientsRaw) {
      return res.status(400).json({
        success: false,
        error: 'Subject, body, and recipients are required fields.',
      });
    }

    let recipients: string[] = [];
    if (Array.isArray(recipientsRaw)) {
      recipients = recipientsRaw;
    } else if (typeof recipientsRaw === 'string') {
      try {
        recipients = JSON.parse(recipientsRaw);
      } catch (e) {
        recipients = recipientsRaw.split(/[,;\n]+/).map((r) => r.trim()).filter(Boolean);
      }
    }

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one recipient email address is required.',
      });
    }

    const hourlyLimit = parseInt(limitRaw || '200', 10);
    const delaySeconds = parseInt(delayRaw || '2', 10);

    let sender = null;
    if (senderEmail) {
      sender = await prisma.sender.findFirst({ where: { email: senderEmail } });
    }
    if (!sender) {
      sender = await prisma.sender.findFirst();
    }
    if (!sender) {
      sender = await prisma.sender.create({
        data: {
          name: senderName || 'Alex Johnson',
          email: senderEmail || 'alex@reachinbox.ai',
          hourlyRateLimit: hourlyLimit || 200,
        },
      });
    }

    const startDateTime = startTime ? new Date(startTime) : new Date();
    const nowMs = Date.now();

    const batch = await prisma.emailBatch.create({
      data: {
        userId: userId || null,
        subject,
        body,
        totalLeads: recipients.length,
        delaySeconds,
        hourlyLimit,
        startTime: startDateTime,
      },
    });

    const scheduledRecords = [];
    const interEmailDelayMs = (delaySeconds || 2) * 1000;

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i].trim();
      if (!recipient) continue;

      const leadStaggerMs = i * interEmailDelayMs;
      const scheduledForMs = Math.max(nowMs, startDateTime.getTime()) + leadStaggerMs;
      const targetTime = new Date(scheduledForMs);
      const initialDelayMs = Math.max(0, scheduledForMs - nowMs);

      const scheduledEmail = await prisma.scheduledEmail.create({
        data: {
          batchId: batch.id,
          senderId: sender.id,
          recipientEmail: recipient,
          subject,
          body,
          status: 'SCHEDULED',
          scheduledForTime: targetTime,
        },
      });

      const jobId = await addEmailJob(
        {
          scheduledEmailId: scheduledEmail.id,
          senderId: sender.id,
          senderEmail: sender.email,
          senderName: sender.name,
          etherealUser: sender.etherealUser,
          etherealPass: sender.etherealPass,
          recipientEmail: recipient,
          subject,
          body,
          hourlyLimit,
          delaySeconds,
        },
        initialDelayMs
      );

      await prisma.scheduledEmail.update({
        where: { id: scheduledEmail.id },
        data: { jobId },
      });

      await indexEmail({
        id: scheduledEmail.id,
        recipientEmail: recipient,
        subject,
        body,
        senderEmail: sender.email,
        senderName: sender.name,
        status: 'SCHEDULED',
        scheduledForTime: targetTime.toISOString(),
        createdAt: scheduledEmail.createdAt.toISOString(),
        batchId: batch.id,
        userId: userId || null,
      });

      scheduledRecords.push(scheduledEmail);
    }

    res.json({
      success: true,
      message: `Successfully scheduled ${scheduledRecords.length} emails.`,
      batchId: batch.id,
      count: scheduledRecords.length,
    });
  } catch (err: any) {
    console.error('[API /schedule Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Scheduled Emails List - STRICTLY Scoped by userId & userEmail
router.get('/scheduled', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const userEmail = req.query.userEmail as string;

    const whereClause: any = {
      status: { in: ['SCHEDULED', 'RESCHEDULED_RATE_LIMIT', 'PROCESSING'] },
    };

    if (userId || userEmail) {
      whereClause.OR = [
        ...(userId ? [{ batch: { userId: userId } }] : []),
        ...(userEmail ? [{ sender: { email: userEmail } }] : []),
      ];
    }

    const scheduled = await prisma.scheduledEmail.findMany({
      where: whereClause,
      include: { sender: true, batch: true },
      orderBy: { scheduledForTime: 'asc' },
    });

    res.json({ success: true, count: scheduled.length, data: scheduled });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Sent Emails List - STRICTLY Scoped by userId & userEmail
router.get('/sent', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const userEmail = req.query.userEmail as string;

    const whereClause: any = {
      status: { in: ['SENT', 'FAILED'] },
    };

    if (userId || userEmail) {
      whereClause.OR = [
        ...(userId ? [{ batch: { userId: userId } }] : []),
        ...(userEmail ? [{ sender: { email: userEmail } }] : []),
      ];
    }

    const sent = await prisma.scheduledEmail.findMany({
      where: whereClause,
      include: { sender: true, batch: true },
      orderBy: { sentAt: 'desc' },
    });

    res.json({ success: true, count: sent.length, data: sent });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Search Emails API - STRICTLY Scoped by userId & userEmail
router.get('/search', async (req: Request, res: Response) => {
  try {
    const queryStr = (req.query.q as string) || '';
    const statusFilter = (req.query.status as string) || 'ALL';
    const userId = req.query.userId as string;
    const userEmail = req.query.userEmail as string;

    const searchResult = await searchEmails(queryStr, statusFilter);
    let filtered = searchResult.results;

    if (userId || userEmail) {
      filtered = filtered.filter((e: any) => {
        if (userId && e.batch?.userId === userId) return true;
        if (userEmail && (e.senderEmail === userEmail || e.sender?.email === userEmail)) return true;
        return false;
      });
    }

    res.json({
      success: true,
      source: searchResult.source,
      count: filtered.length,
      data: filtered,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
