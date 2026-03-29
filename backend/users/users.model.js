import database from '../database.js';
import bcrypt from 'bcryptjs';

async function hasPasswordColumn() {
  const rows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['password_hash']);
  return Array.isArray(rows) && rows.length > 0;
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
    const plainPassword = String(user.password ?? '').trim();
    const passwordHash = includePassword && plainPassword
      ? await bcrypt.hash(plainPassword, 12)
      : null;

    const sql = includePassword
      ? 'INSERT INTO users (username, email, full_name, password_hash) VALUES (?, ?, ?, ?)'
      : 'INSERT INTO users (username, email, full_name) VALUES (?, ?, ?)';
    const values = includePassword
      ? [user.username, user.email, user.full_name, passwordHash]
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
    const plainPassword = String(user.password ?? '').trim();
    const passwordHash = includePassword && plainPassword
      ? await bcrypt.hash(plainPassword, 12)
      : null;

    const sql = includePassword && passwordHash
      ? 'UPDATE users SET username = ?, email = ?, full_name = ?, password_hash = ? WHERE user_id = ?'
      : 'UPDATE users SET username = ?, email = ?, full_name = ? WHERE user_id = ?';
    const values = includePassword && passwordHash
      ? [user.username, user.email, user.full_name, passwordHash, id]
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
export default { getAll, getItem, add, update, delete: deleteUser };