-- ============================================================
-- Pi Bazaar — Phase 1 Core Schema
-- ============================================================
-- SECURITY NOTE: RLS policies MUST NOT rely on client-side
-- set_config() or any RPC that passes identity data from the
-- client. All identity checks use auth.jwt() ->> 'pi_uid' to
-- read the pi_uid claim directly from the verified custom JWT
-- signed by our server with SUPABASE_JWT_SECRET.
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid       TEXT        UNIQUE NOT NULL,
  pi_username  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── products ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  -- seller_id is the Pi UID of the user who owns this listing.
  -- It references users.pi_uid so we can join without Supabase auth UUIDs.
  seller_id      TEXT           NOT NULL REFERENCES public.users(pi_uid) ON DELETE CASCADE,
  title          TEXT           NOT NULL,
  description    TEXT,
  price_pi       NUMERIC(20, 7) NOT NULL CHECK (price_pi > 0),
  category       TEXT,
  condition      TEXT           CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
  images         TEXT[],
  status         TEXT           NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'sold', 'removed')),
  location_text  TEXT,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- ─── escrow_transactions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID           NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  buyer_id        TEXT           NOT NULL REFERENCES public.users(pi_uid) ON DELETE RESTRICT,
  seller_id       TEXT           NOT NULL REFERENCES public.users(pi_uid) ON DELETE RESTRICT,
  amount_pi       NUMERIC(20, 7) NOT NULL CHECK (amount_pi > 0),
  -- Status may only be changed by trusted server-side service-role code.
  status          TEXT           NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'funded', 'released', 'refunded', 'disputed')),
  pi_payment_id   TEXT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- ─── updated_at triggers ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS products_updated_at ON public.products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS escrow_updated_at ON public.escrow_transactions;
CREATE TRIGGER escrow_updated_at
  BEFORE UPDATE ON public.escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

-- ─── users RLS ───────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- A user may read only their own row.
-- auth.jwt() ->> 'pi_uid' reads the pi_uid claim from the custom JWT
-- signed by our server — it cannot be spoofed by the client.
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING ((auth.jwt() ->> 'pi_uid') = pi_uid);

-- Clients cannot insert, update, or delete users. Only the service role
-- (used by our /api/auth/verify server route) may upsert users.
-- No INSERT / UPDATE / DELETE policies means the anon/authenticated role
-- is implicitly denied those operations.

-- ─── products RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can browse active listings.
CREATE POLICY "products_select_active"
  ON public.products FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      status = 'active'
      OR (auth.jwt() ->> 'pi_uid') = seller_id
    )
  );

-- Sellers may insert their own products; seller_id must match their JWT pi_uid.
CREATE POLICY "products_insert_own"
  ON public.products FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = seller_id
  );

-- Sellers may update only their own products.
CREATE POLICY "products_update_own"
  ON public.products FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = seller_id
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = seller_id
  );

-- Sellers may delete only their own products.
CREATE POLICY "products_delete_own"
  ON public.products FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = seller_id
  );

-- ─── escrow_transactions RLS ─────────────────────────────────────────────────
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;

-- Buyers and sellers involved in a transaction may read it.
CREATE POLICY "escrow_select_participants"
  ON public.escrow_transactions FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      (auth.jwt() ->> 'pi_uid') = buyer_id
      OR (auth.jwt() ->> 'pi_uid') = seller_id
    )
  );

-- SECURITY: No INSERT, UPDATE, or DELETE policies for clients.
-- All escrow mutations MUST go through server-side API routes that use
-- the service role key (supabaseAdmin), which bypasses RLS entirely.
-- This prevents clients from creating, funding, or releasing escrow directly.
