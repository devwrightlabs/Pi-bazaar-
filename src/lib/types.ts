export interface Listing {
  id: string
  seller_id: string
  title: string
  description: string
  price_pi: number
  category: string
  condition?: 'new' | 'like_new' | 'good' | 'fair'
  images: string[]
  location_lat: number
  location_lng: number
  city: string
  country: string
  origin_country?: string
  allow_offers?: boolean
  is_active: boolean
  is_boosted: boolean
  is_pro_seller?: boolean
  product_type?: 'physical' | 'digital' | 'service'
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  participant_1: string
  participant_2: string
  last_message: string
  last_message_at: string
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
}

export interface TypingIndicator {
  id: string
  conversation_id: string
  user_id: string
  is_typing: boolean
  updated_at: string
}

export interface UserProfile {
  id: string
  pi_uid: string
  username: string
  avatar_url: string | null
  bio: string | null
  created_at: string
}

export interface UserPreferences {
  id: string
  user_id: string
  color_background: string
  color_gold: string
  color_card_bg: string
  color_text: string
  color_subtext: string
  theme_name: string
  created_at: string
  updated_at: string
}

export type TargetMarket = 'local' | 'global'
export type ShippingMethod = 'nassau_courier' | 'local_pickup' | 'international_shipping' | 'digital_delivery' | 'shipping_information'
export type ProductType = 'physical' | 'digital'

export interface CreateListingForm {
  title: string
  description: string
  price_pi: number
  category: string
  condition: 'new' | 'like_new' | 'good' | 'fair'
  images: string[]
  location_city: string
  location_country: string
  allow_offers: boolean
  fast_seller_agreed: boolean
  target_market: TargetMarket
  product_type: ProductType
  shipping_method: ShippingMethod
}

export interface ScrapedListing {
  title: string
  description: string
  price_usd: number
  images: string[]
}

export interface PiPriceResponse {
  price_usd: number
  timestamp: string
}

export interface AISuggestRequest {
  title: string
  category: string
  condition: string
}

export interface AISuggestResponse {
  description: string
}

export interface EscrowTransaction {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  amount_pi: number
  escrow_fee_pi: number
  net_amount_pi: number
  status: 'pending_payment' | 'payment_received' | 'shipped' | 'delivered' | 'completed' | 'disputed' | 'refunded' | 'auto_released'
  product_type: 'physical' | 'digital'
  pi_payment_id: string
  tracking_number: string | null
  shipping_carrier: string | null
  delivery_proof: string | null
  buyer_confirmed_at: string | null
  seller_shipped_at: string | null
  auto_release_at: string
  dispute_reason: string | null
  created_at: string
  updated_at: string
}

export interface ShippingAddress {
  id: string
  user_id: string
  full_name: string
  address_line_1: string
  address_line_2: string | null
  city: string
  state_province: string
  postal_code: string
  country: string
  phone: string | null
  is_default: boolean
  created_at: string
}

export interface EscrowTimelineEvent {
  id: string
  escrow_id: string
  event: string
  description: string
  created_at: string
}

export type ModalVariant = 'alert' | 'confirm' | 'info'

export interface ModalProps {
  isOpen: boolean
  title: string
  message: string
  variant?: ModalVariant
  onConfirm?: () => void
  onCancel?: () => void
  onClose: () => void
}

export interface MatchScore {
  listing_id: string
  score: number
  distance_km: number | null
  category_match: boolean
  is_boosted: boolean
}

export interface RecommendationRequest {
  user_id: string
  latitude: number
  longitude: number
  radius_km: number
  preferred_categories: string[]
  price_min?: number
  price_max?: number
  limit?: number
  offset?: number
}

export interface RecommendationResponse {
  recommendations: (Listing & { match_score: MatchScore })[]
  total_found: number
  has_more: boolean
  applied_filters: {
    radius_km: number
    categories: string[]
    price_range: { min?: number; max?: number }
  }
}
