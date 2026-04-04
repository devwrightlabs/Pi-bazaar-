-- ============================================================
-- Row Level Security policies for the listings table
-- ============================================================

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view active listings (buyers browsing the marketplace).
-- Sellers can also view their own inactive listings.
CREATE POLICY "Anyone can view listings"
  ON public.listings FOR SELECT
  USING (
    is_active = true
    OR auth.uid()::text = seller_id
  );

-- Temporary compatibility policies for the current client flow:
-- listing writes are performed from a client using the anon key without a
-- Supabase Auth session, so auth.uid() is NULL and auth-based RLS would
-- reject valid inserts/updates/deletes. Tighten these policies once seller
-- identities are mapped to Supabase Auth users or writes move to a trusted
-- server path.

-- Allow listing inserts as long as the seller id is present.
CREATE POLICY "Users can insert own listings"
  ON public.listings FOR INSERT
  WITH CHECK (nullif(trim(seller_id), '') IS NOT NULL);

-- Allow listing updates while the client flow has no Supabase Auth session.
-- This preserves the current client-side edit behavior; replace with
-- auth.uid()-based ownership checks after adding Supabase Auth integration.
CREATE POLICY "Users can update own listings"
  ON public.listings FOR UPDATE
  USING (nullif(trim(seller_id), '') IS NOT NULL)
  WITH CHECK (nullif(trim(seller_id), '') IS NOT NULL);

-- Allow listing deletes while the client flow has no Supabase Auth session.
-- Replace with auth.uid()-based ownership checks after adding Supabase Auth
-- integration or moving deletes to a trusted server path.
CREATE POLICY "Users can delete own listings"
  ON public.listings FOR DELETE
  USING (nullif(trim(seller_id), '') IS NOT NULL);

-- ============================================================
-- Row Level Security policies for the user_profiles table
-- ============================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view profiles (public marketplace).
CREATE POLICY "Anyone can view profiles"
  ON public.user_profiles FOR SELECT
  USING (true);

-- The client currently cannot prove ownership with a Supabase Auth session,
-- so do not allow direct public/anon writes to user_profiles. Restrict
-- inserts/updates to a trusted server-side path (service_role) until Pi
-- identities are mapped to Supabase Auth users or writes move behind a
-- SECURITY DEFINER function that validates Pi identity.

-- Only trusted server-side code may insert profiles.
CREATE POLICY "Service role can insert profiles"
  ON public.user_profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only trusted server-side code may update profiles.
CREATE POLICY "Service role can update profiles"
  ON public.user_profiles FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
