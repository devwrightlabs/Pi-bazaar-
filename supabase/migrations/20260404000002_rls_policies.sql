-- ============================================================
-- Row Level Security policies for the listings table
-- ============================================================
-- These policies complement the base RLS from 01_init_schema
-- by providing wider public access for the marketplace browse
-- flow and temporary compatibility policies for the current
-- client flow that does not yet map Pi identities to Supabase
-- Auth users.
-- ============================================================

-- Drop existing policies first to avoid conflicts with init_schema policies
DROP POLICY IF EXISTS "listings_select_active" ON public.listings;
DROP POLICY IF EXISTS "listings_insert_own" ON public.listings;
DROP POLICY IF EXISTS "listings_update_own" ON public.listings;
DROP POLICY IF EXISTS "listings_delete_own" ON public.listings;

-- Anyone can view active listings (buyers browsing the marketplace).
-- Sellers can also view their own inactive listings.
CREATE POLICY "Anyone can view listings"
  ON public.listings FOR SELECT
  USING (
    status = 'active'
    OR auth.uid()::text = seller_id
  );

-- Temporary compatibility policy for inserts:
-- listing creation is currently performed from a client using the anon key
-- without a Supabase Auth session, so auth.uid() is NULL and auth-based RLS
-- would reject inserts. Tighten this once seller identities are mapped to
-- Supabase Auth users or inserts move to a trusted server path.

-- Allow listing inserts as long as the seller id is present.
CREATE POLICY "Users can insert own listings"
  ON public.listings FOR INSERT
  WITH CHECK (nullif(trim(seller_id), '') IS NOT NULL);

-- Only trusted server-side code may update listings until ownership can be
-- enforced with a real authenticated identity mapping.
CREATE POLICY "Service role can update listings"
  ON public.listings FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Only trusted server-side code may delete listings until ownership can be
-- enforced with a real authenticated identity mapping.
CREATE POLICY "Service role can delete listings"
  ON public.listings FOR DELETE
  TO service_role
  USING (true);
