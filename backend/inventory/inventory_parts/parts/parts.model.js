import database from '../../../database.js';
async function getAll(query = {}) {
  try {
    return database.paginateTable('parts', query);
  } catch (error) {
    return Promise.reject(error);
  }
}
async function getItem(id) {
  try {
    const sql = 'SELECT * FROM parts WHERE part_num = ?';
    return database.queryClose(sql, [id]).then(results => results[0]);
  } catch (error) {
    return Promise.reject(error);
  }
}
export default { getAll, getItem };
