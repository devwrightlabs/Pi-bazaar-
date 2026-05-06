-- ============================================================
-- PiBazaar Performance Indexes
-- Run in Supabase SQL Editor
-- ============================================================

-- Listings: most common query patterns
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_scheduled_at ON listings(scheduled_at) WHERE status = 'scheduled';

-- Orders: buyer/seller lookups
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_listing_id ON orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Escrow transactions
CREATE INDEX IF NOT EXISTS idx_escrow_buyer_id ON escrow_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_seller_id ON escrow_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON escrow_transactions(status);
CREATE INDEX IF NOT EXISTS idx_escrow_product_id ON escrow_transactions(product_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_pi_uid, read, created_at DESC);

-- Listing reminders
CREATE INDEX IF NOT EXISTS idx_listing_reminders_listing ON listing_reminders(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_reminders_user ON listing_reminders(user_pi_uid);

-- Seller suspensions
CREATE INDEX IF NOT EXISTS idx_suspensions_seller ON seller_suspensions(seller_pi_uid, expires_at);

-- User preferences
CREATE INDEX IF NOT EXISTS idx_user_prefs_pi_uid ON user_preferences(pi_uid);
