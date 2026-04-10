-- ============================================================
-- Create the public.listings table
-- ============================================================
-- The application code (API routes, frontend hooks) queries
-- supabase.from('listings'), but the table was never created.
-- This migration creates it with all columns expected by the
-- Listing TypeScript type, the scoring/matching engine, and
-- existing ALTER TABLE migrations (11_pro_marketplace_columns).
--
-- Run this in the Supabase SQL Editor BEFORE the other
-- migrations that reference public.listings (11, 20260404_rls).
-- Uses IF NOT EXISTS / IF NOT EXISTS throughout for idempotency.
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── listings table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listings (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       TEXT            NOT NULL,
  title           TEXT            NOT NULL,
  description     TEXT            NOT NULL DEFAULT '',
  price_pi        NUMERIC(20, 7) NOT NULL CHECK (price_pi > 0),
  category        TEXT            NOT NULL DEFAULT 'Other',
  condition       TEXT            CHECK (condition IN ('new', 'like_new', 'good', 'fair')),
  images          TEXT[]          NOT NULL DEFAULT '{}',
  location_lat    NUMERIC(10, 7) NOT NULL DEFAULT 0,
  location_lng    NUMERIC(10, 7) NOT NULL DEFAULT 0,
  city            TEXT            NOT NULL DEFAULT '',
  country         TEXT            NOT NULL DEFAULT '',
  origin_country  VARCHAR(2),
  allow_offers    BOOLEAN         DEFAULT FALSE,
  is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
  is_boosted      BOOLEAN         NOT NULL DEFAULT FALSE,
  is_pro_seller   BOOLEAN         NOT NULL DEFAULT FALSE,
  product_type    TEXT            CHECK (product_type IS NULL OR product_type IN ('physical', 'digital', 'service')),
  shipping_carrier TEXT,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── updated_at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_updated_at ON public.listings;
CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Indexes for common query patterns ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_listings_is_active
  ON public.listings (is_active)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_listings_geo
  ON public.listings (location_lat, location_lng)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_listings_price_pi
  ON public.listings (price_pi)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_listings_origin_country
  ON public.listings (origin_country)
  WHERE origin_country IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listings_is_pro_seller
  ON public.listings (is_pro_seller)
  WHERE is_pro_seller = TRUE;

CREATE INDEX IF NOT EXISTS idx_listings_created_at
  ON public.listings (created_at DESC);

-- ─── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view active listings (buyers browsing the marketplace).
-- Sellers can also view their own inactive listings.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'listings' AND policyname = 'Anyone can view listings'
  ) THEN
    CREATE POLICY "Anyone can view listings"
      ON public.listings FOR SELECT
      USING (
        is_active = true
        OR auth.uid()::text = seller_id
      );
  END IF;
END
$$;

-- Users can insert their own listings (seller_id must be present).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'listings' AND policyname = 'Users can insert own listings'
  ) THEN
    CREATE POLICY "Users can insert own listings"
      ON public.listings FOR INSERT
      WITH CHECK (nullif(trim(seller_id), '') IS NOT NULL);
  END IF;
END
$$;

-- Only trusted server-side code (service_role) may update listings.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'listings' AND policyname = 'Service role can update listings'
  ) THEN
    CREATE POLICY "Service role can update listings"
      ON public.listings FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- Only trusted server-side code (service_role) may delete listings.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'listings' AND policyname = 'Service role can delete listings'
  ) THEN
    CREATE POLICY "Service role can delete listings"
      ON public.listings FOR DELETE
      TO service_role
      USING (true);
  END IF;
END
$$;
