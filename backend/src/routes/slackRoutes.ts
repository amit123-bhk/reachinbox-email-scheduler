import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { notifySlackRateLimit } from '../services/slackService';
import { config } from '../config/env';

const router = Router();

// GET Slack Status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const integration = await prisma.slackIntegration.findFirst({
      where: { isEnabled: true },
      orderBy: { connectedAt: 'desc' },
    });

    if (integration) {
      return res.json({
        success: true,
        connected: true,
        type: integration.webhookUrl ? 'webhook' : 'oauth',
        channel: integration.channelName || '#general',
        connectedAt: integration.connectedAt,
      });
    }

    return res.json({ success: true, connected: false });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Connect Slack Webhook directly
router.post('/connect-webhook', async (req: Request, res: Response) => {
  try {
    const { webhookUrl, channelName } = req.body;
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return res.status(400).json({ success: false, error: 'Valid Slack Webhook URL is required.' });
    }

    // Disable existing integrations
    await prisma.slackIntegration.updateMany({
      data: { isEnabled: false },
    });

    const integration = await prisma.slackIntegration.create({
      data: {
        webhookUrl,
        channelName: channelName || '#outreach-alerts',
        isEnabled: true,
      },
    });

    res.json({ success: true, message: 'Slack Webhook connected successfully.', integration });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// OAuth Redirect authorization URL generator
router.get('/auth-url', (req: Request, res: Response) => {
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${config.slack.clientId}&scope=incoming-webhook,chat:write&redirect_uri=${encodeURIComponent(
    config.slack.redirectUri
  )}`;
  res.json({ success: true, authUrl: slackAuthUrl });
});

// OAuth Callback handler
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('OAuth Code Missing');
    }

    // If Slack Client credentials exist, exchange code for token
    if (config.slack.clientId && config.slack.clientSecret) {
      const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.slack.clientId,
          client_secret: config.slack.clientSecret,
          code: code as string,
          redirect_uri: config.slack.redirectUri,
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.ok) {
        await prisma.slackIntegration.create({
          data: {
            botToken: tokenData.access_token,
            webhookUrl: tokenData.incoming_webhook?.url,
            channelName: tokenData.incoming_webhook?.channel,
            teamName: tokenData.team?.name,
            isEnabled: true,
          },
        });
        return res.redirect('http://localhost:3000?slack=connected');
      }
    }

    // Fallback demo mock connect for local testing
    await prisma.slackIntegration.create({
      data: {
        channelName: '#reachinbox-alerts',
        isEnabled: true,
      },
    });

    return res.redirect('http://localhost:3000?slack=connected');
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Disconnect Slack
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    await prisma.slackIntegration.updateMany({
      data: { isEnabled: false },
    });
    res.json({ success: true, message: 'Slack integration disconnected.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Trigger Test Slack Notification
router.post('/test', async (req: Request, res: Response) => {
  try {
    const sent = await notifySlackRateLimit({
      senderEmail: 'alex.johnson@outbox.ai',
      senderName: 'Alex Johnson (Test)',
      hourlyLimit: 50,
      currentCount: 50,
      nextAvailableTime: new Date(Date.now() + 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    if (sent) {
      return res.json({ success: true, message: 'Test Slack rate-limit alert sent successfully!' });
    } else {
      return res.status(400).json({
        success: false,
        error: 'No active Slack connection found. Please connect a Slack Webhook or OAuth token first.',
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
