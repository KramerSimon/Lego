import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function toInt(value, fallbackValue) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isNaN(parsed) ? fallbackValue : parsed;
}

function toBool(value, fallbackValue = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) {
    return fallbackValue;
  }
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

const env = {
  nodeEnv: String(process.env.NODE_ENV ?? 'development').trim(),
  port: toInt(process.env.PORT, 3000),
  openApiServerUrl: String(process.env.OPENAPI_SERVER_URL ?? '').trim() || `http://localhost:${toInt(process.env.PORT, 3000)}`,
  authJwtSecret: String(process.env.AUTH_JWT_SECRET ?? 'lego-dev-secret-change-me').trim(),
  emailVerificationBaseUrl: String(process.env.EMAIL_VERIFICATION_BASE_URL ?? `http://localhost:${toInt(process.env.PORT, 3000)}`).trim(),

  dbHost: String(process.env.DB_HOST ?? 'localhost').trim(),
  dbPort: toInt(process.env.DB_PORT, 3306),
  dbUser: String(process.env.DB_USER ?? 'root').trim(),
  dbPassword: String(process.env.DB_PASSWORD ?? 'root'),
  dbName: String(process.env.DB_NAME ?? 'lego').trim(),
  dbConnectionLimit: toInt(process.env.DB_CONNECTION_LIMIT, 10),

  smtpHost: String(process.env.SMTP_HOST ?? 'smtp-relay.brevo.com').trim(),
  smtpPort: toInt(process.env.SMTP_PORT, 587),
  smtpUser: String(process.env.SMTP_USER ?? 'a814c9001@smtp-brevo.com').trim(),
  smtpPass: String(process.env.SMTP_PASS ?? '').trim(),
  smtpPassFile: String(process.env.SMTP_PASS_FILE ?? path.resolve(process.cwd(), '..', 'documentation', 'smtp-key.txt')).trim(),
  smtpSecure: toBool(process.env.SMTP_SECURE, false),
  smtpFrom: String(process.env.SMTP_FROM ?? 'noreply@legobrickbuilder.it').trim(),

  brevoApiEndpoint: String(process.env.BREVO_API_ENDPOINT ?? 'https://api.brevo.com/v3/smtp/email').trim(),
  brevoApiKey: String(process.env.BREVO_API_KEY ?? '').trim(),
  brevoApiKeyFile: String(process.env.BREVO_API_KEY_FILE ?? path.resolve(process.cwd(), '..', 'documentation', 'api-key.txt')).trim()
};

export default env;
