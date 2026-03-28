-- ============================================================
-- EASE Dashboard – Database Schema (Supabase / PostgreSQL)
-- Phase 0: Auth, Orgs, Projects, Roles
-- Phase 1: Quiz Submissions + Funnel Events
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Organizations ───────────────────────────────────────────
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Projects (one per client / brand) ───────────────────────
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  webhook_secret  TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, slug)
);

-- ── Organization Members (roles) ────────────────────────────
-- Roles: super_admin, agency_admin, client_read, client_write
CREATE TABLE organization_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,  -- references auth.users in Supabase
  role            TEXT NOT NULL DEFAULT 'client_read'
                  CHECK (role IN ('super_admin','agency_admin','client_read','client_write')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

-- ── Integrations (future: Shopify, Meta, Google, etc.) ──────
CREATE TABLE integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,  -- 'shopify', 'meta_ads', 'google_ads', 'tiktok_ads', 'klaviyo'
  credentials     JSONB DEFAULT '{}',  -- encrypted at app level
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','paused','error')),
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Quiz Submissions (Phase 1 – core data) ──────────────────
CREATE TABLE quiz_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Contact
  email           TEXT,
  accepts_marketing BOOLEAN DEFAULT false,

  -- Quiz answers (structured)
  q1_answer       TEXT,    -- "Was beschreibt dich am besten?"
  q2_answer       INT,     -- Stress-Level 1-5 (Emoji-Scale)
  q3_answer       TEXT,    -- "Wie lange geht das schon?"
  q4_answers      TEXT[],  -- Multi-select: body symptoms
  q5_answers      TEXT[],  -- Multi-select: what they've tried
  q6_answer       TEXT,    -- "Beeinflusst es deinen Alltag?"
  q7_answer       TEXT,    -- "Was wünschst du dir am meisten?"

  -- Computed
  stress_score    INT,     -- 0-100
  tags            TEXT[],  -- e.g. ['newsletter','nervensystem-check','stress-72']

  -- Raw payload for flexibility
  raw_payload     JSONB,

  -- Metadata
  submitted_at    TIMESTAMPTZ DEFAULT now(),
  ip_country      TEXT,
  user_agent      TEXT,

  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Quiz Funnel Events (track drop-offs) ────────────────────
CREATE TABLE quiz_funnel_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_id      TEXT NOT NULL,        -- anonymous session identifier
  step            TEXT NOT NULL,        -- 'intro','q1','q2',...,'loading','email','result'
  timestamp       TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_quiz_submissions_project    ON quiz_submissions(project_id);
CREATE INDEX idx_quiz_submissions_date       ON quiz_submissions(submitted_at);
CREATE INDEX idx_quiz_submissions_stress     ON quiz_submissions(stress_score);
CREATE INDEX idx_quiz_funnel_project_session ON quiz_funnel_events(project_id, session_id);
CREATE INDEX idx_quiz_funnel_step            ON quiz_funnel_events(project_id, step, timestamp);
CREATE INDEX idx_org_members_user            ON organization_members(user_id);

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_funnel_events   ENABLE ROW LEVEL SECURITY;

-- Users can only see orgs they belong to
CREATE POLICY "Users see own orgs" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

-- Users can only see projects of their orgs
CREATE POLICY "Users see own projects" ON projects
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

-- Quiz data scoped to projects the user can see
CREATE POLICY "Users see quiz data" ON quiz_submissions
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users see funnel data" ON quiz_funnel_events
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid()
    )
  );
