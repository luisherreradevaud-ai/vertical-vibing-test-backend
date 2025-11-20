import bcrypt from 'bcrypt';
import { db } from '../db/client';
import { users } from '../db/schema/users.schema';
import { eq } from 'drizzle-orm';

/**
 * Super Admin Bootstrap Service
 *
 * Automatically creates or updates the super admin user on application startup
 * Only enabled in development and staging environments
 */
export class SuperAdminBootstrapService {
  private static readonly ALLOWED_ENVIRONMENTS = ['development', 'staging'];

  /**
   * Initialize super admin user
   *
   * Creates or updates the super admin account based on environment variables
   * Safety: Only runs in development/staging environments
   */
  static async initialize(): Promise<void> {
    const environment = process.env.NODE_ENV || 'development';
    const isEnabled = process.env.SUPER_ADMIN_ENABLED === 'true';
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    // Safety check: Prevent super admin in production
    if (!this.ALLOWED_ENVIRONMENTS.includes(environment)) {
      console.log('⚠️  Super admin disabled in production environment');
      return;
    }

    // Check if super admin is enabled
    if (!isEnabled) {
      console.log('ℹ️  Super admin disabled (SUPER_ADMIN_ENABLED=false)');
      return;
    }

    // Validate required environment variables
    if (!email || !password) {
      console.warn(
        '⚠️  Super admin enabled but credentials missing. Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD'
      );
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Invalid super admin email format');
      return;
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      console.error('❌ Super admin password must be at least 8 characters');
      return;
    }

    try {
      // Check if super admin already exists
      const existingUsers = await db.select().from(users).where(eq(users.email, email));

      const passwordHash = await bcrypt.hash(password, 10);

      if (existingUsers.length > 0) {
        // Update existing user to super admin
        await db
          .update(users)
          .set({
            isSuperAdmin: true,
            passwordHash,
            authProvider: 'inhouse',
            updatedAt: new Date(),
          })
          .where(eq(users.email, email));

        console.log(`🔐 Super admin updated: ${email}`);
      } else {
        // Create new super admin user
        await db.insert(users).values({
          email,
          passwordHash,
          name: 'Super Admin',
          emailVerified: true,
          authProvider: 'inhouse',
          isSuperAdmin: true,
          avatarUrl: null,
          externalId: null,
          externalMetadata: null,
        });

        console.log(`✅ Super admin created: ${email}`);
      }

      console.log('🦸 Super admin mode: ENABLED');
      console.log(`   Environment: ${environment}`);
      console.log(`   Email: ${email}`);
    } catch (error) {
      console.error('❌ Failed to initialize super admin:', error);
      throw error;
    }
  }

  /**
   * Disable all super admin accounts
   *
   * Useful for cleanup or testing
   */
  static async disableAllSuperAdmins(): Promise<void> {
    try {
      const result = await db.update(users).set({ isSuperAdmin: false }).where(eq(users.isSuperAdmin, true));

      console.log('✅ All super admin privileges revoked');
    } catch (error) {
      console.error('❌ Failed to disable super admins:', error);
      throw error;
    }
  }
}
