-- ============================================================
-- Pi Bazaar — Orders Table
-- ============================================================
-- Tracks orders placed through the marketplace. An order is
-- created when a buyer purchases a listing.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id          UUID           NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  buyer_id            TEXT           NOT NULL REFERENCES public.users(pi_uid) ON DELETE RESTRICT,
  seller_id           TEXT           NOT NULL REFERENCES public.users(pi_uid) ON DELETE RESTRICT,
  amount_pi           NUMERIC(20, 7) NOT NULL CHECK (amount_pi > 0),
  status              TEXT           NOT NULL DEFAULT 'pending'
                                     CHECK (status IN (
                                       'pending',
                                       'paid',
                                       'shipped',
                                       'delivered',
                                       'completed',
                                       'cancelled',
                                       'disputed'
                                     )),
  pi_payment_id       TEXT,
  shipping_address_id UUID           REFERENCES public.saved_addresses(id) ON DELETE SET NULL,
  tracking_number     TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- Reuse the shared set_updated_at() trigger function.
DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Index for buyer/seller lookups
CREATE INDEX IF NOT EXISTS orders_buyer_id_idx ON public.orders (buyer_id);
CREATE INDEX IF NOT EXISTS orders_seller_id_idx ON public.orders (seller_id);
CREATE INDEX IF NOT EXISTS orders_listing_id_idx ON public.orders (listing_id);

-- ─── RLS: orders ─────────────────────────────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Buyers and sellers involved in an order may read it.
CREATE POLICY "orders_select_participants"
  ON public.orders FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      (auth.jwt() ->> 'pi_uid') = buyer_id
      OR (auth.jwt() ->> 'pi_uid') = seller_id
    )
  );

-- SECURITY: No INSERT, UPDATE, or DELETE policies for clients.
-- All order mutations go through server-side API routes using supabaseAdmin.
