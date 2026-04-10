/**
 * Product Types
 *
 * TypeScript interfaces for product listings, matching the `listings` table
 * schema after the database migration.
 */

export interface Product {
  id: string
  seller_id: string
  title: string
  description: string | null
  price_in_pi: number
  category: string | null
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor' | null
  images: string[] | null
  status: 'active' | 'sold' | 'removed'
  city: string | null
  country: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateProductRequest {
  title: string
  description?: string
  price_in_pi: number
  category?: string
  condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor'
  images?: string[]
  city?: string
  country?: string
}

export interface ProductSearchParams {
  category?: string
  /** Alias for q — either may be used as the full-text search term. */
  search?: string
  q?: string
  min_price?: number
  max_price?: number
  condition?: string
  seller_id?: string
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc'
  page?: number
  limit?: number
}

export interface PaginatedProductsResponse {
  products: Product[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}
