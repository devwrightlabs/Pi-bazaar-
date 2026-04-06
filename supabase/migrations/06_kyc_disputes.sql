-- ============================================================
-- Pi Bazaar — Phase 6: KYC Verification & Dispute Resolution
-- ============================================================
-- SECURITY NOTE: All RLS policies use auth.jwt() ->> 'pi_uid'
-- to read the pi_uid claim from the verified custom JWT signed
-- by our server — consistent with all prior migrations.
-- ============================================================

-- ─── Add is_kyc_verified to users ────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_kyc_verified BOOLEAN NOT NULL DEFAULT false;

-- ─── kyc_records ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kyc_records (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT        NOT NULL UNIQUE REFERENCES public.users(pi_uid) ON DELETE CASCADE,
  document_type     TEXT        NOT NULL
                                CHECK (document_type IN ('passport', 'national_id', 'drivers_license')),
  document_url      TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason  TEXT,
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS kyc_records_user_id_idx
  ON public.kyc_records (user_id);

-- ─── RLS: kyc_records ────────────────────────────────────────────────────────
ALTER TABLE public.kyc_records ENABLE ROW LEVEL SECURITY;

-- Users can SELECT only their own KYC records
CREATE POLICY "kyc_select_own"
  ON public.kyc_records FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

-- Users can INSERT only their own KYC records
CREATE POLICY "kyc_insert_own"
  ON public.kyc_records FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

-- SECURITY: No UPDATE or DELETE policies for authenticated clients.
-- Only the service role (supabaseAdmin) can UPDATE the KYC status.
-- This ensures only trusted server-side admin processes can approve or
-- reject KYC submissions.

-- ─── Add admin_notes to escrow_transactions ──────────────────────────────────
ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- ─── Extend notification types to include 'dispute' ─────────────────────────
-- Drop the existing CHECK constraint and recreate it with the new value.
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('escrow_update', 'new_message', 'new_review', 'dispute'));
