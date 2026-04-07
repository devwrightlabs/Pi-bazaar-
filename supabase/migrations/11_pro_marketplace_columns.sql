-- ============================================================
-- Phase 2: Pro-Marketplace Columns
-- Adds origin_country, is_pro_seller, and product_type to
-- the products table for jurisdiction filtering, Pro-Seller
-- visibility, and category-specific logic.
-- ============================================================

-- origin_country: ISO country code for jurisdiction filtering (e.g., 'BS' for Bahamas)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS origin_country TEXT;

-- is_pro_seller: marks the listing owner as a Pro/Verified seller
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_pro_seller BOOLEAN DEFAULT FALSE;

-- product_type: distinguishes between physical, digital, and service listings
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type TEXT
    CHECK (product_type IS NULL OR product_type IN ('physical', 'digital', 'service'));

-- Index for jurisdiction filtering performance
CREATE INDEX IF NOT EXISTS idx_products_origin_country
  ON public.products (origin_country)
  WHERE origin_country IS NOT NULL;

-- Index for Pro-Seller feed prioritization
CREATE INDEX IF NOT EXISTS idx_products_is_pro_seller
  ON public.products (is_pro_seller)
  WHERE is_pro_seller = TRUE;
