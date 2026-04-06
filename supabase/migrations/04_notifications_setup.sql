-- ============================================================
-- Pi Bazaar — Phase 5: Real-Time Notifications
-- ============================================================
-- SECURITY NOTE: All RLS policies use auth.jwt() ->> 'pi_uid'
-- to read the pi_uid claim from the verified custom JWT signed
-- by our server — consistent with all prior migrations.
-- ============================================================

-- ─── notifications ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT        NOT NULL REFERENCES public.users(pi_uid) ON DELETE CASCADE,
  type          TEXT        NOT NULL
                            CHECK (type IN ('escrow_update', 'new_message', 'new_review')),
  reference_id  UUID,
  message       TEXT        NOT NULL,
  is_read       BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast unread notification lookups per user
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, created_at DESC)
  WHERE is_read = false;

-- ─── RLS: notifications ───────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can SELECT only their own notifications
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

-- Users can UPDATE (mark as read) only their own notifications
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

-- Enforce immutability of notification contents; clients may only change is_read.
CREATE OR REPLACE FUNCTION public.notifications_only_update_is_read()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.reference_id IS DISTINCT FROM OLD.reference_id
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only is_read may be updated on notifications.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_only_update_is_read_trigger
  ON public.notifications;

CREATE TRIGGER notifications_only_update_is_read_trigger
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notifications_only_update_is_read();
-- No INSERT or DELETE policies for clients — notifications are created only
-- by server-side trigger functions (SECURITY DEFINER) below.

-- ============================================================
-- Automated Trigger Functions
-- ============================================================

-- ─── Trigger: new message → notify receiver ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, reference_id, message)
  VALUES (
    NEW.receiver_id,
    'new_message',
    NEW.id,
    'You have a new message.'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_notify_receiver ON public.messages;
CREATE TRIGGER messages_notify_receiver
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- ─── Trigger: escrow status change → notify buyer or seller ──────────────────
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
    VALUES (
      NEW.buyer_id,
      'escrow_update',
      NEW.id,
      'Your order has been shipped.'
    );
  END IF;

  -- Notify seller when the escrow has been funded (payment received)
  IF NEW.status = 'funded' THEN
    INSERT INTO public.notifications (user_id, type, reference_id, message)
    VALUES (
      NEW.seller_id,
      'escrow_update',
      NEW.id,
      'Your escrow has been funded. Please ship the item.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS escrow_notify_status_change ON public.escrow_transactions;
CREATE TRIGGER escrow_notify_status_change
  AFTER UPDATE ON public.escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_escrow_update();

-- ─── Trigger: new review → notify reviewee ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_new_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, reference_id, message)
  VALUES (
    NEW.reviewee_id,
    'new_review',
    NEW.id,
    'You have received a new review.'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_notify_reviewee ON public.reviews;
CREATE TRIGGER reviews_notify_reviewee
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_review();
