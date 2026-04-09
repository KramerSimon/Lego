import database from '../database.js';
import bcrypt from 'bcryptjs';

async function hasPasswordColumn() {
  const rows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['password_hash']);
  return Array.isArray(rows) && rows.length > 0;
}

async function hasProfileImageColumn() {
  const rows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['profile_image_url']);
  return Array.isArray(rows) && rows.length > 0;
}

async function hasAdminColumn() {
  const rows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['is_admin']);
  return Array.isArray(rows) && rows.length > 0;
}

function sanitizeUser(row) {
  if (!row) {
    return null;
  }
  return {
    user_id: row.user_id,
    username: row.username,
    email: row.email,
    full_name: row.full_name,
    profile_image_url: row.profile_image_url ?? null,
    is_admin: Number(row.is_admin ?? 0) > 0
  };
}
async function getAll(query = {}) {
  try {
    return database.paginateTable('users', query);
  } catch (error) {
    return Promise.reject(error);
  }
}
async function getItem(id) {
  try {
    const sql = 'SELECT * FROM users WHERE user_id = ?';
    return database.queryClose(sql, [id]).then(results => results[0]);
  } catch (error) {
    return Promise.reject(error);
  }
}
async function add(user) {
  try {
    const includePassword = await hasPasswordColumn();
    const includeProfileImage = await hasProfileImageColumn();
    const plainPassword = String(user.password ?? '').trim();
    const passwordHash = includePassword && plainPassword
      ? await bcrypt.hash(plainPassword, 12)
      : null;
    const profileImageUrl = String(user.profile_image_url ?? '').trim() || null;

    const sql = includePassword && includeProfileImage
      ? 'INSERT INTO users (username, email, full_name, password_hash, profile_image_url) VALUES (?, ?, ?, ?, ?)'
      : includePassword
        ? 'INSERT INTO users (username, email, full_name, password_hash) VALUES (?, ?, ?, ?)'
        : includeProfileImage
          ? 'INSERT INTO users (username, email, full_name, profile_image_url) VALUES (?, ?, ?, ?)'
          : 'INSERT INTO users (username, email, full_name) VALUES (?, ?, ?)';
    const values = includePassword && includeProfileImage
      ? [user.username, user.email, user.full_name, passwordHash, profileImageUrl]
      : includePassword
        ? [user.username, user.email, user.full_name, passwordHash]
        : includeProfileImage
          ? [user.username, user.email, user.full_name, profileImageUrl]
          : [user.username, user.email, user.full_name];

    return database.queryClose(sql, values).then(result => {
      return { id: result.insertId, ...user };
    });
  } catch (error) {
    return Promise.reject(error);
  }
}
async function update(id, user) {
  try {
    const includePassword = await hasPasswordColumn();
    const includeProfileImage = await hasProfileImageColumn();
    const plainPassword = String(user.password ?? '').trim();
    const passwordHash = includePassword && plainPassword
      ? await bcrypt.hash(plainPassword, 12)
      : null;
    const profileImageUrl = String(user.profile_image_url ?? '').trim() || null;

    const sql = includePassword && passwordHash && includeProfileImage
      ? 'UPDATE users SET username = ?, email = ?, full_name = ?, password_hash = ?, profile_image_url = ? WHERE user_id = ?'
      : includePassword && passwordHash
        ? 'UPDATE users SET username = ?, email = ?, full_name = ?, password_hash = ? WHERE user_id = ?'
        : includeProfileImage
          ? 'UPDATE users SET username = ?, email = ?, full_name = ?, profile_image_url = ? WHERE user_id = ?'
          : 'UPDATE users SET username = ?, email = ?, full_name = ? WHERE user_id = ?';
    const values = includePassword && passwordHash && includeProfileImage
      ? [user.username, user.email, user.full_name, passwordHash, profileImageUrl, id]
      : includePassword && passwordHash
        ? [user.username, user.email, user.full_name, passwordHash, id]
        : includeProfileImage
          ? [user.username, user.email, user.full_name, profileImageUrl, id]
          : [user.username, user.email, user.full_name, id];

    return database.queryClose(sql, values).then(result => {
      if (result.affectedRows > 0) {
        return { id, ...user };
      } else {
        return null;
      }
    });
  } catch (error) {
    return Promise.reject(error);
  } 
}
async function deleteUser(id) {
  try {
    const sql = 'DELETE FROM users WHERE user_id = ?';
    return database.queryClose(sql, [id]).then(result => result.affectedRows > 0);
  } catch (error) {
    return Promise.reject(error);
  }
}

async function getSelf(userId) {
  try {
    const includeProfileImage = await hasProfileImageColumn();
    const includeAdmin = await hasAdminColumn();
    const profileSelect = includeProfileImage ? 'profile_image_url' : 'NULL AS profile_image_url';
    const adminSelect = includeAdmin ? 'is_admin' : '0 AS is_admin';
    const sql = `SELECT user_id, username, email, full_name, ${profileSelect}, ${adminSelect} FROM users WHERE user_id = ? LIMIT 1`;
    const rows = await database.queryClose(sql, [userId]);
    return sanitizeUser(rows?.[0]);
  } catch (error) {
    return Promise.reject(error);
  }
}

async function updateSelf(userId, payload = {}) {
  try {
    const includePassword = await hasPasswordColumn();
    const includeProfileImage = await hasProfileImageColumn();
    const updates = [];
    const values = [];

    // Account self-service endpoint must never allow privilege escalation.
    delete payload.is_admin;

    const username = String(payload.username ?? '').trim();
    if (username) {
      updates.push('username = ?');
      values.push(username);
    }

    const email = String(payload.email ?? '').trim();
    if (email) {
      updates.push('email = ?');
      values.push(email);
    }

    const fullName = String(payload.full_name ?? '').trim();
    if (fullName) {
      updates.push('full_name = ?');
      values.push(fullName);
    }

    if (includeProfileImage && Object.prototype.hasOwnProperty.call(payload, 'profile_image_url')) {
      const profileImageUrl = String(payload.profile_image_url ?? '').trim();
      updates.push('profile_image_url = ?');
      values.push(profileImageUrl || null);
    }

    if (includePassword) {
      const plainPassword = String(payload.password ?? '').trim();
      if (plainPassword) {
        updates.push('password_hash = ?');
        values.push(await bcrypt.hash(plainPassword, 12));
      }
    }

    if (updates.length === 0) {
      return getSelf(userId);
    }

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`;
    values.push(userId);
    await database.queryClose(sql, values);
    return getSelf(userId);
  } catch (error) {
    return Promise.reject(error);
  }
}

export default { getAll, getItem, add, update, delete: deleteUser, getSelf, updateSelf };