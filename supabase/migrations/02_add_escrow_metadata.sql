-- Phase 2: Add metadata column for shipping/tracking info
ALTER TABLE public.escrow_transactions
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add shipping_method to escrow_transactions if not present
ALTER TABLE public.escrow_transactions
ADD COLUMN IF NOT EXISTS shipping_method TEXT;
