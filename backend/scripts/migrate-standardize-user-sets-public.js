import database from '../database.js';

const STANDARD_TAGS = [
  'sealed',
  'like_new',
  'used_good',
  'used_fair',
  'incomplete',
  'for_parts'
];

async function hasColumn(tableName, columnName) {
  const rows = await database.query('SHOW COLUMNS FROM ?? LIKE ?', [tableName, columnName]);
  return Array.isArray(rows) && rows.length > 0;
}

async function hasIndex(tableName, indexName) {
  const rows = await database.query('SHOW INDEX FROM ?? WHERE Key_name = ?', [tableName, indexName]);
  return Array.isArray(rows) && rows.length > 0;
}

async function addColumnsIfMissing() {
  const hasConditionPublic = await hasColumn('user_sets', 'condition_public');
  if (!hasConditionPublic) {
    await database.query('ALTER TABLE user_sets ADD COLUMN condition_public VARCHAR(32) NULL');
    console.log('Added user_sets.condition_public');
  }

  const hasIsPublic = await hasColumn('user_sets', 'is_public');
  if (!hasIsPublic) {
    await database.query('ALTER TABLE user_sets ADD COLUMN is_public TINYINT(1) NOT NULL DEFAULT 0');
    console.log('Added user_sets.is_public');
  }
}

async function normalizeConditionTags() {
  const hasConditionNote = await hasColumn('user_sets', 'condition_note');
  const noteProjection = hasConditionNote ? 'condition_note' : 'NULL AS condition_note';
  const rows = await database.query(`SELECT user_set_id, condition_public, ${noteProjection} FROM user_sets`);

  for (const row of rows) {
    const source = String(row.condition_public ?? row.condition_note ?? '').trim().toLowerCase();
    let normalized = null;

    if (!source) {
      normalized = null;
    } else if (STANDARD_TAGS.includes(source)) {
      normalized = source;
    } else if (source.includes('seal')) {
      normalized = 'sealed';
    } else if (source.includes('like new') || source.includes('new')) {
      normalized = 'like_new';
    } else if (source.includes('good') || source.includes('great') || source.includes('very good')) {
      normalized = 'used_good';
    } else if (source.includes('fair') || source.includes('ok') || source.includes('average')) {
      normalized = 'used_fair';
    } else if (source.includes('part') || source.includes('spare') || source.includes('damaged')) {
      normalized = 'for_parts';
    } else if (source.includes('incomplete') || source.includes('missing')) {
      normalized = 'incomplete';
    }

    await database.query('UPDATE user_sets SET condition_public = ? WHERE user_set_id = ?', [normalized, row.user_set_id]);
  }

  console.log('Normalized user_sets.condition_public into standard tags.');
}

async function addVisibilityIndex() {
  const indexExists = await hasIndex('user_sets', 'idx_user_sets_public_user');
  if (indexExists) {
    return;
  }
  await database.query('CREATE INDEX idx_user_sets_public_user ON user_sets (is_public, user_id)');
  console.log('Created idx_user_sets_public_user index.');
}

async function run() {
  await addColumnsIfMissing();
  await normalizeConditionTags();
  await addVisibilityIndex();
  console.log('Migration complete: user_sets public visibility + standardized condition tags.');
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
