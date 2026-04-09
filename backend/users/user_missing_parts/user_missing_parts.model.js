import database from '../../database.js';
const tableName = 'user_missing_parts';
const idColumn = 'missing_part_id';

async function resolveMissingQuantityColumn() {
  const columns = await database.query('SHOW COLUMNS FROM user_missing_parts');
  const columnNames = new Set((columns ?? []).map((column) => String(column?.Field ?? '')));
  if (columnNames.has('quantity_missing')) {
    return 'quantity_missing';
  }
  return 'quantity';
}

async function getCatalog(query = {}) {
  try {
    const { page, pageSize, offset } = database.parsePagination(query);
    const quantityColumn = await resolveMissingQuantityColumn();

    const filters = [];
    const params = [];

    const userId = Number(query.user_id);
    if (Number.isFinite(userId) && userId > 0) {
      filters.push('us.user_id = ?');
      params.push(userId);
    }

    const themeId = Number(query.theme_id);
    if (Number.isFinite(themeId) && themeId > 0) {
      filters.push('t.id = ?');
      params.push(themeId);
    }

    const setNum = String(query.set_num ?? '').trim();
    if (setNum) {
      filters.push('us.set_num = ?');
      params.push(setNum);
    }

    const search = String(query.search ?? '').trim();
    if (search) {
      const like = `%${search}%`;
      filters.push(`(
        ump.part_num LIKE ?
        OR p.name LIKE ?
        OR us.set_num LIKE ?
        OR s.name LIKE ?
        OR t.name LIKE ?
      )`);
      params.push(like, like, like, like, like);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM user_missing_parts ump
      INNER JOIN user_sets us ON us.user_set_id = ump.user_set_id
      LEFT JOIN sets s ON s.set_num = us.set_num
      LEFT JOIN themes t ON t.id = s.theme_id
      LEFT JOIN parts p ON p.part_num = ump.part_num
      ${whereClause}
    `;

    const dataSql = `
      SELECT
        ump.${idColumn} AS missing_part_id,
        ump.user_set_id,
        us.user_id,
        us.set_num,
        s.name AS set_name,
        s.img_url AS set_img_url,
        t.id AS theme_id,
        t.name AS theme_name,
        ump.part_num,
        p.name AS part_name,
        p.part_img_url,
        ump.color_id,
        c.name AS color_name,
        ump.${quantityColumn} AS quantity_missing,
        u.username,
        u.email,
        u.full_name
      FROM user_missing_parts ump
      INNER JOIN user_sets us ON us.user_set_id = ump.user_set_id
      LEFT JOIN users u ON u.user_id = us.user_id
      LEFT JOIN sets s ON s.set_num = us.set_num
      LEFT JOIN themes t ON t.id = s.theme_id
      LEFT JOIN parts p ON p.part_num = ump.part_num
      LEFT JOIN colors c ON c.id = ump.color_id
      ${whereClause}
      ORDER BY us.user_set_id DESC, p.name ASC, ump.part_num ASC, ump.color_id ASC
      LIMIT ? OFFSET ?
    `;

    const [countRows, dataRows] = await Promise.all([
      database.query(countSql, params),
      database.query(dataSql, [...params, pageSize, offset])
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

async function deleteUserMissingPart(id) {
  try {
    const sql = `DELETE FROM ${tableName} WHERE ${idColumn} = ?`;
    return database.queryClose(sql, [id]).then(result => result.affectedRows > 0);
  } catch (error) {
    return Promise.reject(error);
  }
}

export default { getAll, getCatalog, getItem, add, update, delete: deleteUserMissingPart };