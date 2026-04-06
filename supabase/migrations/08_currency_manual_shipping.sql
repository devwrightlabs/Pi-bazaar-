-- ============================================================
-- Pi Bazaar — Phase 8: Global Fiat Exchange Engine & Manual Shipping
-- ============================================================
-- Creates the exchange_rates table for storing Pi-to-fiat conversion
-- rates, and adds carrier-agnostic manual tracking columns to
-- escrow_transactions.
--
-- NO webhook columns, NO webhook triggers, NO carrier_tracking_id.
-- ============================================================

-- ─── exchange_rates ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  fiat_currency_code  TEXT        NOT NULL UNIQUE CHECK (fiat_currency_code = upper(fiat_currency_code)),
  pi_rate             NUMERIC     NOT NULL CHECK (pi_rate > 0),
  last_updated        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── RLS: exchange_rates ─────────────────────────────────────────────────────
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "exchange_rates_select_public"
  ON public.exchange_rates FOR SELECT
  USING (true);

-- Service role only for writes
CREATE POLICY "exchange_rates_insert_service"
  ON public.exchange_rates FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "exchange_rates_update_service"
  ON public.exchange_rates FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "exchange_rates_delete_service"
  ON public.exchange_rates FOR DELETE
  TO service_role
  USING (true);

-- ─── Add carrier-agnostic manual tracking columns to escrow_transactions ─────
ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS carrier_name      TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number   TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url      TEXT;
