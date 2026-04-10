-- Migration: Add shipping_carrier column to listings table
-- This replaces the old fragmented shipping_method approach with a clean
-- single carrier field that stores the selected carrier key.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(50) DEFAULT NULL;

COMMENT ON COLUMN listings.shipping_carrier IS
  'Selected shipping carrier key (e.g. nassau_courier, fedex, dhl). NULL for digital products.';
