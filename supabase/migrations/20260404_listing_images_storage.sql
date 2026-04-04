-- Create the public listing-images storage bucket.
-- A public bucket allows buyers to view product photos without authentication.
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Storage RLS policies on storage.objects
-- ============================================================

-- Anyone can read/download files from the listing-images bucket (no auth required).
CREATE POLICY "Anyone can read listing images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

-- Uploads to the listing-images bucket are allowed only for authenticated users
-- writing inside their own top-level {user_id}/... folder.
CREATE POLICY "Authenticated users can upload listing images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can update files only in their own folder.
CREATE POLICY "Users can update own listing images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'listing-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can delete files only in their own folder.
CREATE POLICY "Users can delete own listing images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listing-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
