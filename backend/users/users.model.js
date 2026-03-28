import database from '../database.js';
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
    const sql = 'INSERT INTO users (username, email, full_name) VALUES (?, ?, ?)';
    return database.queryClose(sql, [user.username, user.email, user.full_name]).then(result => {
      return { id: result.insertId, ...user };
    });
  } catch (error) {
    return Promise.reject(error);
  }
}
async function update(id, user) {
  try {
    const sql = 'UPDATE users SET name = ?, email = ?, full_name = ? WHERE user_id = ?';
    return database.queryClose(sql, [user.name, user.email, user.full_name, id]).then(result => {
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