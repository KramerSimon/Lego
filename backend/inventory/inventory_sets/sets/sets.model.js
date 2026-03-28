import database from '../../../database.js';
async function getAll(query = {}) {
  try {
    const { page, pageSize, offset } = database.parsePagination(query);
    const search = typeof query.search === 'string' ? query.search.trim() : '';
    const hasSearch = search.length > 0;
    const whereSql = hasSearch ? ' WHERE set_num LIKE ? OR name LIKE ?' : '';
    const whereParams = hasSearch ? [`%${search}%`, `%${search}%`] : [];

    const countSql = `SELECT COUNT(*) AS total FROM sets${whereSql}`;
    const dataSql = `SELECT * FROM sets${whereSql} ORDER BY set_num LIMIT ? OFFSET ?`;

    const [countRows, dataRows] = await Promise.all([
      database.query(countSql, whereParams),
      database.query(dataSql, [...whereParams, pageSize, offset])
    ]);

    const total = Number(countRows?.[0]?.total ?? 0);
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    return {
      data: dataRows,
      page,
      pageSize,
      total,
      totalPages
    };
  } catch (error) {
    return Promise.reject(error);
  }
}
async function getItem(id) {
  try {
    const sql = 'SELECT * FROM sets WHERE set_num = ?';
    return database.queryClose(sql, [id]).then(results => results[0]);
  } catch (error) {
    return Promise.reject(error);
  }
}
export default { getAll, getItem };
