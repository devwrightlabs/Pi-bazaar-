// ─── users table ─────────────────────────────────────────────────────────────

export type UserRow = {
  id: string
  pi_uid: string
  username: string
  email: string | null
  avatar_url: string | null
  bio: string | null
  is_verified: boolean
  role: 'user' | 'admin'
  is_suspended: boolean
  created_at: string
  updated_at: string
}

export type UserInsert = Omit<
  UserRow,
  'id' | 'created_at' | 'updated_at' | 'email' | 'avatar_url' | 'bio' | 'role' | 'is_suspended'
> & {
  email?: string | null
  avatar_url?: string | null
  bio?: string | null
  role?: 'user' | 'admin'
  is_suspended?: boolean
}
export type UserUpdate = Partial<Omit<UserRow, 'id'>>

// ─── listings table ──────────────────────────────────────────────────────────

export type ListingRow = {
  id: string
  seller_id: string
  title: string
  description: string
  price_pi: number
  category: string
  condition: 'new' | 'like_new' | 'good' | 'fair'
  images: string[]
  location_lat: number
  location_lng: number
  city: string
  country: string
  allow_offers: boolean | null
  is_active: boolean
  is_boosted: boolean
  created_at: string
  updated_at: string
}

export type ListingInsert = Omit<
  ListingRow,
  'id' | 'created_at' | 'updated_at' | 'allow_offers'
> & {
  allow_offers?: boolean | null
}
export type ListingUpdate = Partial<Omit<ListingRow, 'id' | 'allow_offers'>> & {
  allow_offers?: boolean | null
}

// ─── orders table ────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'disputed'

export type OrderRow = {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  amount_pi: number
  status: OrderStatus
  pi_payment_id: string | null
  shipping_address_id: string | null
  tracking_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type OrderInsert = Omit<
  OrderRow,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'pi_payment_id'
  | 'shipping_address_id'
  | 'tracking_number'
  | 'notes'
> & {
  pi_payment_id?: string | null
  shipping_address_id?: string | null
  tracking_number?: string | null
  notes?: string | null
}
export type OrderUpdate = Partial<Omit<OrderRow, 'id'>>

// ─── platform_revenue table ──────────────────────────────────────────────────

export type PlatformRevenueRow = {
  id: string
  escrow_id: string
  amount_pi: number
  collected_at: string
}

export type PlatformRevenueInsert = Omit<PlatformRevenueRow, 'id' | 'collected_at'> & {
  collected_at?: string
}
export type PlatformRevenueUpdate = Partial<Omit<PlatformRevenueRow, 'id'>>

// ─── exchange_rates table ─────────────────────────────────────────────────────

export type ExchangeRateRow = {
  id: string
  fiat_currency_code: string
  pi_rate: number
  last_updated: string
}

export type ExchangeRateInsert = Omit<ExchangeRateRow, 'id' | 'last_updated'> & {
  id?: string
  last_updated?: string
}
export type ExchangeRateUpdate = Partial<Omit<ExchangeRateRow, 'id'>>

// ─── Database type ───────────────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserRow
        Insert: UserInsert
        Update: UserUpdate
        Relationships: []
      }
      listings: {
        Row: ListingRow
        Insert: ListingInsert
        Update: ListingUpdate
        Relationships: []
      }
      orders: {
        Row: OrderRow
        Insert: OrderInsert
        Update: OrderUpdate
        Relationships: []
      }
      platform_revenue: {
        Row: PlatformRevenueRow
        Insert: PlatformRevenueInsert
        Update: PlatformRevenueUpdate
        Relationships: []
      }
      exchange_rates: {
        Row: ExchangeRateRow
        Insert: ExchangeRateInsert
        Update: ExchangeRateUpdate
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
  }
}
