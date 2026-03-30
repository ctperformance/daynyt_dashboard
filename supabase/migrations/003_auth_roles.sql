-- ============================================================
-- DAYNYT Dashboard – Migration 003: User Profiles & Auth Roles
-- Creates user_profiles table with auto-creation trigger
-- ============================================================

-- ── User Profiles ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ── Row Level Security ─────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile
CREATE POLICY "Users read own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users update own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

-- Allow insert for the trigger (runs as SECURITY DEFINER)
-- Service role can always insert (bypasses RLS)

-- ── Auto-create profile on signup ──────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── Ensure role column exists on organization_members ──────
-- (It already exists from schema.sql, but this is idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organization_members' AND column_name = 'role'
  ) THEN
    ALTER TABLE organization_members ADD COLUMN role TEXT NOT NULL DEFAULT 'client_read'
      CHECK (role IN ('super_admin','agency_admin','client_read','client_write'));
  END IF;
END $$;

-- ── Policy for organization_members ────────────────────────
-- Users can see their own memberships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organization_members' AND policyname = 'Users see own memberships'
  ) THEN
    CREATE POLICY "Users see own memberships" ON organization_members
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;
