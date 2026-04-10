-- ============================================================
-- Row Level Security policies for the listings table
-- ============================================================

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view active listings (buyers browsing the marketplace).
-- Sellers can also view their own inactive listings.
CREATE POLICY "Anyone can view listings"
  ON public.listings FOR SELECT
  USING (
    status = 'active'
    OR auth.uid()::text = seller_id
  );

-- Temporary compatibility policies for the current client flow:
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
