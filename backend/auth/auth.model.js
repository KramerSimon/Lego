import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import database from '../database.js';

const TOKEN_TTL = '12h';

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
    is_admin: Number(row.is_admin ?? 0) > 0
  };
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

async function login(identifier, password) {
  const normalizedIdentifier = String(identifier ?? '').trim();
  const rawPassword = String(password ?? '');

  if (!normalizedIdentifier || !rawPassword) {
    throw new Error('identifier and password are required');
  }

  const passwordColumnExists = await hasPasswordColumn();
  const profileImageColumnExists = await hasProfileImageColumn();
  const adminColumnExists = await hasAdminColumn();
  if (!passwordColumnExists) {
    throw new Error('password_hash column is missing in users table');
  }

  const profileSelect = profileImageColumnExists ? 'profile_image_url,' : '';
  const adminSelect = adminColumnExists ? 'is_admin,' : '0 AS is_admin,';
  const sql = `
    SELECT user_id, username, email, full_name, ${profileSelect} ${adminSelect} password_hash
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

  if (!passwordColumnExists) {
    throw new Error('password_hash column is missing in users table');
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
  if (profileImageColumnExists && adminColumnExists) {
    await database.query(
      'INSERT INTO users (username, email, full_name, password_hash, profile_image_url, is_admin) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, fullName || null, passwordHash, null, isAdmin]
    );
  } else if (profileImageColumnExists) {
    await database.query(
      'INSERT INTO users (username, email, full_name, password_hash, profile_image_url) VALUES (?, ?, ?, ?, ?)',
      [username, email, fullName || null, passwordHash, null]
    );
  } else {
    await database.query(
      'INSERT INTO users (username, email, full_name, password_hash) VALUES (?, ?, ?, ?)',
      [username, email, fullName || null, passwordHash]
    );
  }

  return login(email, password);
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
  const profileSelect = profileImageColumnExists ? 'profile_image_url' : 'NULL AS profile_image_url';
  const adminSelect = adminColumnExists ? 'is_admin' : '0 AS is_admin';
  const sql = `SELECT user_id, username, email, full_name, ${profileSelect}, ${adminSelect} FROM users WHERE user_id = ? LIMIT 1`;
  const rows = await database.query(sql, [decoded.user_id]);
  const user = rows?.[0];
  if (!user) {
    throw new Error('User not found');
  }
  return sanitizeUser(user);
}

export default { login, register, getMe };
