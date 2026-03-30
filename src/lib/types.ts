export interface Listing {
  id: string
  seller_id: string
  title: string
  description: string
  price_pi: number
  category: string
  images: string[]
  location_lat: number
  location_lng: number
  city: string
  country: string
  is_active: boolean
  is_boosted: boolean
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
