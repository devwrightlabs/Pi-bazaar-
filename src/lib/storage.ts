/**
 * Supabase Storage helpers for the listing-images and product-images buckets.
 *
 * Exports upload, delete, and URL-resolution utilities, along with
 * the bucket name and validation constants for listing and product image storage.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { isSupabaseConfigured } from '@/lib/env'

export const LISTING_IMAGES_BUCKET = 'listing-images'

/** Maximum allowed file size: 5 MB */
export const MAX_FILE_SIZE_MB = 5
export const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024

/** MIME types accepted for listing images */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// ─── Product-images bucket constants ─────────────────────────────────────────

/** Storage bucket name for product images (Phase 3). */
export const PRODUCT_IMAGES_BUCKET = 'product-images'

/** Alias exported under the name expected by consumers of the product upload API. */
export const MAX_IMAGES_PER_PRODUCT = 10

/** Allowed MIME types for product images. Reuses the shared image-type allowlist. */
export const ALLOWED_MIME_TYPES = ALLOWED_IMAGE_TYPES

/**
 * Uploads an image file to the listing-images bucket under the given user's folder.
 *
 * @param userId - The authenticated user's ID (used as the top-level folder).
 * @param file   - The image File to upload.
 * @returns An object containing the public `url` and the storage `path`.
 * @throws If Supabase is not configured, validation fails, or the upload errors.
 */
export async function uploadListingImage(
  userId: string,
  file: File
): Promise<{ url: string; path: string }> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot upload images.')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`)
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(
      `Invalid file type "${file.type}". Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}.`
    )
  }

  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  const ext = extMap[file.type] ?? 'jpg'
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from(LISTING_IMAGES_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const url = getListingImageUrl(path)
  return { url, path }
}

/**
 * Removes a file from the listing-images bucket.
 *
 * @param path - The storage path returned by `uploadListingImage`.
 * @throws If Supabase is not configured or the remove call errors.
 */
export async function deleteListingImage(path: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot delete images.')
  }

  const { error } = await supabase.storage.from(LISTING_IMAGES_BUCKET).remove([path])

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }
}

/**
 * Returns the public URL for a given storage path in the listing-images bucket.
 *
 * @param path - The storage path (e.g. `{userId}/{filename}`).
 */
export function getListingImageUrl(path: string): string {
  const { data } = supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// ─── Product-images upload helpers (Phase 3) ─────────────────────────────────

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/**
 * Uploads a product image to the `product-images` Supabase Storage bucket.
 *
 * The file is stored at `{piUid}/{uuid}.{ext}` so it falls inside the
 * authenticated user's folder, satisfying the Storage RLS insert policy.
 *
 * @param file           - The image File object to upload.
 * @param piUid          - The authenticated user's Pi UID (used as folder prefix).
 * @param supabaseClient - Supabase client instance with the user's custom JWT set.
 * @returns The public URL of the uploaded image.
 * @throws If validation fails or the upload errors.
 */
export async function uploadProductImage(
  file: File,
  piUid: string,
  supabaseClient: SupabaseClient
): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`)
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
    throw new Error(
      `Invalid file type "${file.type}". Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}.`
    )
  }

  const ext = MIME_TO_EXT[file.type] ?? 'jpg'
  const filePath = `${piUid}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabaseClient.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(filePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  const {
    data: { publicUrl },
  } = supabaseClient.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(filePath)

  return publicUrl
}

/**
 * Uploads multiple product images concurrently.
 *
 * @param files          - Array of image File objects (max {@link MAX_IMAGES_PER_PRODUCT}).
 * @param piUid          - The authenticated user's Pi UID.
 * @param supabaseClient - Supabase client instance with the user's custom JWT set.
 * @returns Array of public URLs in the same order as the input files.
 */
export async function uploadProductImages(
  files: File[],
  piUid: string,
  supabaseClient: SupabaseClient
): Promise<string[]> {
  if (files.length > MAX_IMAGES_PER_PRODUCT) {
    throw new Error(`A maximum of ${MAX_IMAGES_PER_PRODUCT} images per product is allowed.`)
  }

  return Promise.all(files.map((file) => uploadProductImage(file, piUid, supabaseClient)))
}

/**
 * Deletes a product image from the `product-images` bucket.
 *
 * Extracts the storage path from the public URL and verifies it belongs to
 * the given `piUid` before attempting deletion.
 *
 * @param imageUrl       - The public URL of the image to delete.
 * @param piUid          - The authenticated user's Pi UID (ownership verification).
 * @param supabaseClient - Supabase client instance with the user's custom JWT set.
 * @throws If the URL does not belong to the user's folder, or deletion fails.
 */
export async function deleteProductImage(
  imageUrl: string,
  piUid: string,
  supabaseClient: SupabaseClient
): Promise<void> {
  // Extract the storage path from supported Supabase public URL formats:
  // https://<project>.supabase.co/storage/v1/object/public/product-images/{piUid}/{filename}
  // https://<project>.supabase.co/storage/v1/render/image/public/product-images/{piUid}/{filename}
  let pathname: string
  try {
    pathname = new URL(imageUrl).pathname
  } catch {
    throw new Error('Invalid image URL.')
  }

  const supportedPrefixes = [
    `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`,
    `/storage/v1/render/image/public/${PRODUCT_IMAGES_BUCKET}/`,
  ]

  const matchedPrefix = supportedPrefixes.find((prefix) => pathname.startsWith(prefix))
  if (!matchedPrefix) {
    throw new Error('Invalid image URL: does not belong to the product-images bucket.')
  }

  const filePath = pathname.slice(matchedPrefix.length)
  if (!filePath) {
    throw new Error('Invalid image URL: missing storage path.')
  }

  // Ownership check: the path must start with the user's pi_uid folder.
  if (!filePath.startsWith(`${piUid}/`)) {
    throw new Error('Forbidden: you can only delete images from your own folder.')
  }

  const { error } = await supabaseClient.storage.from(PRODUCT_IMAGES_BUCKET).remove([filePath])

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }
}
