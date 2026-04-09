import database from '../database.js';

async function tableExists(tableName) {
  const rows = await database.query('SHOW TABLES LIKE ?', [tableName]);
  return Array.isArray(rows) && rows.length > 0;
}

async function run() {
  const exists = await tableExists('set_instructions');

  if (exists) {
    console.log('Migration skipped: set_instructions table already exists.');
    return;
  }

  await database.query(`
    CREATE TABLE set_instructions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      set_num VARCHAR(32) NOT NULL,
      source VARCHAR(64) NOT NULL,
      source_label VARCHAR(128) NULL,
      url VARCHAR(1024) NOT NULL,
      name VARCHAR(255) NULL,
      instruction_type VARCHAR(64) NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_set_instructions_set_num (set_num),
      KEY idx_set_instructions_source (source),
      KEY idx_set_instructions_sort (set_num, sort_order),
      CONSTRAINT fk_set_instructions_set_num FOREIGN KEY (set_num) REFERENCES sets(set_num) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  console.log('Migration complete: created set_instructions table.');
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
