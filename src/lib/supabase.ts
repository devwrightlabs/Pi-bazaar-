import { createClient } from '@supabase/supabase-js'
import type {
  Conversation,
  Message,
  TypingIndicator,
  UserProfile,
  UserPreferences,
  EscrowTransaction,
  ShippingAddress,
  EscrowTimelineEvent,
} from './types'
import {
  isSupabaseConfigured,
  supabaseUrl,
  supabaseAnonKey,
} from './env'
import type { Database as CoreDatabase } from './database.types'

/** Materializes a type's properties into an explicit object shape for use with Supabase row generics. */
type AsRow<T> = { [K in keyof T]: T[K] }

export type Database = {
  public: {
    Tables: {
      users: CoreDatabase['public']['Tables']['users']
      listings: CoreDatabase['public']['Tables']['listings']
      orders: CoreDatabase['public']['Tables']['orders']
      user_settings: CoreDatabase['public']['Tables']['user_settings']
      saved_addresses: CoreDatabase['public']['Tables']['saved_addresses']
      platform_revenue: CoreDatabase['public']['Tables']['platform_revenue']
      conversations: {
        Row: AsRow<Conversation>
        Insert: AsRow<Omit<Conversation, 'id' | 'created_at'>>
        Update: AsRow<Partial<Omit<Conversation, 'id'>>>
        Relationships: []
      }
      messages: {
        Row: AsRow<Message>
        Insert: AsRow<Omit<Message, 'id' | 'created_at'>>
        Update: AsRow<Partial<Omit<Message, 'id'>>>
        Relationships: []
      }
      typing_indicators: {
        Row: AsRow<TypingIndicator>
        Insert: AsRow<Omit<TypingIndicator, 'id'>>
        Update: AsRow<Partial<Omit<TypingIndicator, 'id'>>>
        Relationships: []
      }
      user_profiles: {
        Row: AsRow<UserProfile>
        Insert: AsRow<Omit<UserProfile, 'id' | 'created_at' | 'avatar_url' | 'bio'> & { avatar_url?: string | null; bio?: string | null }>
        Update: AsRow<Partial<Omit<UserProfile, 'id'>>>
        Relationships: []
      }
      user_preferences: {
        Row: AsRow<UserPreferences>
        Insert: AsRow<Omit<UserPreferences, 'id' | 'created_at' | 'updated_at'>>
        Update: AsRow<Partial<Omit<UserPreferences, 'id'>>>
        Relationships: []
      }
      escrow_transactions: {
        Row: AsRow<EscrowTransaction>
        Insert: AsRow<Omit<EscrowTransaction, 'id' | 'created_at' | 'updated_at'>>
        Update: AsRow<Partial<Omit<EscrowTransaction, 'id'>>>
        Relationships: []
      }
      shipping_addresses: {
        Row: AsRow<ShippingAddress>
        Insert: AsRow<Omit<ShippingAddress, 'id' | 'created_at'>>
        Update: AsRow<Partial<Omit<ShippingAddress, 'id'>>>
        Relationships: []
      }
      escrow_timeline: {
        Row: AsRow<EscrowTimelineEvent>
        Insert: AsRow<Omit<EscrowTimelineEvent, 'id' | 'created_at'>>
        Update: AsRow<Partial<Omit<EscrowTimelineEvent, 'id'>>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

export { isSupabaseConfigured }
