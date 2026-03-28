import database from '../../database.js';
const tableName = 'user_parts';
const idColumn = 'user_part_id';

async function getAll(query = {}) {
  try {
    return database.paginateTable(tableName, query);
  } catch (error) {
    return Promise.reject(error);
  }
}

async function getItem(id) {
  try {
    const sql = `SELECT * FROM ${tableName} WHERE ${idColumn} = ?`;
    return database.queryClose(sql, [id]).then(results => results[0]);
  } catch (error) {
    return Promise.reject(error);
  }
}

async function add(item) {
  try {
    const keys = Object.keys(item);
    if (keys.length === 0) {
      return Promise.reject(new Error('No fields provided'));
    }
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    const values = keys.map(key => item[key]);
    return database.queryClose(sql, values).then(result => ({ id: result.insertId, ...item }));
  } catch (error) {
    return Promise.reject(error);
  }
}

async function update(id, item) {
  try {
    const keys = Object.keys(item);
    if (keys.length === 0) {
      return null;
    }
    const assignments = keys.map(key => `${key} = ?`).join(', ');
    const sql = `UPDATE ${tableName} SET ${assignments} WHERE ${idColumn} = ?`;
    const values = keys.map(key => item[key]);
    return database.queryClose(sql, [...values, id]).then(result => {
      if (result.affectedRows > 0) {
        return { id, ...item };
      }
      return null;
    });
  } catch (error) {
    return Promise.reject(error);
  }
}

async function deleteUserPart(id) {
  try {
    const sql = `DELETE FROM ${tableName} WHERE ${idColumn} = ?`;
    return database.queryClose(sql, [id]).then(result => result.affectedRows > 0);
  } catch (error) {
    return Promise.reject(error);
  }
}

export default { getAll, getItem, add, update, delete: deleteUserPart };