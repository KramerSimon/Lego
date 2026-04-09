import database from '../database.js';

async function hasProfileImageColumn() {
  const rows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['profile_image_url']);
  return Array.isArray(rows) && rows.length > 0;
}

async function run() {
  const exists = await hasProfileImageColumn();
  if (exists) {
    console.log('Migration skipped: users.profile_image_url already exists.');
    return;
  }

  await database.query(`
    ALTER TABLE users
    ADD COLUMN profile_image_url VARCHAR(1024) NULL
  `);

  console.log('Migration complete: added users.profile_image_url.');
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
