import database from '../../database.js';
const tableName = 'user_sets';
const idColumn = 'user_set_id';

function normalizeBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return false;
}

function resolveOwnedQuantity(part, requiredQuantity) {
  const explicitOwned = Number(part?.owned_quantity);
  const hasPart = normalizeBoolean(part?.has_part);
  const ownedQuantityRaw = Number.isFinite(explicitOwned)
    ? explicitOwned
    : (hasPart ? requiredQuantity : 0);
  return Math.max(0, Math.min(requiredQuantity, ownedQuantityRaw));
}

function deriveCompleteness(partSelections, multiplier) {
  let totalRequired = 0;
  let totalOwned = 0;

  for (const part of partSelections) {
    const requiredBase = Number(part?.required_quantity ?? 0);
    if (!Number.isFinite(requiredBase) || requiredBase <= 0) {
      continue;
    }
    const requiredQuantity = requiredBase * multiplier;
    const ownedQuantity = resolveOwnedQuantity(part, requiredQuantity);
    totalRequired += requiredQuantity;
    totalOwned += ownedQuantity;
  }

  if (totalRequired <= 0) {
    return 'unknown';
  }
  const percentage = Math.round((totalOwned / totalRequired) * 100);
  if (percentage >= 100) {
    return 'complete (100%)';
  }
  if (percentage <= 0) {
    return 'missing (0%)';
  }
  return `partial (${percentage}%)`;
}

function buildInsertSql(table, record) {
  const keys = Object.keys(record);
  if (keys.length === 0) {
    throw new Error(`No fields provided for ${table}`);
  }
  const placeholders = keys.map(() => '?').join(', ');
  return {
    sql: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
    values: keys.map((key) => record[key])
  };
}

async function getTableColumns(tx, table) {
  const rows = await tx.query(`SHOW COLUMNS FROM ${table}`);
  const columns = new Set();
  for (const row of rows) {
    if (row && typeof row.Field === 'string') {
      columns.add(row.Field);
    }
  }
  return columns;
}

function toSqlDate(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, 10);
}

function deriveOwnedCompleteFlag(partSelections, multiplier) {
  let totalRequired = 0;
  let totalOwned = 0;

  for (const part of partSelections) {
    const requiredBase = Number(part?.required_quantity ?? 0);
    if (!Number.isFinite(requiredBase) || requiredBase <= 0) {
      continue;
    }
    const requiredQuantity = requiredBase * multiplier;
    const ownedQuantity = resolveOwnedQuantity(part, requiredQuantity);
    totalRequired += requiredQuantity;
    totalOwned += ownedQuantity;
  }

  if (totalRequired <= 0) {
    return 0;
  }
  return totalOwned >= totalRequired ? 1 : 0;
}

async function getAll(query = {}) {
  try {
    const { page, pageSize, offset } = database.parsePagination(query);
    const requestedUserId = Number(query.user_id);
    const hasUserFilter = Number.isFinite(requestedUserId) && requestedUserId > 0;
    const requestedSortBy = String(query.sortBy ?? '').trim().toLowerCase();
    const requestedSortDir = String(query.sortDir ?? '').trim().toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const sortWhitelist = {
      user_set_id: 'us.user_set_id',
      user_id: 'us.user_id',
      set_num: 'us.set_num',
      set_name: 's.name',
      img_url: 's.img_url',
      quantity: 'us.quantity',
      condition_public: 'us.condition_public',
      purchase_price: 'us.purchase_price',
      owned_since: 'us.owned_since',
      owned_complete: 'us.owned_complete'
    };

    const sortColumnSql = sortWhitelist[requestedSortBy] ?? 'us.user_set_id';
    const countSql = hasUserFilter
      ? `SELECT COUNT(*) AS total FROM ${tableName} WHERE user_id = ?`
      : `SELECT COUNT(*) AS total FROM ${tableName}`;
    const dataSql = `
      SELECT us.*, s.name AS set_name, s.img_url
      FROM ${tableName} us
      LEFT JOIN sets s ON s.set_num = us.set_num
      ${hasUserFilter ? 'WHERE us.user_id = ?' : ''}
      ORDER BY ${sortColumnSql} ${requestedSortDir}, us.${idColumn} DESC
      LIMIT ? OFFSET ?
    `;

    const countParams = hasUserFilter ? [requestedUserId] : [];
    const dataParams = hasUserFilter
      ? [requestedUserId, pageSize, offset]
      : [pageSize, offset];

    const [countRows, dataRows] = await Promise.all([
      database.query(countSql, countParams),
      database.query(dataSql, dataParams)
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

async function getOwnerUserId(userSetId) {
  try {
    const sql = `SELECT user_id FROM ${tableName} WHERE ${idColumn} = ? LIMIT 1`;
    const rows = await database.queryClose(sql, [userSetId]);
    const ownerId = Number(rows?.[0]?.user_id);
    if (!Number.isFinite(ownerId) || ownerId <= 0) {
      return null;
    }
    return ownerId;
  } catch (error) {
    return Promise.reject(error);
  }
}

function resolvePartTableMeta(columns, preferredIdColumn, preferredQuantityColumn, preferredLinkColumns) {
  const idColumn = columns.has(preferredIdColumn)
    ? preferredIdColumn
    : (columns.has('id') ? 'id' : null);

  const quantityColumn = columns.has(preferredQuantityColumn)
    ? preferredQuantityColumn
    : (columns.has('quantity') ? 'quantity' : null);

  let linkColumn = null;
  for (const candidate of preferredLinkColumns) {
    if (columns.has(candidate)) {
      linkColumn = candidate;
      break;
    }
  }

  return {
    idColumn,
    quantityColumn,
    linkColumn
  };
}

async function getBreakdown(userSetId) {
  try {
    return database.withTransaction(async (tx) => {
      const setRows = await tx.query(
        `SELECT us.*, s.name AS set_name, s.img_url FROM ${tableName} us LEFT JOIN sets s ON s.set_num = us.set_num WHERE us.${idColumn} = ? LIMIT 1`,
        [userSetId]
      );
      const userSet = setRows?.[0];
      if (!userSet) {
        return null;
      }

      const userPartsColumns = await getTableColumns(tx, 'user_parts');
      const missingColumns = await getTableColumns(tx, 'user_missing_parts');

      const userPartMeta = resolvePartTableMeta(
        userPartsColumns,
        'user_part_id',
        'quantity',
        ['source_user_set_id', 'user_set_id']
      );
      const missingMeta = resolvePartTableMeta(
        missingColumns,
        'missing_part_id',
        'quantity_missing',
        ['user_set_id']
      );

      let availableParts = [];
      if (userPartMeta.idColumn && userPartMeta.quantityColumn && userPartMeta.linkColumn) {
        const sql = `
          SELECT
            up.${userPartMeta.idColumn} AS row_id,
            up.part_num,
            up.color_id,
            up.${userPartMeta.quantityColumn} AS quantity,
            p.name AS part_name,
            p.part_img_url,
            c.name AS color_name
          FROM user_parts up
          LEFT JOIN parts p ON p.part_num = up.part_num
          LEFT JOIN colors c ON c.id = up.color_id
          WHERE up.${userPartMeta.linkColumn} = ?
          ORDER BY p.name, up.part_num, up.color_id
        `;
        availableParts = await tx.query(sql, [userSetId]);
      }

      let missingParts = [];
      if (missingMeta.idColumn && missingMeta.quantityColumn && missingMeta.linkColumn) {
        const sql = `
          SELECT
            mp.${missingMeta.idColumn} AS row_id,
            mp.part_num,
            mp.color_id,
            mp.${missingMeta.quantityColumn} AS quantity,
            p.name AS part_name,
            p.part_img_url,
            c.name AS color_name
          FROM user_missing_parts mp
          LEFT JOIN parts p ON p.part_num = mp.part_num
          LEFT JOIN colors c ON c.id = mp.color_id
          WHERE mp.${missingMeta.linkColumn} = ?
          ORDER BY p.name, mp.part_num, mp.color_id
        `;
        missingParts = await tx.query(sql, [userSetId]);
      }

      return {
        user_set_id: Number(userSet[idColumn]),
        user_id: Number(userSet.user_id),
        set_num: userSet.set_num,
        set_name: userSet.set_name ?? null,
        img_url: userSet.img_url ?? null,
        available_parts: availableParts,
        missing_parts: missingParts
      };
    });
  } catch (error) {
    return Promise.reject(error);
  }
}

async function updateBreakdownPart(userSetId, kind, rowId, quantity) {
  try {
    return database.withTransaction(async (tx) => {
      const normalizedQuantity = Number(quantity);
      if (!Number.isFinite(normalizedQuantity) || normalizedQuantity < 0) {
        throw new Error('quantity must be a non-negative number');
      }

      const table = kind === 'missing' ? 'user_missing_parts' : 'user_parts';
      const columns = await getTableColumns(tx, table);
      const meta = kind === 'missing'
        ? resolvePartTableMeta(columns, 'missing_part_id', 'quantity_missing', ['user_set_id'])
        : resolvePartTableMeta(columns, 'user_part_id', 'quantity', ['source_user_set_id', 'user_set_id']);

      if (!meta.idColumn || !meta.quantityColumn) {
        throw new Error(`Unsupported ${table} schema`);
      }

      let sql = `UPDATE ${table} SET ${meta.quantityColumn} = ? WHERE ${meta.idColumn} = ?`;
      const params = [normalizedQuantity, rowId];
      if (meta.linkColumn) {
        sql += ` AND ${meta.linkColumn} = ?`;
        params.push(userSetId);
      }

      const result = await tx.query(sql, params);
      return result.affectedRows > 0;
    });
  } catch (error) {
    return Promise.reject(error);
  }
}

async function deleteBreakdownPart(userSetId, kind, rowId) {
  try {
    return database.withTransaction(async (tx) => {
      const table = kind === 'missing' ? 'user_missing_parts' : 'user_parts';
      const columns = await getTableColumns(tx, table);
      const meta = kind === 'missing'
        ? resolvePartTableMeta(columns, 'missing_part_id', 'quantity_missing', ['user_set_id'])
        : resolvePartTableMeta(columns, 'user_part_id', 'quantity', ['source_user_set_id', 'user_set_id']);

      if (!meta.idColumn) {
        throw new Error(`Unsupported ${table} schema`);
      }

      let sql = `DELETE FROM ${table} WHERE ${meta.idColumn} = ?`;
      const params = [rowId];
      if (meta.linkColumn) {
        sql += ` AND ${meta.linkColumn} = ?`;
        params.push(userSetId);
      }

      const result = await tx.query(sql, params);
      return result.affectedRows > 0;
    });
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

async function getSetParts(setNum) {
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
        SUM(ip.quantity) AS required_quantity,
        MAX(ip.inventory_id) AS inventory_id,
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

async function addWithParts(payload) {
  try {
    const userSet = { ...(payload?.user_set ?? {}) };
    const partSelections = Array.isArray(payload?.parts) ? payload.parts : [];

    if (!userSet || !userSet.user_id || !userSet.set_num) {
      return Promise.reject(new Error('user_set with user_id and set_num is required'));
    }

    return database.withTransaction(async (tx) => {
      const setQuantity = Number(userSet.quantity ?? 1);
      const multiplier = Number.isFinite(setQuantity) && setQuantity > 0 ? setQuantity : 1;
      const completenessText = deriveCompleteness(partSelections, multiplier);
      const ownedCompleteFlag = deriveOwnedCompleteFlag(partSelections, multiplier);

      const userSetColumns = await getTableColumns(tx, tableName);
      const userSetInsert = {};

      if (userSetColumns.has('user_id')) {
        userSetInsert.user_id = Number(userSet.user_id);
      }
      if (userSetColumns.has('set_num')) {
        userSetInsert.set_num = userSet.set_num;
      }
      if (userSetColumns.has('quantity')) {
        userSetInsert.quantity = multiplier;
      }
      if (userSetColumns.has('condition_public')) {
        userSetInsert.condition_public = userSet.condition_public ?? null;
      }
      if (userSetColumns.has('condition_complete')) {
        userSetInsert.condition_complete = completenessText;
      }
      if (userSetColumns.has('condition_note')) {
        userSetInsert.condition_note = userSet.condition_public ?? null;
      }
      if (userSetColumns.has('owned_complete')) {
        userSetInsert.owned_complete = ownedCompleteFlag;
      }
      if (userSetColumns.has('purchase_price')) {
        const purchasePrice = Number(userSet.purchase_price);
        userSetInsert.purchase_price = Number.isFinite(purchasePrice) ? purchasePrice : null;
      }
      if (userSetColumns.has('purchase_date')) {
        userSetInsert.purchase_date = toSqlDate(userSet.owned_since);
      }

      const { sql: setSql, values: setValues } = buildInsertSql(tableName, userSetInsert);
      const setInsertResult = await tx.query(setSql, setValues);
      const sourceUserSetId = setInsertResult.insertId;

      const userPartsColumns = await getTableColumns(tx, 'user_parts');
      const missingPartsColumns = await getTableColumns(tx, 'user_missing_parts');

      let createdUserParts = 0;
      let createdMissingParts = 0;

      for (const part of partSelections) {
        const requiredBase = Number(part.required_quantity ?? 0);
        if (!Number.isFinite(requiredBase) || requiredBase <= 0) {
          continue;
        }

        const requiredQuantity = requiredBase * multiplier;
        const userId = userSet.user_id;
        const ownedQuantity = resolveOwnedQuantity(part, requiredQuantity);
        const missingQuantity = Math.max(0, requiredQuantity - ownedQuantity);

        if (ownedQuantity > 0) {
          const userPartInsert = {};
          if (userPartsColumns.has('user_id')) {
            userPartInsert.user_id = userId;
          }
          if (userPartsColumns.has('part_num')) {
            userPartInsert.part_num = part.part_num;
          }
          if (userPartsColumns.has('color_id')) {
            userPartInsert.color_id = part.color_id;
          }
          if (userPartsColumns.has('quantity')) {
            userPartInsert.quantity = ownedQuantity;
          }
          if (userPartsColumns.has('inventory_part_id')) {
            userPartInsert.inventory_part_id = part.inventory_part_id ?? null;
          }
          if (userPartsColumns.has('is_built')) {
            userPartInsert.is_built = 0;
          }
          if (userPartsColumns.has('source_user_set_id')) {
            userPartInsert.source_user_set_id = sourceUserSetId;
          }
          if (userPartsColumns.has('user_set_id')) {
            userPartInsert.user_set_id = sourceUserSetId;
          }

          const { sql: userPartSql, values: userPartValues } = buildInsertSql('user_parts', userPartInsert);
          await tx.query(userPartSql, userPartValues);
          createdUserParts += 1;
        }

        if (missingQuantity > 0) {
          const missingInsert = {};
          if (missingPartsColumns.has('user_id')) {
            missingInsert.user_id = userId;
          }
          if (missingPartsColumns.has('user_set_id')) {
            missingInsert.user_set_id = sourceUserSetId;
          }
          if (missingPartsColumns.has('part_num')) {
            missingInsert.part_num = part.part_num;
          }
          if (missingPartsColumns.has('color_id')) {
            missingInsert.color_id = part.color_id;
          }
          if (missingPartsColumns.has('quantity')) {
            missingInsert.quantity = missingQuantity;
          }
          if (missingPartsColumns.has('quantity_missing')) {
            missingInsert.quantity_missing = missingQuantity;
          }
          if (missingPartsColumns.has('partly_available')) {
            missingInsert.partly_available = ownedQuantity > 0 ? 1 : 0;
          }

          const { sql: missingSql, values: missingValues } = buildInsertSql('user_missing_parts', missingInsert);
          await tx.query(missingSql, missingValues);
          createdMissingParts += 1;
        }
      }

      return {
        user_set: {
          id: sourceUserSetId,
          ...userSet
        },
        summary: {
          parts_processed: partSelections.length,
          user_parts_created: createdUserParts,
          missing_parts_created: createdMissingParts
        }
      };
    });
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

async function deleteUserSet(id) {
  try {
    const userSetId = Number(id);
    return database.withTransaction(async (tx) => {
      const userPartsColumns = await getTableColumns(tx, 'user_parts');
      const missingColumns = await getTableColumns(tx, 'user_missing_parts');

      if (userPartsColumns.has('source_user_set_id')) {
        await tx.query('DELETE FROM user_parts WHERE source_user_set_id = ?', [userSetId]);
      } else if (userPartsColumns.has('user_set_id')) {
        await tx.query('DELETE FROM user_parts WHERE user_set_id = ?', [userSetId]);
      }

      if (missingColumns.has('user_set_id')) {
        await tx.query('DELETE FROM user_missing_parts WHERE user_set_id = ?', [userSetId]);
      }

      const sql = `DELETE FROM ${tableName} WHERE ${idColumn} = ?`;
      const result = await tx.query(sql, [userSetId]);
      return result.affectedRows > 0;
    });
  } catch (error) {
    return Promise.reject(error);
  }
}

export default {
  getAll,
  getOwnerUserId,
  getItem,
  add,
  addWithParts,
  getSetParts,
  getBreakdown,
  updateBreakdownPart,
  deleteBreakdownPart,
  update,
  delete: deleteUserSet
};