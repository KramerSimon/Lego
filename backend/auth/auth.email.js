import nodemailer from 'nodemailer';
import fs from 'fs';
import env from '../config/env.js';

const BREVO_API_ENDPOINT = env.brevoApiEndpoint;

function resolveSmtpPassword() {
  const envPass = String(env.smtpPass ?? '').trim();
  if (envPass) {
    return envPass;
  }

  const keyFilePath = String(env.smtpPassFile ?? '').trim();
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
  const envApiKey = String(env.brevoApiKey ?? '').trim();
  if (envApiKey) {
    return envApiKey;
  }

  const keyFilePath = String(env.brevoApiKeyFile ?? '').trim();
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
  const host = String(env.smtpHost ?? '').trim();
  const port = Number(env.smtpPort);
  const user = String(env.smtpUser ?? '').trim();
  const pass = resolveSmtpPassword();
  const secure = Boolean(env.smtpSecure);

  if (!host || !Number.isFinite(port) || !user || !pass) {
    throw new Error('SMTP configuration is incomplete');
  }

  const auth = { user, pass };
  return { host, port, secure, auth };
}

function getFromAddress() {
  const fromAddress = String(env.smtpFrom ?? '').trim();
  if (fromAddress) {
    return fromAddress;
  }
  return 'noreply@legobrickbuilder.it';
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

async function sendMailViaBrevoApi({ to, username, subject, textContent, htmlContent, logTag }) {
  const apiKey = resolveBrevoApiKey();
  if (!apiKey) {
    return false;
  }

  const safeUsername = String(username ?? '').trim() || 'builder';
  const from = getFromAddress();
  const resolvedText = String(textContent ?? '').replaceAll('{username}', safeUsername);
  const resolvedHtml = String(htmlContent ?? '').replaceAll('{username}', safeUsername);
  const payload = {
    sender: {
      name: 'Lego Collection Manager',
      email: from
    },
    to: [{ email: String(to).trim(), name: safeUsername }],
    subject,
    textContent: resolvedText,
    htmlContent: resolvedHtml
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
  console.info(`[email] Brevo API ${logTag} email sent`, {
    to: String(to),
    messageId: messageId || null
  });

  return true;
}

async function sendMailViaSmtp({ to, username, subject, textContent, htmlContent, logTag }) {
  const safeUsername = String(username ?? '').trim() || 'builder';
  const transporter = nodemailer.createTransport(getSmtpConfig());
  const result = await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject,
    text: textContent.replaceAll('{username}', safeUsername),
    html: htmlContent.replaceAll('{username}', safeUsername)
  });
  console.info(`[email] SMTP ${logTag} email sent`, {
    to: String(to),
    messageId: result?.messageId ?? null,
    response: result?.response ?? null
  });
}

async function sendTransactionalEmail({ to, username, subject, textContent, htmlContent, logTag }) {
  try {
    const sentByApi = await sendMailViaBrevoApi({ to, username, subject, textContent, htmlContent, logTag });
    if (sentByApi) {
      return;
    }
  } catch (error) {
    console.error('[email] Brevo API send failed, falling back to SMTP:', error?.message || error);
  }

  await sendMailViaSmtp({ to, username, subject, textContent, htmlContent, logTag });
}

export async function sendVerificationEmail({ to, username, verifyUrl }) {
  await sendTransactionalEmail({
    to,
    username,
    subject: 'Verify your LEGO account email',
    textContent: 'Hi {username},\n\nPlease verify your email by opening this link:\n' + verifyUrl + '\n\nThis link expires in 24 hours.',
    htmlContent: `<p>Hi {username},</p><p>Please verify your email by opening this link:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`,
    logTag: 'verification'
  });
}

export async function sendTwoFactorCodeEmail({ to, username, code }) {
  const safeCode = String(code ?? '').trim();
  await sendTransactionalEmail({
    to,
    username,
    subject: 'Your LEGO account verification code',
    textContent: 'Hi {username},\n\nYour verification code is: ' + safeCode + '\n\nThe code expires in 10 minutes.',
    htmlContent: `<p>Hi {username},</p><p>Your verification code is:</p><p style="font-size:20px;font-weight:bold;letter-spacing:2px;">${safeCode}</p><p>The code expires in 10 minutes.</p>`,
    logTag: '2fa'
  });
}

export async function sendTestEmail({ to, username, subject, message }) {
  const safeMessage = String(message ?? '').trim() || 'This is a backend test email.';
  const htmlBody = safeMessage
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\n', '<br/>');

  await sendTransactionalEmail({
    to,
    username,
    subject: String(subject ?? '').trim() || 'LEGO Backend Test Email',
    textContent: 'Hi {username},\n\n' + safeMessage,
    htmlContent: `<p>Hi {username},</p><p>${htmlBody}</p>`,
    logTag: 'test'
  });
}
