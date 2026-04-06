-- ============================================================
-- Pi Bazaar — Phase 8: Global Fiat Exchange Engine & Shipping
-- ============================================================
-- Creates the exchange_rates table for storing Pi-to-fiat
-- conversion rates and adds carrier tracking columns to
-- escrow_transactions for shipping webhook integration.
--
-- SECURITY NOTE: All RLS policies use auth.jwt() ->> 'pi_uid'
-- to read the pi_uid claim from the verified custom JWT signed
-- by our server — consistent with all prior migrations.
-- ============================================================

-- ─── exchange_rates ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  fiat_currency_code  TEXT        NOT NULL UNIQUE,
  pi_rate             NUMERIC     NOT NULL CHECK (pi_rate > 0),
  last_updated        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── RLS: exchange_rates ─────────────────────────────────────────────────────
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read exchange rates — public market data.
CREATE POLICY "exchange_rates_select_public"
  ON public.exchange_rates FOR SELECT
  USING (true);

-- Only the service role (supabaseAdmin) may insert exchange rates.
-- No INSERT policy for anon/authenticated means those roles are denied.
CREATE POLICY "exchange_rates_insert_service"
  ON public.exchange_rates FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only the service role (supabaseAdmin) may update exchange rates.
CREATE POLICY "exchange_rates_update_service"
  ON public.exchange_rates FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Only the service role (supabaseAdmin) may delete exchange rates.
CREATE POLICY "exchange_rates_delete_service"
  ON public.exchange_rates FOR DELETE
  TO service_role
  USING (true);

-- ─── Add carrier tracking columns to escrow_transactions ─────────────────────
ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS carrier_tracking_id     TEXT,
  ADD COLUMN IF NOT EXISTS carrier_webhook_status   TEXT;

-- Ensure shipping webhook lookups by tracking ID are fast and unambiguous.
-- Use a partial unique index so NULL values remain allowed while non-NULL
-- carrier tracking IDs cannot be duplicated.
CREATE UNIQUE INDEX IF NOT EXISTS escrow_transactions_carrier_tracking_id_uidx
  ON public.escrow_transactions (carrier_tracking_id)
  WHERE carrier_tracking_id IS NOT NULL;
-- ─── Extend notify_escrow_update for delivered status ────────────────────────
-- Replace the existing trigger function to also notify buyers when a package
-- is delivered, reminding them to confirm receipt and release funds.
CREATE OR REPLACE FUNCTION public.notify_escrow_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Only fire when the status column actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Notify buyer when the item has been shipped
  IF NEW.status = 'shipped' THEN
    INSERT INTO public.notifications (user_id, type, reference_id, message)
    SELECT
      NEW.buyer_id,
      'escrow_update',
      NEW.id,
      'Your order has been shipped.'
    WHERE EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.pi_uid = NEW.buyer_id
    );
  END IF;

  -- Notify buyer when the package is delivered — remind to confirm and release
  IF NEW.status = 'delivered' THEN
    INSERT INTO public.notifications (user_id, type, reference_id, message)
    SELECT
      NEW.buyer_id,
      'escrow_update',
      NEW.id,
      'Your package has been delivered. Please confirm receipt and release funds.'
    WHERE EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.pi_uid = NEW.buyer_id
    );
  END IF;

  -- Notify seller when the escrow has been funded (payment received)
  IF NEW.status = 'funded' THEN
    INSERT INTO public.notifications (user_id, type, reference_id, message)
    SELECT
      NEW.seller_id,
      'escrow_update',
      NEW.id,
      'Your escrow has been funded. Please ship the item.'
    WHERE EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.pi_uid = NEW.seller_id
    );
  END IF;

  RETURN NEW;
END;
$$;
