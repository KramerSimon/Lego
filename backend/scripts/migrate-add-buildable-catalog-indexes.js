import database from '../database.js';

async function tableExists(tableName) {
  const rows = await database.query('SHOW TABLES LIKE ?', [tableName]);
  return Array.isArray(rows) && rows.length > 0;
}

async function indexExists(tableName, indexName) {
  const rows = await database.query('SHOW INDEX FROM ?? WHERE Key_name = ?', [tableName, indexName]);
  return Array.isArray(rows) && rows.length > 0;
}

async function addIndexIfMissing(tableName, indexName, indexSql) {
  if (!(await tableExists(tableName))) {
    console.log(`Migration skipped: table ${tableName} does not exist.`);
    return;
  }

  if (await indexExists(tableName, indexName)) {
    console.log(`Migration skipped: ${tableName}.${indexName} already exists.`);
    return;
  }

  await database.query(indexSql);
  console.log(`Added index ${tableName}.${indexName}`);
}

async function run() {
  // Speeds up owned-quantity aggregation by (user_id, part_num, color_id).
  await addIndexIfMissing(
    'user_parts',
    'idx_user_parts_user_part_color',
    'ALTER TABLE user_parts ADD INDEX idx_user_parts_user_part_color (user_id, part_num, color_id)'
  );

  // Speeds up inventory part scans and joins for selected inventory and non-spare rows.
  await addIndexIfMissing(
    'inventory_parts',
    'idx_inventory_parts_inv_spare_part_color',
    'ALTER TABLE inventory_parts ADD INDEX idx_inventory_parts_inv_spare_part_color (inventory_id, is_spare, part_num, color_id)'
  );

  // Speeds up latest-inventory lookup by set/version.
  await addIndexIfMissing(
    'inventories',
    'idx_inventories_set_num_version',
    'ALTER TABLE inventories ADD INDEX idx_inventories_set_num_version (set_num, version)'
  );

  // Helps optional theme filtering in buildable catalog queries.
  await addIndexIfMissing(
    'sets',
    'idx_sets_theme_id',
    'ALTER TABLE sets ADD INDEX idx_sets_theme_id (theme_id)'
  );

  console.log('Buildable catalog index migration complete.');
}

run()
  .catch((error) => {
    console.error('Migration failed:', error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await database.close();
    } catch {
      // Ignore pool close errors at process shutdown.
    }
  });
