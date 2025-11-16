/**
 * PostgreSQL Database Connection
 *
 * Configures and exports the Drizzle ORM PostgreSQL client
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as iamSchema from './schema/iam.schema';

// Database URL from environment (required)
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is required. Please set it in your .env file.\n' +
    'Example: DATABASE_URL=postgresql://user:password@localhost:5432/vertical_vibing'
  );
}

/**
 * PostgreSQL client connection
 */
let pgClient: postgres.Sql | null = null;
let drizzleDb: ReturnType<typeof drizzle> | null = null;

/**
 * Get or create PostgreSQL connection
 */
export function getPostgresClient() {

  if (!pgClient) {
    console.log('[Database] Connecting to PostgreSQL...');

    pgClient = postgres(DATABASE_URL, {
      max: 10, // Maximum connections
      idle_timeout: 20, // Seconds
      connect_timeout: 10, // Seconds
    });

    drizzleDb = drizzle(pgClient, {
      schema: iamSchema,
      logger: process.env.NODE_ENV === 'development',
    });

    console.log('[Database] PostgreSQL connection established');
  }

  return drizzleDb!;
}

/**
 * Close PostgreSQL connection (for graceful shutdown)
 */
export async function closePostgresClient() {
  if (pgClient) {
    console.log('[Database] Closing PostgreSQL connection...');
    await pgClient.end();
    pgClient = null;
    drizzleDb = null;
    console.log('[Database] PostgreSQL connection closed');
  }
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const db = getPostgresClient();
    await db.execute(postgres.sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error('[Database] Health check failed:', error);
    return false;
  }
}
