# Database Migrations

This directory contains SQL migration files for database schema changes.

## Running Migrations

### Manual Migration (Recommended for now)

Connect to your PostgreSQL database and run the SQL files in order:

```bash
# Using psql
psql $DATABASE_URL -f src/shared/db/migrations/001_add_auth_provider_columns.sql

# Or using your PostgreSQL client
```

### Verify Migration

After running, verify the changes:

```sql
-- Check new columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('auth_provider', 'external_id', 'external_metadata');

-- Check existing users have 'inhouse' provider
SELECT id, email, auth_provider FROM users LIMIT 5;
```

## Migration Files

- `001_add_auth_provider_columns.sql` - Adds auth provider support (in-house, Cognito, Clerk)

## Future: Automated Migrations

For production, consider using a migration tool like:
- Drizzle Kit (already in package.json)
- node-pg-migrate
- knex migrations
