import database from '../../../database.js';
async function getAll(query = {}) {
  try {
    const { page, pageSize, offset } = database.parsePagination(query);
    const search = typeof query.search === 'string' ? query.search.trim() : '';
    const hasSearch = search.length > 0;
    const themeIdRaw = query.themeId ?? query.theme_id;
    const themeId = Number(themeIdRaw);
    const hasThemeFilter = Number.isInteger(themeId) && themeId > 0;

    const conditions = [];
    const whereParams = [];

    if (hasSearch) {
      conditions.push('(set_num LIKE ? OR name LIKE ?)');
      whereParams.push(`%${search}%`, `%${search}%`);
    }

    if (hasThemeFilter) {
      conditions.push('theme_id = ?');
      whereParams.push(themeId);
    }

    const whereSql = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) AS total FROM sets${whereSql}`;
    const dataSql = `
      SELECT
        s.*,
        (
          SELECT COUNT(*)
          FROM set_instructions si
          WHERE si.set_num = s.set_num
        ) AS instruction_count
      FROM sets s${whereSql.replace(/\bset_num\b/g, 's.set_num').replace(/\bname\b/g, 's.name').replace(/\btheme_id\b/g, 's.theme_id')}
      ORDER BY s.set_num
      LIMIT ? OFFSET ?
    `;

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
    const sql = `
      SELECT
        s.*,
        (
          SELECT COUNT(*)
          FROM set_instructions si
          WHERE si.set_num = s.set_num
        ) AS instruction_count
      FROM sets s
      WHERE s.set_num = ?
    `;
    return database.queryClose(sql, [id]).then(results => results[0]);
  } catch (error) {
    return Promise.reject(error);
  }
}

async function getInstructions(setNum) {
  try {
    const sql = `
      SELECT
        id,
        set_num,
        source,
        source_label,
        url,
        name,
        instruction_type,
        sort_order,
        created_at,
        updated_at
      FROM set_instructions
      WHERE set_num = ?
      ORDER BY sort_order ASC, id ASC
    `;

    return database.queryClose(sql, [setNum]);
  } catch (error) {
    return Promise.reject(error);
  }
}

async function getParts(setNum) {
  try {
    const inventorySql = 'SELECT id, version FROM inventories WHERE set_num = ? ORDER BY version DESC LIMIT 1';
    const inventoryRows = await database.queryClose(inventorySql, [setNum]);
    const inventory = inventoryRows?.[0];

    if (!inventory) {
      return {
        set_num: setNum,
        inventory_id: null,
        parts: []
      };
    }

    const partsSql = `
      SELECT
        ip.part_num,
        ip.color_id,
        SUM(ip.quantity) AS quantity,
        MAX(p.name) AS part_name,
        MAX(p.part_img_url) AS part_img_url,
        MAX(c.name) AS color_name
      FROM inventory_parts ip
      LEFT JOIN parts p ON p.part_num = ip.part_num
      LEFT JOIN colors c ON c.id = ip.color_id
      WHERE ip.inventory_id = ?
        AND (ip.is_spare = 0 OR ip.is_spare IS NULL)
      GROUP BY ip.part_num, ip.color_id
      ORDER BY part_name, ip.part_num, ip.color_id
    `;

    const parts = await database.queryClose(partsSql, [inventory.id]);
    return {
      set_num: setNum,
      inventory_id: inventory.id,
      inventory_version: inventory.version,
      parts
    };
  } catch (error) {
    return Promise.reject(error);
  }
}

export default { getAll, getItem, getParts, getInstructions };
