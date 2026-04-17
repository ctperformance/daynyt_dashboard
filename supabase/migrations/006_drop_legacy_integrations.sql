-- Drop legacy, unused `integrations` table (superseded by integrations_oauth).
-- This table had NO RLS policies and was a latent cross-tenant leak vector.

DROP TABLE IF EXISTS public.integrations CASCADE;
