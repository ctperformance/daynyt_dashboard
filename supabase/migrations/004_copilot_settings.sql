-- Add copilot_settings JSONB column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS copilot_settings JSONB DEFAULT '{}';

COMMENT ON COLUMN projects.copilot_settings IS 'Stores Ads Copilot configuration: targetRoas, targetCpa, maxBudgetPerDay, autoScale, periods';
