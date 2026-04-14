import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const DEFAULT_SMTP_HOST = 'smtp-relay.brevo.com';
const DEFAULT_SMTP_PORT = 587;
const DEFAULT_SMTP_USER = 'a814c9001@smtp-brevo.com';
const BREVO_API_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

function resolveDefaultKeyFilePath() {
  return path.resolve(process.cwd(), '..', 'documentation', 'smtp-key.txt');
}

function resolveDefaultBrevoApiKeyPath() {
  return path.resolve(process.cwd(), '..', 'documentation', 'api-key.txt');
}

function resolveSmtpPassword() {
  const envPass = String(process.env.SMTP_PASS ?? '').trim();
  if (envPass) {
    return envPass;
  }

  const keyFilePath = String(process.env.SMTP_PASS_FILE ?? resolveDefaultKeyFilePath()).trim();
  if (!keyFilePath) {
    return '';
  }

  try {
    return fs.readFileSync(keyFilePath, 'utf8').trim();
  } catch {
    return '';
  }
}

function resolveBrevoApiKey() {
  const envApiKey = String(process.env.BREVO_API_KEY ?? '').trim();
  if (envApiKey) {
    return envApiKey;
  }

  const keyFilePath = String(process.env.BREVO_API_KEY_FILE ?? resolveDefaultBrevoApiKeyPath()).trim();
  if (!keyFilePath) {
    return '';
  }

  try {
    const key = fs.readFileSync(keyFilePath, 'utf8').trim();
    return key.startsWith('xkeysib-') ? key : '';
  } catch {
    return '';
  }
}

function getSmtpConfig() {
  const host = String(process.env.SMTP_HOST ?? DEFAULT_SMTP_HOST).trim();
  const port = Number(process.env.SMTP_PORT ?? DEFAULT_SMTP_PORT);
  const user = String(process.env.SMTP_USER ?? DEFAULT_SMTP_USER).trim();
  const pass = resolveSmtpPassword();
  const secure = String(process.env.SMTP_SECURE ?? '').trim().toLowerCase() === 'true';

  if (!host || !Number.isFinite(port) || !user || !pass) {
    throw new Error('SMTP configuration is incomplete');
  }

  const auth = { user, pass };
  return { host, port, secure, auth };
}

function getFromAddress() {
  const fromAddress = String(process.env.SMTP_FROM ?? '').trim();
  if (fromAddress) {
    return fromAddress;
  }
  return process.env.SMTP_USER || DEFAULT_SMTP_USER;
}

async function sendVerificationEmailViaBrevoApi({ to, username, verifyUrl }) {
  const apiKey = resolveBrevoApiKey();
  if (!apiKey) {
    return false;
  }

  const safeUsername = String(username ?? '').trim() || 'builder';
  const from = getFromAddress();
  const payload = {
    sender: {
      name: 'Lego Collection Manager',
      email: from
    },
    to: [{ email: String(to).trim(), name: safeUsername }],
    subject: 'Verify your LEGO account email',
    textContent: `Hi ${safeUsername},\n\nPlease verify your email by opening this link:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
    htmlContent: `<p>Hi ${safeUsername},</p><p>Please verify your email by opening this link:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`
  };

  const response = await fetch(BREVO_API_ENDPOINT, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo API send failed (${response.status}): ${body}`);
  }

  const data = await response.json().catch(() => ({}));
  const messageId = String(data?.messageId ?? '').trim();
  console.info('[email] Brevo API verification email sent', {
    to: String(to),
    messageId: messageId || null
  });

  return true;
}

export async function sendVerificationEmail({ to, username, verifyUrl }) {
  try {
    const sentByApi = await sendVerificationEmailViaBrevoApi({ to, username, verifyUrl });
    if (sentByApi) {
      return;
    }
  } catch (error) {
    console.error('[email] Brevo API send failed, falling back to SMTP:', error?.message || error);
  }

  const safeUsername = String(username ?? '').trim() || 'builder';
  const transporter = nodemailer.createTransport(getSmtpConfig());
  const result = await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject: 'Verify your LEGO account email',
    text: `Hi ${safeUsername},\n\nPlease verify your email by opening this link:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
    html: `<p>Hi ${safeUsername},</p><p>Please verify your email by opening this link:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`
  });
  console.info('[email] SMTP verification email sent', {
    to: String(to),
    messageId: result?.messageId ?? null,
    response: result?.response ?? null
  });
}
