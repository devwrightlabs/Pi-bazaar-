-- ============================================================
-- Pi Bazaar — Phase 10: System Auditing & Data Privacy
-- ============================================================
-- SECURITY NOTE: All RLS policies use auth.jwt() ->> 'pi_uid'
-- to read the pi_uid claim from the verified custom JWT signed
-- by our server — consistent with all prior migrations.
-- ============================================================

-- ─── audit_logs ──────────────────────────────────────────────────────────────
-- Immutable, append-only log for sensitive admin and system actions.
-- Only the service-role client (supabaseAdmin) may INSERT or SELECT.
-- No UPDATE or DELETE policies exist — records are permanent.
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    TEXT        REFERENCES public.users(pi_uid) ON DELETE SET NULL,
  action_type TEXT        NOT NULL,
  target_id   UUID,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookups by action type and chronological ordering.
CREATE INDEX IF NOT EXISTS audit_logs_action_type_idx
  ON public.audit_logs (action_type);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
  ON public.audit_logs (created_at);

-- ─── RLS: audit_logs (append-only, service-role only) ────────────────────────
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: No SELECT, INSERT, UPDATE, or DELETE policies for authenticated
-- users. The service-role client (supabaseAdmin) bypasses RLS entirely and is
-- the only way to INSERT or SELECT audit records. This ensures the log is
-- fully immutable from the client perspective — no UPDATE or DELETE is ever
-- possible, even by admins using the anon/authenticated client.

-- ─── Extend escrow_transactions.status to include 'cancelled' ────────────────
-- The cleanup cron sets stale pending transactions to 'cancelled'.
ALTER TABLE public.escrow_transactions
  DROP CONSTRAINT IF EXISTS escrow_transactions_status_check;

ALTER TABLE public.escrow_transactions
  ADD CONSTRAINT escrow_transactions_status_check
    CHECK (status IN (
      'pending',
      'pending_payment',
      'payment_received',
      'shipped',
      'delivered',
      'completed',
      'funded',
      'released',
      'auto_released',
      'refunded',
      'disputed',
      'cancelled'
    ));

-- ─── Anonymise escrow records on user deletion ───────────────────────────────
-- When a user account is deleted, financial records must be retained for
-- platform revenue accounting. This trigger replaces the user's pi_uid in
-- escrow_transactions with a non-identifiable placeholder so the record
-- persists without any personal data linkage.
CREATE OR REPLACE FUNCTION public.anonymise_escrow_on_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  UPDATE public.escrow_transactions
    SET buyer_id = '[deleted]'
  WHERE buyer_id = OLD.pi_uid;

  UPDATE public.escrow_transactions
    SET seller_id = '[deleted]'
  WHERE seller_id = OLD.pi_uid;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS anonymise_escrow_before_user_delete ON public.users;
CREATE TRIGGER anonymise_escrow_before_user_delete
  BEFORE DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.anonymise_escrow_on_user_delete();
