/**
 * Database Schema Types - Pi Bazaar
 *
 * This file defines the exact database schema as specified in the requirements.
 */

// ─── profiles table ──────────────────────────────────────────────────────────

export interface ProfileRow {
  id: string // uuid
  username: string
  avatar_url: string
}

export type ProfileInsert = Omit<ProfileRow, 'id'>
export type ProfileUpdate = Partial<Omit<ProfileRow, 'id'>>

// ─── chat_threads table ──────────────────────────────────────────────────────

export interface ChatThreadRow {
  id: string // uuid
  buyer_id: string // uuid
  seller_id: string // uuid
  listing_id: string // uuid
}

export type ChatThreadInsert = Omit<ChatThreadRow, 'id'>
export type ChatThreadUpdate = Partial<Omit<ChatThreadRow, 'id'>>

// ─── messages table ──────────────────────────────────────────────────────────

export interface MessageRow {
  id: string // uuid
  thread_id: string // uuid
  sender_id: string // uuid
  content: string
  is_read: boolean
  created_at: string
}

export type MessageInsert = Omit<MessageRow, 'id' | 'created_at'>
export type MessageUpdate = Partial<Omit<MessageRow, 'id' | 'created_at'>>

// ─── transactions table ──────────────────────────────────────────────────────

export type TransactionStatus =
  | 'pending'
  | 'funded_in_escrow'
  | 'shipped'
  | 'completed_released'
  | 'disputed'

export interface TransactionRow {
  id: string // uuid
  listing_id: string // uuid
  buyer_id: string // uuid
  seller_id: string // uuid
  price: number // numeric
  status: TransactionStatus
}

export type TransactionInsert = Omit<TransactionRow, 'id'>
export type TransactionUpdate = Partial<Omit<TransactionRow, 'id'>>

// ─── Database type ───────────────────────────────────────────────────────────

export type Database = {
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
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
  }
}
