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
    profile_image_url: row.profile_image_url ?? null
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

async function login(identifier, password) {
  const normalizedIdentifier = String(identifier ?? '').trim();
  const rawPassword = String(password ?? '');

  if (!normalizedIdentifier || !rawPassword) {
    throw new Error('identifier and password are required');
  }

  const passwordColumnExists = await hasPasswordColumn();
  const profileImageColumnExists = await hasProfileImageColumn();
  if (!passwordColumnExists) {
    throw new Error('password_hash column is missing in users table');
  }

  const profileSelect = profileImageColumnExists ? 'profile_image_url,' : '';
  const sql = `
    SELECT user_id, username, email, full_name, ${profileSelect} password_hash
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
      username: safeUser.username
    },
    getJwtSecret(),
    { expiresIn: TOKEN_TTL }
  );

  return {
    token,
    user: safeUser
  };
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
  const profileSelect = profileImageColumnExists ? 'profile_image_url' : 'NULL AS profile_image_url';
  const sql = `SELECT user_id, username, email, full_name, ${profileSelect} FROM users WHERE user_id = ? LIMIT 1`;
  const rows = await database.query(sql, [decoded.user_id]);
  const user = rows?.[0];
  if (!user) {
    throw new Error('User not found');
  }
  return sanitizeUser(user);
}

export default { login, getMe };
