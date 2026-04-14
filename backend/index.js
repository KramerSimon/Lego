import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import database from './database.js';
import inventoryRouter from './inventory/inventory.router.js';
import inventoryPartsRouter from './inventory/inventory_parts/inventory_parts.router.js';
import partsRouter from './inventory/inventory_parts/parts/parts.router.js';
import partCategoriesRouter from './inventory/inventory_parts/parts/part_categories/part_categories.router.js';
import partRelationshipsRouter from './inventory/inventory_parts/parts/part_relationships/part_relationships.router.js';
import elementsRouter from './inventory/inventory_parts/parts/elements/elements.router.js';
import colorsRouter from './inventory/inventory_parts/parts/colors/colors.router.js';
import inventoryMinifigsRouter from './inventory/inventory_minifigs/inventory_minifigs.router.js';
import minifigsRouter from './inventory/inventory_minifigs/minifigs/minifigs.router.js';
import inventorySetsRouter from './inventory/inventory_sets/inventory_sets.router.js';
import setsRouter from './inventory/inventory_sets/sets/sets.router.js';
import themesRouter from './inventory/inventory_sets/sets/themes/themes.router.js';
import usersRouter from './users/users.router.js';
import userPartsRouter from './users/user_parts/user_parts.router.js';
import userMissingPartsRouter from './users/user_missing_parts/user_missing_parts.router.js';
import userSetsRouter from './users/user_sets/user_sets.router.js';
import authRouter from './auth/auth.router.js';
import { authenticateRequest, requireAdmin } from './auth/auth.middleware.js';
import openApiSpec from './openapi.js';
const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.get('/openapi.json', (request, response) => {
  response.json(openApiSpec);
});
app.use('/', swaggerUi.serve);
app.get('/', swaggerUi.setup(openApiSpec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.use('/auth', authRouter);
app.use(authenticateRequest);
app.use('/users', usersRouter);
app.use('/sets', setsRouter);
app.use('/themes', themesRouter);
app.use('/user_missing_parts', userMissingPartsRouter);
app.use('/user_sets', userSetsRouter);
app.use(requireAdmin);
app.use('/inventory', inventoryRouter);
app.use('/inventory_parts', inventoryPartsRouter);
app.use('/parts', partsRouter);
app.use('/part_categories', partCategoriesRouter);
app.use('/part_relationships', partRelationshipsRouter);
app.use('/elements', elementsRouter);
app.use('/colors', colorsRouter);
app.use('/inventory_minifigs', inventoryMinifigsRouter);
app.use('/minifigs', minifigsRouter);
app.use('/inventory_sets', inventorySetsRouter);
app.use('/user_parts', userPartsRouter);

async function ensureSchema() {
  const profileRows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['profile_image_url']);
  const hasProfileImageColumn = Array.isArray(profileRows) && profileRows.length > 0;

  if (!hasProfileImageColumn) {
    await database.query(`
      ALTER TABLE users
      ADD COLUMN profile_image_url VARCHAR(1024) NULL AFTER password_hash
    `);
  }

  const adminRows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['is_admin']);
  const hasAdminColumn = Array.isArray(adminRows) && adminRows.length > 0;

  if (!hasAdminColumn) {
    await database.query(`
      ALTER TABLE users
      ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER profile_image_url
    `);
  }

  const onboardingRequiredRows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['onboarding_guide_required']);
  const hasOnboardingRequiredColumn = Array.isArray(onboardingRequiredRows) && onboardingRequiredRows.length > 0;

  if (!hasOnboardingRequiredColumn) {
    await database.query(`
      ALTER TABLE users
      ADD COLUMN onboarding_guide_required TINYINT(1) NOT NULL DEFAULT 0 AFTER is_admin
    `);
  }

  const onboardingCompletedRows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['onboarding_completed_at']);
  const hasOnboardingCompletedColumn = Array.isArray(onboardingCompletedRows) && onboardingCompletedRows.length > 0;

  if (!hasOnboardingCompletedColumn) {
    await database.query(`
      ALTER TABLE users
      ADD COLUMN onboarding_completed_at DATETIME NULL AFTER onboarding_guide_required
    `);
  }

  const emailVerifiedRows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['email_verified']);
  const hasEmailVerifiedColumn = Array.isArray(emailVerifiedRows) && emailVerifiedRows.length > 0;

  if (!hasEmailVerifiedColumn) {
    await database.query(`
      ALTER TABLE users
      ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER is_admin
    `);
  }

  const emailVerificationTokenRows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['email_verification_token']);
  const hasEmailVerificationTokenColumn = Array.isArray(emailVerificationTokenRows) && emailVerificationTokenRows.length > 0;

  if (!hasEmailVerificationTokenColumn) {
    await database.query(`
      ALTER TABLE users
      ADD COLUMN email_verification_token VARCHAR(64) NULL AFTER email_verified
    `);
  }

  const emailVerificationExpiresRows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['email_verification_expires_at']);
  const hasEmailVerificationExpiresColumn = Array.isArray(emailVerificationExpiresRows) && emailVerificationExpiresRows.length > 0;

  if (!hasEmailVerificationExpiresColumn) {
    await database.query(`
      ALTER TABLE users
      ADD COLUMN email_verification_expires_at DATETIME NULL AFTER email_verification_token
    `);
  }

  await database.query('UPDATE users SET onboarding_guide_required = 0 WHERE onboarding_completed_at IS NOT NULL');

  await database.query('UPDATE users SET is_admin = 1 WHERE LOWER(username) = ?', ['simon']);
}

ensureSchema()
  .then(() => {
    app.listen(3000, () => {
      console.log('Server is running on port 3000');
    });
  })
  .catch((error) => {
    console.error('Failed to prepare database schema:', error?.message || error);
    process.exit(1);
  });