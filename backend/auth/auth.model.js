import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import database from '../database.js';
import { sendVerificationEmail } from './auth.email.js';

const TOKEN_TTL = '12h';
const EMAIL_VERIFICATION_TTL_HOURS = 24;

function getJwtSecret() {
  return process.env.AUTH_JWT_SECRET || 'lego-dev-secret-change-me';
}

function sanitizeUser(row) {
  return {
    user_id: row.user_id,
    username: row.username,
    email: row.email,
    full_name: row.full_name,
    profile_image_url: row.profile_image_url ?? null,
    is_admin: Number(row.is_admin ?? 0) > 0,
    email_verified: Number(row.email_verified ?? 0) > 0,
    onboarding_guide_required: Number(row.onboarding_guide_required ?? 0) > 0,
    onboarding_completed: Boolean(row.onboarding_completed_at),
    onboarding_completed_at: row.onboarding_completed_at ?? null
  };
}

function createVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashVerificationToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function buildVerificationUrl(rawToken) {
  const baseUrl = String(process.env.EMAIL_VERIFICATION_BASE_URL ?? 'http://localhost:3000').trim();
  return `${baseUrl.replace(/\/$/, '')}/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
}

async function hasProfileImageColumn() {
  const rows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['profile_image_url']);
  return Array.isArray(rows) && rows.length > 0;
}

async function hasPasswordColumn() {
  const rows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['password_hash']);
  return Array.isArray(rows) && rows.length > 0;
}

async function hasAdminColumn() {
  const rows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['is_admin']);
  return Array.isArray(rows) && rows.length > 0;
}

async function hasOnboardingGuideRequiredColumn() {
  const rows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['onboarding_guide_required']);
  return Array.isArray(rows) && rows.length > 0;
}

async function hasOnboardingCompletedAtColumn() {
  const rows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['onboarding_completed_at']);
  return Array.isArray(rows) && rows.length > 0;
}

async function hasEmailVerifiedColumn() {
  const rows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['email_verified']);
  return Array.isArray(rows) && rows.length > 0;
}

async function hasEmailVerificationTokenColumn() {
  const rows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['email_verification_token']);
  return Array.isArray(rows) && rows.length > 0;
}

async function hasEmailVerificationExpiresColumn() {
  const rows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['email_verification_expires_at']);
  return Array.isArray(rows) && rows.length > 0;
}

async function login(identifier, password) {
  const normalizedIdentifier = String(identifier ?? '').trim();
  const rawPassword = String(password ?? '');

  if (!normalizedIdentifier || !rawPassword) {
    throw new Error('identifier and password are required');
  }

  const passwordColumnExists = await hasPasswordColumn();
  const profileImageColumnExists = await hasProfileImageColumn();
  const adminColumnExists = await hasAdminColumn();
  const onboardingRequiredColumnExists = await hasOnboardingGuideRequiredColumn();
  const onboardingCompletedAtColumnExists = await hasOnboardingCompletedAtColumn();
  const emailVerifiedColumnExists = await hasEmailVerifiedColumn();
  if (!passwordColumnExists) {
    throw new Error('password_hash column is missing in users table');
  }

  const profileSelect = profileImageColumnExists ? 'profile_image_url,' : '';
  const adminSelect = adminColumnExists ? 'is_admin,' : '0 AS is_admin,';
  const onboardingRequiredSelect = onboardingRequiredColumnExists
    ? 'onboarding_guide_required,'
    : '0 AS onboarding_guide_required,';
  const onboardingCompletedAtSelect = onboardingCompletedAtColumnExists
    ? 'onboarding_completed_at,'
    : 'NULL AS onboarding_completed_at,';
  const emailVerifiedSelect = emailVerifiedColumnExists ? 'email_verified,' : '1 AS email_verified,';
  const sql = `
    SELECT user_id, username, email, full_name, ${profileSelect} ${adminSelect} ${emailVerifiedSelect} ${onboardingRequiredSelect} ${onboardingCompletedAtSelect} password_hash
    FROM users
    WHERE username = ? OR email = ?
    LIMIT 1
  `;
  const rows = await database.query(sql, [normalizedIdentifier, normalizedIdentifier]);
  const user = rows?.[0];

  if (!user || !user.password_hash) {
    throw new Error('Invalid credentials');
  }

  const passwordMatches = await bcrypt.compare(rawPassword, user.password_hash);
  if (!passwordMatches) {
    throw new Error('Invalid credentials');
  }

  if (Number(user.email_verified ?? 1) <= 0) {
    throw new Error('Email not verified. Please verify your email before logging in.');
  }

  const safeUser = sanitizeUser(user);
  const token = jwt.sign(
    {
      user_id: safeUser.user_id,
      username: safeUser.username,
      is_admin: safeUser.is_admin
    },
    getJwtSecret(),
    { expiresIn: TOKEN_TTL }
  );

  return {
    token,
    user: safeUser
  };
}

async function register(payload = {}) {
  const username = String(payload.username ?? '').trim();
  const emailRaw = String(payload.email ?? '').trim();
  const fullName = String(payload.full_name ?? '').trim();
  const password = String(payload.password ?? '');

  if (!username || !emailRaw || !password) {
    throw new Error('username, email and password are required');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  const email = emailRaw.toLowerCase();
  const passwordColumnExists = await hasPasswordColumn();
  const profileImageColumnExists = await hasProfileImageColumn();
  const adminColumnExists = await hasAdminColumn();
  const onboardingRequiredColumnExists = await hasOnboardingGuideRequiredColumn();
  const onboardingCompletedAtColumnExists = await hasOnboardingCompletedAtColumn();
  const emailVerifiedColumnExists = await hasEmailVerifiedColumn();
  const emailVerificationTokenColumnExists = await hasEmailVerificationTokenColumn();
  const emailVerificationExpiresColumnExists = await hasEmailVerificationExpiresColumn();

  if (!passwordColumnExists) {
    throw new Error('password_hash column is missing in users table');
  }

  if (!emailVerifiedColumnExists || !emailVerificationTokenColumnExists || !emailVerificationExpiresColumnExists) {
    throw new Error('Email verification columns are missing in users table');
  }

  const duplicateRows = await database.query(
    'SELECT user_id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1',
    [username, email]
  );
  const duplicate = duplicateRows?.[0];
  if (duplicate) {
    if (String(duplicate.username ?? '').toLowerCase() === username.toLowerCase()) {
      throw new Error('Username already exists');
    }
    throw new Error('Email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const isAdmin = username.toLowerCase() === 'simon' ? 1 : 0;
  const verificationToken = createVerificationToken();
  const verificationTokenHash = hashVerificationToken(verificationToken);
  const verificationExpiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000);

  let insertResult = null;
  if (profileImageColumnExists && adminColumnExists && onboardingRequiredColumnExists && onboardingCompletedAtColumnExists) {
    insertResult = await database.query(
      'INSERT INTO users (username, email, full_name, password_hash, profile_image_url, is_admin, email_verified, email_verification_token, email_verification_expires_at, onboarding_guide_required, onboarding_completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, email, fullName || null, passwordHash, null, isAdmin, 0, verificationTokenHash, verificationExpiresAt, 1, null]
    );
  } else if (profileImageColumnExists && adminColumnExists) {
    insertResult = await database.query(
      'INSERT INTO users (username, email, full_name, password_hash, profile_image_url, is_admin, email_verified, email_verification_token, email_verification_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, email, fullName || null, passwordHash, null, isAdmin, 0, verificationTokenHash, verificationExpiresAt]
    );
  } else if (profileImageColumnExists) {
    insertResult = await database.query(
      'INSERT INTO users (username, email, full_name, password_hash, profile_image_url, email_verified, email_verification_token, email_verification_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [username, email, fullName || null, passwordHash, null, 0, verificationTokenHash, verificationExpiresAt]
    );
  } else {
    insertResult = await database.query(
      'INSERT INTO users (username, email, full_name, password_hash, email_verified, email_verification_token, email_verification_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, email, fullName || null, passwordHash, 0, verificationTokenHash, verificationExpiresAt]
    );
  }

  const userId = Number(insertResult?.insertId ?? 0);

  try {
    await sendVerificationEmail({
      to: email,
      username,
      verifyUrl: buildVerificationUrl(verificationToken)
    });
  } catch (error) {
    if (userId > 0) {
      await database.query('DELETE FROM users WHERE user_id = ? LIMIT 1', [userId]);
    }
    const reason = String(error?.message ?? '').trim();
    throw new Error(`Failed to send verification email. ${reason || 'Please try again.'}`);
  }

  return {
    requires_email_verification: true,
    email,
    message: 'Verification email sent. Please check your inbox.'
  };
}

async function verifyEmailToken(rawToken) {
  const token = String(rawToken ?? '').trim();
  if (!token) {
    throw new Error('Verification token is required');
  }

  const tokenHash = hashVerificationToken(token);
  const result = await database.query(
    'UPDATE users SET email_verified = 1, email_verification_token = NULL, email_verification_expires_at = NULL WHERE email_verification_token = ? AND email_verification_expires_at > NOW() LIMIT 1',
    [tokenHash]
  );

  if (Number(result?.affectedRows ?? 0) <= 0) {
    throw new Error('Verification link is invalid or expired');
  }

  return { verified: true };
}

async function resendVerificationEmail(identifierInput) {
  const identifier = String(identifierInput ?? '').trim().toLowerCase();
  if (!identifier) {
    throw new Error('Email or username is required');
  }

  const rows = await database.query(
    'SELECT user_id, username, email, email_verified FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1',
    [identifier, identifier]
  );
  const user = rows?.[0];
  if (!user) {
    throw new Error('User with this email/username was not found');
  }

  if (Number(user.email_verified ?? 0) > 0) {
    return { already_verified: true, message: 'Email is already verified.' };
  }

  const verificationToken = createVerificationToken();
  const verificationTokenHash = hashVerificationToken(verificationToken);
  const verificationExpiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000);

  await database.query(
    'UPDATE users SET email_verification_token = ?, email_verification_expires_at = ? WHERE user_id = ? LIMIT 1',
    [verificationTokenHash, verificationExpiresAt, user.user_id]
  );

  await sendVerificationEmail({
    to: user.email,
    username: user.username,
    verifyUrl: buildVerificationUrl(verificationToken)
  });

  return { sent: true, email: user.email, message: 'Verification email sent. Please check your inbox.' };
}

function verifyToken(token) {
  if (!token) {
    throw new Error('Missing token');
  }
  return jwt.verify(token, getJwtSecret());
}

async function getMe(token) {
  const decoded = verifyToken(token);
  const profileImageColumnExists = await hasProfileImageColumn();
  const adminColumnExists = await hasAdminColumn();
  const emailVerifiedColumnExists = await hasEmailVerifiedColumn();
  const onboardingRequiredColumnExists = await hasOnboardingGuideRequiredColumn();
  const onboardingCompletedAtColumnExists = await hasOnboardingCompletedAtColumn();
  const profileSelect = profileImageColumnExists ? 'profile_image_url' : 'NULL AS profile_image_url';
  const adminSelect = adminColumnExists ? 'is_admin' : '0 AS is_admin';
  const emailVerifiedSelect = emailVerifiedColumnExists ? 'email_verified' : '1 AS email_verified';
  const onboardingRequiredSelect = onboardingRequiredColumnExists ? 'onboarding_guide_required' : '0 AS onboarding_guide_required';
  const onboardingCompletedAtSelect = onboardingCompletedAtColumnExists ? 'onboarding_completed_at' : 'NULL AS onboarding_completed_at';
  const sql = `SELECT user_id, username, email, full_name, ${profileSelect}, ${adminSelect}, ${emailVerifiedSelect}, ${onboardingRequiredSelect}, ${onboardingCompletedAtSelect} FROM users WHERE user_id = ? LIMIT 1`;
  const rows = await database.query(sql, [decoded.user_id]);
  const user = rows?.[0];
  if (!user) {
    throw new Error('User not found');
  }
  return sanitizeUser(user);
}

async function completeOnboarding(token) {
  const decoded = verifyToken(token);
  const onboardingRequiredColumnExists = await hasOnboardingGuideRequiredColumn();
  const onboardingCompletedAtColumnExists = await hasOnboardingCompletedAtColumn();

  if (!onboardingRequiredColumnExists || !onboardingCompletedAtColumnExists) {
    return getMe(token);
  }

  await database.query(
    'UPDATE users SET onboarding_guide_required = 0, onboarding_completed_at = NOW() WHERE user_id = ? LIMIT 1',
    [decoded.user_id]
  );

  return getMe(token);
}

export default { login, register, getMe, completeOnboarding, verifyEmailToken, resendVerificationEmail };
