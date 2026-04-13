-- Migration: Add theme_preference and jurisdiction_mode to users table
-- Idempotent: safe to run multiple times

DO $$
BEGIN
  -- Add theme_preference column if it does not exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'theme_preference'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN theme_preference text NOT NULL DEFAULT 'dark'
      CHECK (theme_preference IN ('dark', 'light'));
  END IF;

  -- Add jurisdiction_mode column if it does not exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'jurisdiction_mode'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN jurisdiction_mode text NOT NULL DEFAULT 'global'
      CHECK (jurisdiction_mode IN ('local', 'global'));
  END IF;
END
$$;

-- RLS: Allow authenticated users to update their own profile preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_update_own_profile'
  ) THEN
    CREATE POLICY users_update_own_profile ON public.users
      FOR UPDATE
      USING (auth.uid()::text = pi_uid)
      WITH CHECK (auth.uid()::text = pi_uid);
  END IF;
END
$$;

-- RLS: Allow authenticated users to read their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_select_own_profile'
  ) THEN
    CREATE POLICY users_select_own_profile ON public.users
      FOR SELECT
      USING (auth.uid()::text = pi_uid);
  END IF;
END
$$;
