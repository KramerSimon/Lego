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
import userSetModel from './users/user_sets/user_sets.model.js';
import env from './config/env.js';
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

  const twoFactorEnabledRows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['two_factor_email_enabled']);
  const hasTwoFactorEnabledColumn = Array.isArray(twoFactorEnabledRows) && twoFactorEnabledRows.length > 0;

  if (!hasTwoFactorEnabledColumn) {
    await database.query(`
      ALTER TABLE users
      ADD COLUMN two_factor_email_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER email_verification_expires_at
    `);
  }

  const twoFactorCodeHashRows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['two_factor_code_hash']);
  const hasTwoFactorCodeHashColumn = Array.isArray(twoFactorCodeHashRows) && twoFactorCodeHashRows.length > 0;

  if (!hasTwoFactorCodeHashColumn) {
    await database.query(`
      ALTER TABLE users
      ADD COLUMN two_factor_code_hash VARCHAR(64) NULL AFTER two_factor_email_enabled
    `);
  }

  const twoFactorCodeExpiresRows = await database.query('SHOW COLUMNS FROM users LIKE ?', ['two_factor_code_expires_at']);
  const hasTwoFactorCodeExpiresColumn = Array.isArray(twoFactorCodeExpiresRows) && twoFactorCodeExpiresRows.length > 0;

  if (!hasTwoFactorCodeExpiresColumn) {
    await database.query(`
      ALTER TABLE users
      ADD COLUMN two_factor_code_expires_at DATETIME NULL AFTER two_factor_code_hash
    `);
  }

  await database.query('UPDATE users SET onboarding_guide_required = 0 WHERE onboarding_completed_at IS NOT NULL');

  await database.query('UPDATE users SET is_admin = 1 WHERE LOWER(username) = ?', ['simon']);
}

function renderStartupLoadingBar(label, completed, total) {
  const safeTotal = Math.max(1, Number(total) || 0);
  const safeCompleted = Math.max(0, Math.min(Number(completed) || 0, safeTotal));
  const width = 30;
  const ratio = safeCompleted / safeTotal;
  const filled = Math.round(width * ratio);
  const bar = `${'#'.repeat(filled)}${'-'.repeat(Math.max(0, width - filled))}`;
  const percent = Math.round(ratio * 100);
  process.stdout.write(`\r${label} [${bar}] ${safeCompleted}/${safeTotal} ${percent}%`);
  if (safeCompleted >= safeTotal) {
    process.stdout.write('\n');
  }
}

const BUILDABLE_WARMUP_INTERVAL_MS = 15 * 60 * 1000;
let buildableWarmupInProgress = false;

function startBuildableSetsWarmup() {
  if (buildableWarmupInProgress) {
    console.log('Buildable sets warm-up skipped: previous run still in progress.');
    return;
  }

  buildableWarmupInProgress = true;
  const startedAt = Date.now();
  console.log('Starting buildable sets warm-up in background...');

  userSetModel.warmBuildableCatalogCache({
    onProgress: ({ processedSteps, totalSteps, processedUsers, totalUsers }) => {
      const completed = Number.isFinite(Number(processedSteps))
        ? Number(processedSteps)
        : Number(processedUsers);
      const total = Number.isFinite(Number(totalSteps))
        ? Number(totalSteps)
        : Number(totalUsers);

      if (total <= 0) {
        return;
      }
      renderStartupLoadingBar('Buildable sets', completed, total);
    }
  })
    .then(({ totalUsers, warmedUsers, failedUsers }) => {
      const elapsedMs = Date.now() - startedAt;
      if (totalUsers === 0) {
        console.log('Buildable sets warm-up skipped: no users with parts found.');
        return;
      }
      if (failedUsers > 0) {
        console.warn(`Buildable sets warm-up completed with warnings in ${elapsedMs}ms (warmed: ${warmedUsers}, failed: ${failedUsers}).`);
        return;
      }
      console.log(`Buildable sets warm-up completed in ${elapsedMs}ms (warmed: ${warmedUsers}).`);
    })
    .catch((error) => {
      console.warn('Buildable sets warm-up failed:', error?.message || error);
    })
    .finally(() => {
      buildableWarmupInProgress = false;
    });
}

ensureSchema()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`Server is running on port ${env.port}`);
      startBuildableSetsWarmup();
      setInterval(startBuildableSetsWarmup, BUILDABLE_WARMUP_INTERVAL_MS);
      console.log('Buildable sets warm-up scheduler started (every 15 minutes).');
    });
  })
  .catch((error) => {
    console.error('Failed to prepare database schema:', error?.message || error);
    process.exit(1);
  });