import { pgTable, uuid, varchar, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

/**
 * Users table schema
 *
 * Stores user account information
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }), // Nullable - not required for external auth
  name: varchar('name', { length: 100 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  emailVerified: boolean('email_verified').notNull().default(false),
  authProvider: varchar('auth_provider', { length: 20 }).notNull().default('inhouse'), // 'inhouse' | 'cognito' | 'clerk'
  externalId: varchar('external_id', { length: 255 }), // Provider's user ID (null for in-house)
  externalMetadata: jsonb('external_metadata'), // Provider-specific data
  isSuperAdmin: boolean('is_super_admin').notNull().default(false), // Super admin with full access (dev/staging only)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
