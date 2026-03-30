-- Add brand_profile JSONB column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS brand_profile JSONB DEFAULT '{}';
