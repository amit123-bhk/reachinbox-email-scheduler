import { WebClient } from '@slack/web-api';
import { prisma } from '../db/prisma';

export interface RateLimitAlertPayload {
  senderEmail: string;
  senderName: string;
  hourlyLimit: number;
  currentCount: number;
  nextAvailableTime: string;
}

export async function notifySlackRateLimit(payload: RateLimitAlertPayload): Promise<boolean> {
  try {
    const activeIntegrations = await prisma.slackIntegration.findMany({
      where: { isEnabled: true },
    });

    if (!activeIntegrations || activeIntegrations.length === 0) {
      console.log(`[Slack Notification] No active Slack integration found. Skipping notification for ${payload.senderEmail}.`);
      return false;
    }

    const messageText = `⚠️ *[ReachInbox Alert] Hourly Rate Limit Hit!* 🚀\n` +
      `• *Sender:* ${payload.senderName} (<mailto:${payload.senderEmail}|${payload.senderEmail}>)\n` +
      `• *Hourly Limit:* ${payload.hourlyLimit} emails/hour\n` +
      `• *Status:* Limit reached (${payload.currentCount}/${payload.hourlyLimit}). Remaining jobs are automatically rescheduled to preserve delivery order.\n` +
      `• *Next Available Window:* ${payload.nextAvailableTime}\n` +
      `_No emails dropped. Queue state persistent._`;

    let sentAny = false;

    for (const integration of activeIntegrations) {
      if (integration.webhookUrl) {
        try {
          const res = await fetch(integration.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: messageText,
              blocks: [
                {
                  type: 'header',
                  text: {
                    type: 'plain_text',
                    text: '⚠️ Hourly Email Rate Limit Reached',
                    emoji: true,
                  },
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*Sender:* ${payload.senderName} (\`${payload.senderEmail}\`)\n*Hourly Limit:* ${payload.hourlyLimit} emails/hr\n*Next Available Window:* ${payload.nextAvailableTime}`,
                  },
                },
                {
                  type: 'context',
                  elements: [
                    {
                      type: 'mrkdwn',
                      text: '⚡ *ReachInbox Scheduler*: BullMQ queue automatically postponed remaining emails into the next hourly window without dropping any jobs.',
                    },
                  ],
                },
              ],
            }),
          });
          if (res.ok) {
            console.log(`[Slack Notification] Successfully delivered rate limit alert to Webhook URL.`);
            sentAny = true;
          } else {
            console.error(`[Slack Notification] Failed to post to Slack webhook: ${res.statusText}`);
          }
        } catch (webhookErr) {
          console.error(`[Slack Notification] Webhook request error:`, webhookErr);
        }
      } else if (integration.botToken) {
        try {
          const slackClient = new WebClient(integration.botToken);
          const channel = integration.channelName || '#general';
          await slackClient.chat.postMessage({
            channel,
            text: messageText,
          });
          console.log(`[Slack Notification] Successfully delivered rate limit alert to channel ${channel} via Bot Token.`);
          sentAny = true;
        } catch (botErr) {
          console.error(`[Slack Notification] Bot API message error:`, botErr);
        }
      }
    }

    return sentAny;
  } catch (err) {
    console.error('[Slack Notification] Error evaluating rate limit Slack dispatch:', err);
    return false;
  }
}
