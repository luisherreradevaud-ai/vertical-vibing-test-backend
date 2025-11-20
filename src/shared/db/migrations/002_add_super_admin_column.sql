-- Migration: Add super admin support
-- Description: Adds is_super_admin column to users table for god mode access
-- Date: 2025-11-20

-- Add is_super_admin column
ALTER TABLE users
ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN users.is_super_admin IS 'Super admin with full access to all features and companies (dev/staging only)';

-- Create index for quick super admin lookups
CREATE INDEX idx_users_super_admin ON users(is_super_admin) WHERE is_super_admin = true;
