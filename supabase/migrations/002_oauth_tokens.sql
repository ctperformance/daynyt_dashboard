-- ============================================================
-- EASE Dashboard – Migration 002: OAuth Tokens
-- Stores OAuth credentials for Meta, Shopify, etc.
-- ============================================================

CREATE TABLE integrations_oauth (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,  -- 'meta', 'shopify'
  access_token        TEXT NOT NULL,  -- encrypted at app level
  refresh_token       TEXT,
  token_expires_at    TIMESTAMPTZ,
  scope               TEXT,
  provider_account_id TEXT,           -- e.g. Meta ad account ID, Shopify store domain
  provider_metadata   JSONB DEFAULT '{}',
  connected_at        TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),

  UNIQUE (project_id, provider)
);

-- Indexes
CREATE INDEX idx_integrations_oauth_project  ON integrations_oauth(project_id);
CREATE INDEX idx_integrations_oauth_provider ON integrations_oauth(project_id, provider);

-- Row Level Security
ALTER TABLE integrations_oauth ENABLE ROW LEVEL SECURITY;

-- Users can see OAuth records for projects they belong to
CREATE POLICY "Users see own integrations" ON integrations_oauth
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Only agency_admin and super_admin can insert/update/delete
CREATE POLICY "Admins manage integrations" ON integrations_oauth
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('super_admin', 'agency_admin')
    )
  );

-- Service role bypass (for API routes using service key)
-- Note: Supabase service_role key bypasses RLS by default

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_integrations_oauth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_integrations_oauth_updated_at
  BEFORE UPDATE ON integrations_oauth
  FOR EACH ROW
  EXECUTE FUNCTION update_integrations_oauth_updated_at();
