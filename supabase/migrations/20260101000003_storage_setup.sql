-- ============================================================
-- Pi Bazaar — Phase 3 Supabase Storage Setup
-- ============================================================
-- Creates the product-images storage bucket with strict RLS
-- policies that enforce pi_uid-based folder ownership.
--
-- SECURITY NOTES:
--   - MIME types restricted to image/jpeg, image/png, image/webp
--   - File size limited to 5 MB (5242880 bytes)
--   - Folder structure enforced: {pi_uid}/{uuid}.{ext}
--     Users can only write to their own Pi UID folder.
--   - auth.jwt() ->> 'pi_uid' reads the custom claim from our Phase 1
--     JWT — NOT relying on set_config or client-supplied values.
-- ============================================================

-- ─── Storage bucket ──────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5 MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ─── Storage RLS policies ────────────────────────────────────────────────────

-- Public read: anyone (including unauthenticated visitors) can view product images.
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Insert: only authenticated users may upload, and only to their own pi_uid folder.
-- The folder check (storage.foldername(name))[1] = auth.jwt() ->> 'pi_uid' ensures
-- users cannot write to another user's folder even with a valid JWT.
CREATE POLICY "Authenticated users can upload to their own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'pi_uid')
);

-- Update: users can only replace images they uploaded (own folder).
CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'pi_uid')
)
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'pi_uid')
);

-- Delete: users can only remove images from their own folder.
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'pi_uid')
);
