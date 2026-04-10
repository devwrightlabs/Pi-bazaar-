-- ============================================================
-- Pi Bazaar — Schema Consolidation
-- ============================================================
-- This migration bridges the numbered migrations (01–10), which
-- used the original `products` table, with the later migrations
-- (11+) and 20260404 files that reference `listings`.
--
-- It also creates the missing tables that the application code
-- depends on but were never added to any prior migration.
--
-- SECURITY NOTE: All RLS policies use auth.jwt() ->> 'pi_uid'
-- to read the pi_uid claim from the verified custom JWT signed
-- by our server — consistent with all prior migrations.
-- ============================================================

-- ─── 1. Rename products → listings ───────────────────────────────────────────
-- PostgreSQL automatically redirects any foreign-key constraints
-- that pointed to public.products so they now point to public.listings.
ALTER TABLE public.products RENAME TO listings;

-- Rename the updated_at trigger to match the new table name.
DROP TRIGGER IF EXISTS products_updated_at ON public.listings;
CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 2. Fix listings column names / add missing columns ───────────────────────

-- Rename price_pi → price_in_pi to match the application type (ListingRow).
ALTER TABLE public.listings RENAME COLUMN price_pi TO price_in_pi;

-- Drop the auto-generated price check so we can recreate it with the new name.
ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS products_price_pi_check,
  DROP CONSTRAINT IF EXISTS listings_price_in_pi_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_price_in_pi_check CHECK (price_in_pi > 0);

-- Drop the old single-text location field and replace with discrete columns.
-- Using NOT NULL with safe defaults (0/empty string) is intentional: on a
-- fresh supabase db push there are no existing rows, and the application
-- always supplies these values at insert time (see /api/products POST).
ALTER TABLE public.listings DROP COLUMN IF EXISTS location_text;
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS location_lat  DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS location_lng  DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS city          TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS country       TEXT NOT NULL DEFAULT '';

-- Additional columns required by ListingRow in database.types.ts.
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS is_boosted   BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_offers BOOLEAN              DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;

-- Extend the condition check to include values allowed by the application.
ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS products_condition_check,
  DROP CONSTRAINT IF EXISTS listings_condition_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_condition_check
    CHECK (condition IS NULL OR condition IN ('new', 'like_new', 'good', 'fair', 'poor'));

-- ─── 3. Fix listings RLS policies ────────────────────────────────────────────
-- Drop the old policies that were created under the products table name.
-- The 20260404_rls_policies.sql migration will create the replacement policies.
DROP POLICY IF EXISTS "products_select_active" ON public.listings;
DROP POLICY IF EXISTS "products_insert_own" ON public.listings;
DROP POLICY IF EXISTS "products_update_own" ON public.listings;
DROP POLICY IF EXISTS "products_delete_own" ON public.listings;

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- ─── 4. Fix users table ───────────────────────────────────────────────────────

-- Rename pi_username → username to match UserRow in database.types.ts.
ALTER TABLE public.users RENAME COLUMN pi_username TO username;

-- Add the remaining columns required by UserRow.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email       TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url  TEXT,
  ADD COLUMN IF NOT EXISTS bio         TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- ─── 5. Fix escrow_transactions: update FKs + add missing columns ─────────────

-- Ensure the FK constraints reference the renamed listings table.
-- (PostgreSQL renames the FK target automatically on table rename, but we
-- recreate the constraints explicitly to guarantee the correct name.)
ALTER TABLE public.escrow_transactions
  DROP CONSTRAINT IF EXISTS escrow_transactions_listing_id_fkey,
  DROP CONSTRAINT IF EXISTS escrow_transactions_product_id_fkey;
ALTER TABLE public.escrow_transactions
  ADD CONSTRAINT escrow_transactions_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE RESTRICT,
  ADD CONSTRAINT escrow_transactions_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.listings(id) ON DELETE RESTRICT;

-- Add columns required by the EscrowTransaction TypeScript type.
ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS escrow_fee_pi      NUMERIC(20, 7) NOT NULL DEFAULT 0 CHECK (escrow_fee_pi >= 0),
  ADD COLUMN IF NOT EXISTS net_amount_pi      NUMERIC(20, 7) NOT NULL DEFAULT 0 CHECK (net_amount_pi >= 0),
  ADD COLUMN IF NOT EXISTS product_type       TEXT CHECK (product_type IS NULL OR product_type IN ('physical', 'digital')),
  ADD COLUMN IF NOT EXISTS tracking_number    TEXT,
  ADD COLUMN IF NOT EXISTS shipping_carrier   TEXT,
  ADD COLUMN IF NOT EXISTS delivery_proof     TEXT,
  ADD COLUMN IF NOT EXISTS buyer_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seller_shipped_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_release_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  ADD COLUMN IF NOT EXISTS dispute_reason     TEXT;

-- For any existing escrow rows the column defaulted to now()+7d, which is
-- only meaningful for new transactions. Back-fill using each row's own
-- created_at so the intent (7 days from creation) is preserved.
UPDATE public.escrow_transactions
  SET auto_release_at = created_at + INTERVAL '7 days'
  WHERE auto_release_at IS NOT NULL
    AND auto_release_at <> created_at + INTERVAL '7 days';

-- ─── 6. Fix messages: update FK reference ─────────────────────────────────────
-- The messages.product_id FK was automatically redirected to listings on rename.
-- Drop and recreate it with an explicit name for clarity.
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_product_id_fkey;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.listings(id) ON DELETE SET NULL;

-- ─── 7. user_profiles ─────────────────────────────────────────────────────────
-- Required by 20260404_rls_policies.sql which enables RLS and creates policies
-- on this table. Created here so that migration can succeed.
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid      TEXT        NOT NULL UNIQUE REFERENCES public.users(pi_uid) ON DELETE CASCADE,
  username    TEXT        NOT NULL,
  avatar_url  TEXT,
  bio         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ─── 8. conversations ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1   TEXT        NOT NULL REFERENCES public.users(pi_uid) ON DELETE CASCADE,
  participant_2   TEXT        NOT NULL REFERENCES public.users(pi_uid) ON DELETE CASCADE,
  last_message    TEXT        NOT NULL DEFAULT '',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversations_no_self_chat
    CHECK (participant_1 <> participant_2),
  CONSTRAINT conversations_unique_participants
    UNIQUE (participant_1, participant_2)
);

CREATE INDEX IF NOT EXISTS conversations_participant_1_idx
  ON public.conversations (participant_1);
CREATE INDEX IF NOT EXISTS conversations_participant_2_idx
  ON public.conversations (participant_2);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select_participants"
  ON public.conversations FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      (auth.jwt() ->> 'pi_uid') = participant_1
      OR (auth.jwt() ->> 'pi_uid') = participant_2
    )
  );

CREATE POLICY "conversations_insert_own"
  ON public.conversations FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      (auth.jwt() ->> 'pi_uid') = participant_1
      OR (auth.jwt() ->> 'pi_uid') = participant_2
    )
  );

CREATE POLICY "conversations_update_participants"
  ON public.conversations FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (
      (auth.jwt() ->> 'pi_uid') = participant_1
      OR (auth.jwt() ->> 'pi_uid') = participant_2
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      (auth.jwt() ->> 'pi_uid') = participant_1
      OR (auth.jwt() ->> 'pi_uid') = participant_2
    )
  );

-- ─── 9. typing_indicators ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         TEXT        NOT NULL REFERENCES public.users(pi_uid) ON DELETE CASCADE,
  is_typing       BOOLEAN     NOT NULL DEFAULT false,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT typing_indicators_unique UNIQUE (conversation_id, user_id)
);

DROP TRIGGER IF EXISTS typing_indicators_updated_at ON public.typing_indicators;
CREATE TRIGGER typing_indicators_updated_at
  BEFORE UPDATE ON public.typing_indicators
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "typing_indicators_select_participants"
  ON public.typing_indicators FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          (auth.jwt() ->> 'pi_uid') = c.participant_1
          OR (auth.jwt() ->> 'pi_uid') = c.participant_2
        )
    )
  );

CREATE POLICY "typing_indicators_upsert_own"
  ON public.typing_indicators FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

CREATE POLICY "typing_indicators_update_own"
  ON public.typing_indicators FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

-- ─── 10. user_preferences ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT        NOT NULL UNIQUE REFERENCES public.users(pi_uid) ON DELETE CASCADE,
  color_background  TEXT        NOT NULL DEFAULT '#FFFFFF',
  color_gold        TEXT        NOT NULL DEFAULT '#D4A017',
  color_card_bg     TEXT        NOT NULL DEFAULT '#F5F5F5',
  color_text        TEXT        NOT NULL DEFAULT '#1A1A1A',
  color_subtext     TEXT        NOT NULL DEFAULT '#666666',
  theme_name        TEXT        NOT NULL DEFAULT 'default',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_preferences_select_own"
  ON public.user_preferences FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

CREATE POLICY "user_preferences_insert_own"
  ON public.user_preferences FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

CREATE POLICY "user_preferences_update_own"
  ON public.user_preferences FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

-- ─── 11. shipping_addresses ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shipping_addresses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT        NOT NULL REFERENCES public.users(pi_uid) ON DELETE CASCADE,
  full_name       TEXT        NOT NULL,
  address_line_1  TEXT        NOT NULL,
  address_line_2  TEXT,
  city            TEXT        NOT NULL,
  state_province  TEXT        NOT NULL,
  postal_code     TEXT        NOT NULL,
  country         TEXT        NOT NULL,
  phone           TEXT,
  is_default      BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipping_addresses_user_id_idx
  ON public.shipping_addresses (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS shipping_addresses_one_default_per_user
  ON public.shipping_addresses (user_id)
  WHERE is_default = true;

ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shipping_addresses_select_own"
  ON public.shipping_addresses FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

CREATE POLICY "shipping_addresses_insert_own"
  ON public.shipping_addresses FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

CREATE POLICY "shipping_addresses_update_own"
  ON public.shipping_addresses FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

CREATE POLICY "shipping_addresses_delete_own"
  ON public.shipping_addresses FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

-- ─── 12. orders ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id          UUID           NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  buyer_id            TEXT           NOT NULL REFERENCES public.users(pi_uid) ON DELETE RESTRICT,
  seller_id           TEXT           NOT NULL REFERENCES public.users(pi_uid) ON DELETE RESTRICT,
  amount_pi           NUMERIC(20, 7) NOT NULL CHECK (amount_pi > 0),
  status              TEXT           NOT NULL DEFAULT 'pending'
                                     CHECK (status IN (
                                       'pending', 'paid', 'shipped',
                                       'delivered', 'completed',
                                       'cancelled', 'disputed'
                                     )),
  pi_payment_id       TEXT,
  shipping_address_id UUID           REFERENCES public.shipping_addresses(id) ON DELETE SET NULL,
  tracking_number     TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_buyer_id_idx    ON public.orders (buyer_id);
CREATE INDEX IF NOT EXISTS orders_seller_id_idx   ON public.orders (seller_id);
CREATE INDEX IF NOT EXISTS orders_listing_id_idx  ON public.orders (listing_id);

DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_participants"
  ON public.orders FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      (auth.jwt() ->> 'pi_uid') = buyer_id
      OR (auth.jwt() ->> 'pi_uid') = seller_id
    )
  );

-- ─── 13. escrow_timeline ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.escrow_timeline (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id   UUID        NOT NULL REFERENCES public.escrow_transactions(id) ON DELETE CASCADE,
  event       TEXT        NOT NULL,
  description TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS escrow_timeline_escrow_id_idx
  ON public.escrow_timeline (escrow_id, created_at);

ALTER TABLE public.escrow_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escrow_timeline_select_participants"
  ON public.escrow_timeline FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.escrow_transactions et
      WHERE et.id = escrow_id
        AND (
          (auth.jwt() ->> 'pi_uid') = et.buyer_id
          OR (auth.jwt() ->> 'pi_uid') = et.seller_id
        )
    )
  );

-- ─── 14. kyc_disputes ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kyc_disputes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT        NOT NULL REFERENCES public.users(pi_uid) ON DELETE CASCADE,
  reason      TEXT,
  status      TEXT        NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'resolved', 'rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kyc_disputes_user_id_idx
  ON public.kyc_disputes (user_id);

ALTER TABLE public.kyc_disputes ENABLE ROW LEVEL SECURITY;

-- Only the service role (supabaseAdmin) may manage KYC disputes.
-- No client-facing policies are created here.

-- ─── 15. Update search indexes to reference listings ──────────────────────────
-- The 05_search_indexing.sql migration created indexes on public.products.
-- After the table rename those indexes still exist but reference the renamed
-- table; however the index names contain "products_" which may be confusing.
-- We create new equivalents with consistent names and drop the stale ones.
DROP INDEX IF EXISTS public.products_title_trgm_idx;
DROP INDEX IF EXISTS public.products_description_trgm_idx;
DROP INDEX IF EXISTS public.products_status_category_idx;

CREATE INDEX IF NOT EXISTS listings_title_trgm_idx
  ON public.listings USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS listings_description_trgm_idx
  ON public.listings USING GIN (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS listings_status_category_idx
  ON public.listings (status, category);

-- Soft-delete index: most queries filter out deleted rows.
CREATE INDEX IF NOT EXISTS listings_deleted_at_idx
  ON public.listings (deleted_at)
  WHERE deleted_at IS NULL;
