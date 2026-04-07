-- ============================================================
-- Phase 2: Pro-Marketplace Columns
-- Adds origin_country, is_pro_seller, and product_type to
-- the listings table for jurisdiction filtering, Pro-Seller
-- visibility, and category-specific logic.
-- ============================================================

-- origin_country: ISO country code for jurisdiction filtering (e.g., 'BS' for Bahamas)
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS origin_country TEXT;

-- is_pro_seller: marks the listing owner as a Pro/Verified seller
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS is_pro_seller BOOLEAN DEFAULT FALSE;

-- product_type: distinguishes between physical, digital, and service listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS product_type TEXT
    CHECK (product_type IS NULL OR product_type IN ('physical', 'digital', 'service'));

-- Index for jurisdiction filtering performance
CREATE INDEX IF NOT EXISTS idx_listings_origin_country
  ON public.listings (origin_country)
  WHERE origin_country IS NOT NULL;

-- Index for Pro-Seller feed prioritization
CREATE INDEX IF NOT EXISTS idx_listings_is_pro_seller
  ON public.listings (is_pro_seller)
  WHERE is_pro_seller = TRUE;
