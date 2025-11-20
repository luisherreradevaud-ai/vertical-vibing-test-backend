/**
 * Email Features Seed Script
 *
 * Seeds email system features into the IAM database.
 * This allows administrators to assign email permissions to user levels.
 *
 * Usage:
 *   import { seedEmailFeatures } from './features/email/seed-email-features';
 *   await seedEmailFeatures();
 */

import crypto from 'crypto';
import { db } from '../../shared/db/client';
import { EMAIL_IAM_FEATURES } from './email-iam-features';
import { logger } from '../../shared/utils/logger';

/**
 * Seed email features into the IAM database
 * Idempotent - safe to run multiple times
 */
export async function seedEmailFeatures(): Promise<void> {
  logger.info('🌱 Seeding email features into IAM database...');

  try {
    for (const feature of EMAIL_IAM_FEATURES) {
      // Check if feature already exists
      const existing = await db.iam.features.findByKey(feature.key);

      if (existing) {
        logger.debug({ key: feature.key }, 'Email feature already exists, updating...');

        // Update existing feature
        await db.iam.features.update(existing.id, {
          name: feature.name,
          description: feature.description,
          resourceType: feature.resourceType,
          actions: JSON.stringify(feature.actions),
          category: feature.category,
          enabled: true,
          updatedAt: new Date().toISOString(),
        });

        logger.info({ key: feature.key, id: existing.id }, '✅ Updated email feature');
      } else {
        // Create new feature with generated ID
        const created = await db.iam.features.create({
          id: crypto.randomUUID(),
          key: feature.key,
          name: feature.name,
          description: feature.description,
          resourceType: feature.resourceType,
          actions: JSON.stringify(feature.actions),
          category: feature.category,
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        logger.info({ key: feature.key, id: created.id }, '✅ Created email feature');
      }
    }

    logger.info(`🎉 Successfully seeded ${EMAIL_IAM_FEATURES.length} email features`);
  } catch (error) {
    logger.error({ error }, '❌ Failed to seed email features');
    throw error;
  }
}

/**
 * Remove email features from IAM database
 * Use with caution - this will remove all email permissions
 */
export async function unseedEmailFeatures(): Promise<void> {
  logger.warn('⚠️  Removing email features from IAM database...');

  try {
    for (const feature of EMAIL_IAM_FEATURES) {
      const existing = await db.iam.features.findByKey(feature.key);

      if (existing) {
        await db.iam.features.delete(existing.id);
        logger.info({ key: feature.key }, '🗑️  Removed email feature');
      }
    }

    logger.info('🎉 Successfully removed all email features');
  } catch (error) {
    logger.error({ error }, '❌ Failed to remove email features');
    throw error;
  }
}

/**
 * List all registered email features
 */
export async function listEmailFeatures(): Promise<void> {
  logger.info('📋 Listing registered email features...');

  try {
    const features = await db.iam.features.findByCategory('email');

    if (features.length === 0) {
      logger.warn('No email features found in database. Run seedEmailFeatures() to initialize.');
      return;
    }

    logger.info({ count: features.length }, 'Found email features:');

    for (const feature of features) {
      const actions = JSON.parse(feature.actions || '[]');
      logger.info({
        key: feature.key,
        name: feature.name,
        actions,
        enabled: feature.enabled,
      }, `  - ${feature.name}`);
    }
  } catch (error) {
    logger.error({ error }, '❌ Failed to list email features');
    throw error;
  }
}

// If running as a script
if (require.main === module) {
  const command = process.argv[2];

  (async () => {
    switch (command) {
      case 'seed':
        await seedEmailFeatures();
        break;
      case 'unseed':
        await unseedEmailFeatures();
        break;
      case 'list':
        await listEmailFeatures();
        break;
      default:
        console.log('Usage: npm run seed-email-features [seed|unseed|list]');
        console.log('  seed   - Add email features to IAM database');
        console.log('  unseed - Remove email features from IAM database');
        console.log('  list   - List registered email features');
        process.exit(1);
    }

    process.exit(0);
  })().catch((error) => {
    logger.error({ error }, 'Script failed');
    process.exit(1);
  });
}
