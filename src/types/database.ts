/**
 * Database Schema TypeScript Interfaces
 *
 * Compatibility aliases over the centralized Supabase schema types.
 * Keep this file as a thin wrapper so all database typings come from
 * `src/lib/database.types.ts`, which is what the Supabase client uses.
 */

import type { Database as SupabaseDatabase } from '../lib/database.types'

type PublicTables = SupabaseDatabase['public']['Tables']

export type Database = SupabaseDatabase

// ─── Profiles / Users ────────────────────────────────────────────────────────

export type ProfileRow = PublicTables['users']['Row']
export type ProfileInsert = PublicTables['users']['Insert']
export type ProfileUpdate = PublicTables['users']['Update']

// ─── Chat Threads / Conversations ────────────────────────────────────────────

export type ChatThreadRow = PublicTables['conversations']['Row']
export type ChatThreadInsert = PublicTables['conversations']['Insert']
export type ChatThreadUpdate = PublicTables['conversations']['Update']

// ─── Messages Table ──────────────────────────────────────────────────────────

export type MessageRow = PublicTables['messages']['Row']
export type MessageInsert = PublicTables['messages']['Insert']
export type MessageUpdate = PublicTables['messages']['Update']

// ─── Transactions / Escrow Transactions ─────────────────────────────────────

export type TransactionRow = PublicTables['escrow_transactions']['Row']
export type TransactionInsert = PublicTables['escrow_transactions']['Insert']
export type TransactionUpdate = PublicTables['escrow_transactions']['Update']
export type TransactionStatus = TransactionRow['status']
