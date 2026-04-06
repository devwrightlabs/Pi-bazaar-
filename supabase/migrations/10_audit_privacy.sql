-- ============================================================
-- Pi Bazaar — Phase 10: System Auditing & Data Privacy
-- ============================================================
-- This migration adds:
--   1. An append-only `audit_logs` table for immutable action tracking.
--   2. A 'cancelled' status option for escrow_transactions (cron cleanup).
--   3. A BEFORE DELETE trigger on `users` to anonymize financial records
--      (escrow_transactions) while cascading personal data deletion.
--
-- SECURITY NOTE: The audit_logs table enforces strict append-only access.
-- Only the service role (supabaseAdmin) can INSERT or SELECT — no UPDATE
-- or DELETE policies exist, making the log immutable at the RLS layer.
-- ============================================================

-- ─── audit_logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    TEXT        NOT NULL REFERENCES public.users(pi_uid),
  action_type TEXT        NOT NULL
                          CHECK (action_type IN (
                            'kyc_approved',
                            'kyc_rejected',
                            'user_suspended',
                            'user_reinstated',
                            'escrow_refunded',
                            'escrow_released',
                            'dispute_resolved',
                            'product_removed',
                            'user_deleted'
                          )),
  target_id   UUID        NOT NULL,
  details     JSONB       DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by action type and target
CREATE INDEX IF NOT EXISTS audit_logs_action_type_idx
  ON public.audit_logs (action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_target_id_idx
  ON public.audit_logs (target_id);

CREATE INDEX IF NOT EXISTS audit_logs_admin_id_idx
  ON public.audit_logs (admin_id);

-- ─── audit_logs RLS (append-only) ────────────────────────────────────────────
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- No SELECT, INSERT, UPDATE, or DELETE policies for authenticated/anon roles.
-- The service role (supabaseAdmin) bypasses RLS entirely, so it can INSERT
-- and SELECT without explicit policies. Authenticated/anon users are denied
-- all operations by RLS being enabled with zero permissive policies.
--
-- IMPORTANT: No UPDATE or DELETE policies exist — audit_logs is immutable.

-- ─── Add 'cancelled' to escrow_transactions status constraint ────────────────
-- The cron cleanup route sets stale pending transactions to 'cancelled'.
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

-- ─── User deletion: anonymize financial records ──────────────────────────────
-- When a user row is deleted, personal data in related tables (products,
-- notifications) is cascade-deleted (already configured via ON DELETE CASCADE).
-- However, financial records in escrow_transactions must be preserved for
-- platform revenue accounting. This trigger replaces the user's pi_uid with
-- '[deleted]' in buyer_id / seller_id columns before the row is removed.

CREATE OR REPLACE FUNCTION public.anonymize_user_financial_records()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Anonymize escrow_transactions: replace pi_uid with placeholder
  UPDATE public.escrow_transactions
    SET buyer_id = '[deleted]'
    WHERE buyer_id = OLD.pi_uid;

  UPDATE public.escrow_transactions
    SET seller_id = '[deleted]'
    WHERE seller_id = OLD.pi_uid;

  -- Anonymize messages: replace pi_uid with placeholder
  UPDATE public.messages
    SET sender_id = '[deleted]'
    WHERE sender_id = OLD.pi_uid;

  UPDATE public.messages
    SET receiver_id = '[deleted]'
    WHERE receiver_id = OLD.pi_uid;

  -- Anonymize reviews: replace pi_uid with placeholder
  UPDATE public.reviews
    SET reviewer_id = '[deleted]'
    WHERE reviewer_id = OLD.pi_uid;

  UPDATE public.reviews
    SET reviewee_id = '[deleted]'
    WHERE reviewee_id = OLD.pi_uid;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS anonymize_user_on_delete ON public.users;
CREATE TRIGGER anonymize_user_on_delete
  BEFORE DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.anonymize_user_financial_records();

-- ─── Drop the FK on audit_logs.admin_id to avoid cascade issues ──────────────
-- The audit_logs FK to users(pi_uid) would block user deletion or cascade-delete
-- audit entries. Instead, we drop the FK and keep admin_id as a plain text field
-- so audit records survive user deletion (immutable log).
ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_admin_id_fkey;
