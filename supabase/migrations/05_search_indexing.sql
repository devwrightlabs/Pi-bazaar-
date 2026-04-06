-- ============================================================
-- Pi Bazaar — Phase 5: Search Indexing
-- ============================================================
-- Enables trigram-based text search acceleration on product titles
-- and descriptions, and adds composite indexes for the status and
-- category filters used by the products listing API.
-- ============================================================

-- ─── pg_trgm extension ───────────────────────────────────────────────────────
-- Required for GIN trigram indexes used by similarity and ILIKE queries.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── GIN trigram indexes on products (title & description) ───────────────────
-- Dramatically speeds up ILIKE / similarity queries on title and description
-- even as the products table grows to millions of rows.
CREATE INDEX IF NOT EXISTS products_title_trgm_idx
  ON public.products USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS products_description_trgm_idx
  ON public.products USING GIN (description gin_trgm_ops);

-- ─── Composite B-tree index for status + category filtering ──────────────────
-- Optimises the common API query pattern: WHERE status = 'active' AND category = ?
CREATE INDEX IF NOT EXISTS products_status_category_idx
  ON public.products (status, category);
