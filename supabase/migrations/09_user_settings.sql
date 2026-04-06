-- ============================================================
-- Pi Bazaar — Phase 9: User Settings & Saved Addresses
-- ============================================================
-- SECURITY NOTE: All RLS policies use auth.jwt() ->> 'pi_uid'
-- to read the pi_uid claim from the verified custom JWT signed
-- by our server — consistent with all prior migrations.
-- ============================================================

-- ─── user_settings ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_settings (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT        NOT NULL UNIQUE REFERENCES public.users(pi_uid) ON DELETE CASCADE,
  preferred_currency  TEXT        NOT NULL DEFAULT 'USD',
  email_notifications BOOLEAN     NOT NULL DEFAULT true,
  push_notifications  BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on modification
DROP TRIGGER IF EXISTS user_settings_updated_at ON public.user_settings;
CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── saved_addresses ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_addresses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT        NOT NULL REFERENCES public.users(pi_uid) ON DELETE CASCADE,
  is_default      BOOLEAN     NOT NULL DEFAULT false,
  full_name       TEXT        NOT NULL,
  street_address  TEXT        NOT NULL,
  city            TEXT        NOT NULL,
  state_province  TEXT        NOT NULL,
  postal_code     TEXT        NOT NULL,
  country         TEXT        NOT NULL,
  phone_number    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookup of a user's addresses
CREATE INDEX IF NOT EXISTS saved_addresses_user_id_idx
  ON public.saved_addresses (user_id);

-- Partial unique index: at most one default address per user.
-- Application code clears the old default before setting a new one, but this
-- index provides a database-level safety net against race conditions.
CREATE UNIQUE INDEX IF NOT EXISTS saved_addresses_one_default_per_user
  ON public.saved_addresses (user_id) WHERE is_default = true;

-- ============================================================
-- Row Level Security
-- ============================================================

-- ─── user_settings RLS ───────────────────────────────────────────────────────
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_select_own"
  ON public.user_settings FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

CREATE POLICY "user_settings_insert_own"
  ON public.user_settings FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

CREATE POLICY "user_settings_update_own"
  ON public.user_settings FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

CREATE POLICY "user_settings_delete_own"
  ON public.user_settings FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

-- ─── saved_addresses RLS ─────────────────────────────────────────────────────
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_addresses_select_own"
  ON public.saved_addresses FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

CREATE POLICY "saved_addresses_insert_own"
  ON public.saved_addresses FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

CREATE POLICY "saved_addresses_update_own"
  ON public.saved_addresses FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );

CREATE POLICY "saved_addresses_delete_own"
  ON public.saved_addresses FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'pi_uid') = user_id
  );
