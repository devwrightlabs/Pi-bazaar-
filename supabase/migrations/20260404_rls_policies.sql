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

-- Temporary compatibility policies for the current client flow:
-- the app writes user_profiles after Pi authentication but without a
-- Supabase Auth session, so auth.uid() is NULL and auth-based RLS would
-- reject valid inserts/updates. Tighten these policies once Pi identities
-- are mapped to Supabase Auth users or writes move to a trusted server path.

-- Allow profile inserts as long as the Pi user id is present.
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (nullif(trim(pi_uid), '') IS NOT NULL);

-- Allow profile updates while the client flow has no Supabase Auth session.
-- This preserves the current upsert behavior; replace with auth.uid()-based
-- ownership checks after adding Supabase Auth integration.
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (nullif(trim(pi_uid), '') IS NOT NULL)
  WITH CHECK (nullif(trim(pi_uid), '') IS NOT NULL);
