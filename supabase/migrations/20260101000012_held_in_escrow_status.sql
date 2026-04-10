-- ============================================================
-- Pi Bazaar — Phase 3: Add 'held_in_escrow' status
-- ============================================================
-- Adds the 'held_in_escrow' status for the Pi Payment SDK flow.
-- After server-side payment verification, escrow transitions from
-- 'funded' to 'held_in_escrow' indicating the Pi is confirmed on
-- chain and locked until the buyer approves or the review period
-- expires.
-- ============================================================

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
      'held_in_escrow',
      'released',
      'auto_released',
      'refunded',
      'disputed',
      'cancelled'
    ));
