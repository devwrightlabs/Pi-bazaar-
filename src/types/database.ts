/**
 * Database Schema TypeScript Interfaces
 *
 * Production-ready types for Pi Bazaar's core database tables.
 * These interfaces align with Supabase Row Level Security (RLS) enabled schema.
 */

// ─── Profiles Table ──────────────────────────────────────────────────────────

export interface ProfileRow {
  id: string
  username: string
  avatar_url: string | null
  created_at?: string
}

export interface ProfileInsert extends Omit<ProfileRow, 'id' | 'created_at'> {
  id?: string
}

export interface ProfileUpdate extends Partial<Omit<ProfileRow, 'id'>> {}

// ─── Chat Threads Table ──────────────────────────────────────────────────────

export interface ChatThreadRow {
  id: string
  buyer_id: string
  seller_id: string
  listing_id: string | null
  created_at?: string
  updated_at?: string
}

export interface ChatThreadInsert extends Omit<ChatThreadRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string
}

export interface ChatThreadUpdate extends Partial<Omit<ChatThreadRow, 'id'>> {}

// ─── Messages Table ──────────────────────────────────────────────────────────

export interface MessageRow {
  id: string
  thread_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
}

export type MessageInsert = Omit<MessageRow, 'id' | 'created_at' | 'is_read'> & {
  id?: string
  is_read?: boolean
}

export interface MessageUpdate extends Partial<Omit<MessageRow, 'id' | 'thread_id' | 'sender_id'>> {}

// ─── Transactions Table ──────────────────────────────────────────────────────

export type TransactionStatus =
  | 'pending'
  | 'funded_in_escrow'
  | 'shipped'
  | 'completed_released'
  | 'disputed'

export interface TransactionRow {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  price: number
  status: TransactionStatus
  created_at?: string
  updated_at?: string
}

export interface TransactionInsert extends Omit<TransactionRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string
}

export interface TransactionUpdate extends Partial<Omit<TransactionRow, 'id'>> {}

// ─── Aggregate Database Type ─────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: ProfileInsert
        Update: ProfileUpdate
        Relationships: []
      }
      chat_threads: {
        Row: ChatThreadRow
        Insert: ChatThreadInsert
        Update: ChatThreadUpdate
        Relationships: []
      }
      messages: {
        Row: MessageRow
        Insert: MessageInsert
        Update: MessageUpdate
        Relationships: []
      }
      transactions: {
        Row: TransactionRow
        Insert: TransactionInsert
        Update: TransactionUpdate
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
  }
}
