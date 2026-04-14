import database from '../database.js';

async function hasColumn(columnName) {
  const rows = await database.query('SHOW COLUMNS FROM users LIKE ?', [columnName]);
  return Array.isArray(rows) && rows.length > 0;
}

async function run() {
  if (!(await hasColumn('two_factor_email_enabled'))) {
    await database.query(`
      ALTER TABLE users
      ADD COLUMN two_factor_email_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER email_verification_expires_at
    `);
    console.log('Added users.two_factor_email_enabled');
  } else {
    console.log('Migration skipped: users.two_factor_email_enabled already exists.');
  }

  if (!(await hasColumn('two_factor_code_hash'))) {
    await database.query(`
      ALTER TABLE users
      ADD COLUMN two_factor_code_hash VARCHAR(64) NULL AFTER two_factor_email_enabled
    `);
    console.log('Added users.two_factor_code_hash');
  } else {
    console.log('Migration skipped: users.two_factor_code_hash already exists.');
  }

  if (!(await hasColumn('two_factor_code_expires_at'))) {
    await database.query(`
      ALTER TABLE users
      ADD COLUMN two_factor_code_expires_at DATETIME NULL AFTER two_factor_code_hash
    `);
    console.log('Added users.two_factor_code_expires_at');
  } else {
    console.log('Migration skipped: users.two_factor_code_expires_at already exists.');
  }

  console.log('Two-factor migration complete.');
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to run two-factor migration:', error?.message || error);
    process.exit(1);
  });
