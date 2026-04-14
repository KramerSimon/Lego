import database from '../database.js';

const MIGRATION_NAME = '2026-04-14-force-email-verification-existing-users';

async function ensureMigrationRegistry() {
  await database.query(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      name VARCHAR(191) NOT NULL PRIMARY KEY,
      applied_at DATETIME NOT NULL
    )
  `);
}

async function migrationAlreadyApplied() {
  const rows = await database.query('SELECT name FROM app_migrations WHERE name = ? LIMIT 1', [MIGRATION_NAME]);
  return Array.isArray(rows) && rows.length > 0;
}

async function hasColumn(columnName) {
  const rows = await database.query('SHOW COLUMNS FROM users LIKE ?', [columnName]);
  return Array.isArray(rows) && rows.length > 0;
}

async function ensureEmailVerificationColumns() {
  if (!(await hasColumn('email_verified'))) {
    await database.query(`
      ALTER TABLE users
      ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER is_admin
    `);
  }

  if (!(await hasColumn('email_verification_token'))) {
    await database.query(`
      ALTER TABLE users
      ADD COLUMN email_verification_token VARCHAR(64) NULL AFTER email_verified
    `);
  }

  if (!(await hasColumn('email_verification_expires_at'))) {
    await database.query(`
      ALTER TABLE users
      ADD COLUMN email_verification_expires_at DATETIME NULL AFTER email_verification_token
    `);
  }
}

async function applyMigration() {
  await ensureMigrationRegistry();
  await ensureEmailVerificationColumns();

  const alreadyApplied = await migrationAlreadyApplied();
  if (alreadyApplied) {
    console.log('Email verification migration already applied.');
    return;
  }

  await database.query(`
    UPDATE users
    SET
      email_verified = 0,
      email_verification_token = NULL,
      email_verification_expires_at = NULL
  `);

  await database.query('INSERT INTO app_migrations (name, applied_at) VALUES (?, NOW())', [MIGRATION_NAME]);
  console.log('Applied email verification migration for existing users.');
}

applyMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to apply email verification migration:', error?.message || error);
    process.exit(1);
  });
