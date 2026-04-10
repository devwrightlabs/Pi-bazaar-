-- ============================================================
-- Pi Bazaar — Phase 4: P2P Messaging & Trust Scoring System
-- ============================================================
-- SECURITY NOTE: All RLS policies use auth.jwt() ->> 'pi_uid'
-- to read the pi_uid claim from the verified custom JWT signed
-- by our server — consistent with all prior migrations.
-- ============================================================

-- ─── Add trust_score and total_sales to users ────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS trust_score NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_sales INTEGER NOT NULL DEFAULT 0;

-- ─── messages ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    TEXT        NOT NULL,    -- Pi UID of sender
  receiver_id  TEXT        NOT NULL,    -- Pi UID of receiver
  listing_id   UUID        REFERENCES public.listings(id) ON DELETE SET NULL,  -- optional context
  content      TEXT        NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  is_read      BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Users cannot message themselves
  CONSTRAINT messages_no_self_message CHECK (sender_id <> receiver_id)
);

-- Indexes for conversation lookups and unread message queries
CREATE INDEX IF NOT EXISTS messages_conversation_idx
  ON public.messages (sender_id, receiver_id, created_at);

CREATE INDEX IF NOT EXISTS messages_receiver_unread_idx
  ON public.messages (receiver_id)
  WHERE is_read = false;

-- ─── reviews ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id  TEXT        NOT NULL,    -- Pi UID of the reviewer (buyer)
  reviewee_id  TEXT        NOT NULL,    -- Pi UID of the reviewee (seller)
  escrow_id    UUID        NOT NULL REFERENCES public.escrow_transactions(id) ON DELETE RESTRICT,
  rating       INTEGER     NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment      TEXT        CHECK (comment IS NULL OR char_length(comment) <= 1000),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One review per escrow transaction per reviewer
  UNIQUE(escrow_id, reviewer_id)
);

-- Index for trust score lookups by reviewee
CREATE INDEX IF NOT EXISTS reviews_reviewee_idx
  ON public.reviews (reviewee_id);

-- ─── RLS: messages ───────────────────────────────────────────────────────────
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can SELECT messages they sent or received
CREATE POLICY "messages_select_own"
  ON public.messages FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      (auth.jwt() ->> 'pi_uid') = sender_id
      OR (auth.jwt() ->> 'pi_uid') = receiver_id
    )
  );

-- Users can INSERT messages where they are the sender
CREATE POLICY "messages_insert_own"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = sender_id
  );

-- No UPDATE or DELETE policies — messages are immutable from client perspective

-- ─── RLS: reviews ────────────────────────────────────────────────────────────
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read reviews (public trust info)
CREATE POLICY "reviews_select_all"
  ON public.reviews FOR SELECT
  USING (auth.role() = 'authenticated');

-- A user can INSERT a review only if:
-- 1. They are the reviewer (pi_uid matches reviewer_id)
-- 2. The linked escrow transaction has status 'released', 'completed', or 'auto_released'
-- 3. They were the buyer in that escrow transaction
CREATE POLICY "reviews_insert_verified_buyer"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = reviewer_id
    AND EXISTS (
      SELECT 1 FROM public.escrow_transactions et
      WHERE et.id = escrow_id
        AND et.buyer_id = (auth.jwt() ->> 'pi_uid')
        AND et.status IN ('released', 'completed', 'auto_released')
    )
  );

-- No UPDATE or DELETE policies — reviews are permanent

-- ─── Trust score recalculation function ──────────────────────────────────────
-- Called from the reviews API route via supabaseAdmin.rpc()
-- SECURITY DEFINER so it can UPDATE public.users without client RLS restrictions.
CREATE OR REPLACE FUNCTION public.recalculate_trust_score(target_pi_uid TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  avg_rating NUMERIC(3,2);
  sale_count INTEGER;
BEGIN
  SELECT COALESCE(AVG(rating)::NUMERIC(3,2), 0.00), COUNT(*)
  INTO avg_rating, sale_count
  FROM public.reviews
  WHERE reviewee_id = target_pi_uid;

  UPDATE public.users
  SET trust_score = avg_rating,
      total_sales = sale_count,
      updated_at = now()
  WHERE pi_uid = target_pi_uid;
END;
$$;
