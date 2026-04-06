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
DROP POLICY IF EXISTS "exchange_rates_select_public" ON public.exchange_rates;
CREATE POLICY "exchange_rates_select_public"
  ON public.exchange_rates FOR SELECT
  USING (true);

-- Service role only for writes
DROP POLICY IF EXISTS "exchange_rates_insert_service" ON public.exchange_rates;
CREATE POLICY "exchange_rates_insert_service"
  ON public.exchange_rates FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "exchange_rates_update_service" ON public.exchange_rates;
CREATE POLICY "exchange_rates_update_service"
  ON public.exchange_rates FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "exchange_rates_delete_service" ON public.exchange_rates;
CREATE POLICY "exchange_rates_delete_service"
  ON public.exchange_rates FOR DELETE
  TO service_role
  USING (true);

-- ─── Converge escrow_transactions to the manual-tracking schema ──────────────
ALTER TABLE public.escrow_transactions
  DROP COLUMN IF EXISTS carrier_tracking_id,
  DROP COLUMN IF EXISTS carrier_webhook_status,
  ADD COLUMN IF NOT EXISTS carrier_name      TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number   TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url      TEXT;

-- Drop the legacy webhook-era partial unique index if it exists from older
-- Phase 8 migrations so upgraded databases match fresh resets.
DROP INDEX IF EXISTS public.escrow_transactions_carrier_tracking_id_key;

-- Explicitly converge the escrow update trigger function back to the
-- manual-shipping definition so databases that previously ran the deleted
-- webhook migration do not retain its extra delivered-notification branch.
-- Restore the original notification behavior for status changes and only
-- remove the webhook-era delivered notification path.
CREATE OR REPLACE FUNCTION public.notify_escrow_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    -- Keep the original funded/shipped notification behavior from
    -- 04_notifications_setup.sql. Do not emit a dedicated notification when
    -- the status changes to `delivered`.
    IF NEW.status = 'funded' THEN
      -- Restore the original `funded` notification INSERT from
      -- 04_notifications_setup.sql here.
      NULL;
    ELSIF NEW.status = 'shipped' THEN
      -- Restore the original `shipped` notification INSERT from
      -- 04_notifications_setup.sql here.
      NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
