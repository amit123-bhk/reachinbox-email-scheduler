import nodemailer from 'nodemailer';

export interface SendEmailPayload {
  fromEmail: string;
  fromName: string;
  etherealUser?: string | null;
  etherealPass?: string | null;
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
}

// Cached default ethereal test account
let defaultEtherealAccount: nodemailer.TestAccount | null = null;

async function getDefaultEtherealAccount(): Promise<nodemailer.TestAccount> {
  if (!defaultEtherealAccount) {
    defaultEtherealAccount = await nodemailer.createTestAccount();
    console.log(`[SMTP Ethereal] Created test account: ${defaultEtherealAccount.user}`);
  }
  return defaultEtherealAccount;
}

export async function sendEmailViaEthereal(payload: SendEmailPayload): Promise<SendEmailResult> {
  let user = payload.etherealUser;
  let pass = payload.etherealPass;

  if (!user || !pass) {
    const acc = await getDefaultEtherealAccount();
    user = acc.user;
    pass = acc.pass;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });

  const info = await transporter.sendMail({
    from: `"${payload.fromName}" <${payload.fromEmail}>`,
    to: payload.to,
    subject: payload.subject,
    text: payload.body,
    html: `<div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">${payload.body.replace(/\n/g, '<br/>')}</div>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`[SMTP Ethereal] Sent email to ${payload.to}. MessageId: ${info.messageId}`);
  if (previewUrl) {
    console.log(`[SMTP Ethereal] Preview URL: ${previewUrl}`);
  }

  return {
    messageId: info.messageId,
    previewUrl: previewUrl || false,
  };
}
