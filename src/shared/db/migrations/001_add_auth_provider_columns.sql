-- Migration: Add auth provider columns to users table
-- Date: 2025-11-20
-- Description: Adds support for multiple authentication providers (in-house, Cognito, Clerk)

-- Add new columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'inhouse' NOT NULL,
ADD COLUMN IF NOT EXISTS external_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS external_metadata JSONB;

-- Make password_hash nullable (external auth users don't have passwords)
ALTER TABLE users
ALTER COLUMN password_hash DROP NOT NULL;

-- Set existing users to in-house auth provider
UPDATE users
SET auth_provider = 'inhouse'
WHERE auth_provider IS NULL OR auth_provider = '';

-- Create index on auth_provider for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

-- Create index on external_id for external auth lookups
CREATE INDEX IF NOT EXISTS idx_users_external_id ON users(external_id) WHERE external_id IS NOT NULL;

-- Add check constraint for auth_provider values
ALTER TABLE users
ADD CONSTRAINT chk_auth_provider
CHECK (auth_provider IN ('inhouse', 'cognito', 'clerk'));

-- Add constraint: in-house users must have password_hash
-- (We'll enforce this in application logic for now, not in DB)

COMMENT ON COLUMN users.auth_provider IS 'Authentication provider: inhouse, cognito, or clerk';
COMMENT ON COLUMN users.external_id IS 'User ID from external auth provider (null for in-house)';
COMMENT ON COLUMN users.external_metadata IS 'Provider-specific metadata stored as JSON';
