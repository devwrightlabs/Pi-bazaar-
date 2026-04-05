/**
 * Escrow System — TypeScript Types
 *
 * Shared type definitions for the Phase 2 escrow API routes.
 */

// ─── Escrow status ────────────────────────────────────────────────────────────

export type EscrowStatus =
  | 'pending'
  | 'funded'
  | 'shipped'
  | 'delivered'
  | 'released'
  | 'disputed'
  | 'refunded'

export type EscrowAction = 'shipped' | 'delivered' | 'released' | 'disputed' | 'refunded'

// ─── Database record ──────────────────────────────────────────────────────────

export interface EscrowRecord {
  id: string
  product_id: string | null
  listing_id: string | null
  buyer_id: string
  seller_id: string
  amount_pi: number
  status: EscrowStatus
  pi_payment_id: string | null
  shipping_method: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

// ─── Request / response bodies ────────────────────────────────────────────────

export interface CreateEscrowRequest {
  product_id: string
  shipping_method?: string
}

export interface CreateEscrowResponse {
  escrow_id: string
  amount_pi: number
  seller_id: string
}

export interface VerifyPaymentRequest {
  payment_id: string
  escrow_id: string
}

export interface VerifyPaymentResponse {
  success: true
  escrow_id: string
  status: 'funded'
}

export interface UpdateStatusRequest {
  escrow_id: string
  action: EscrowAction
  tracking_number?: string
  carrier?: string
  reason?: string
}

export interface UpdateStatusResponse {
  success: true
  escrow_id: string
  status: string
  updated_at: string
}

// ─── Pi Network API response shapes ──────────────────────────────────────────

export interface PiPaymentStatus {
  developer_approved: boolean
  transaction_verified: boolean
  developer_completed: boolean
  cancelled: boolean
  user_cancelled: boolean
}

export interface PiPaymentTransaction {
  txid: string
  verified: boolean
  _link: string
}

export interface PiPaymentResponse {
  identifier: string
  user_uid: string
  amount: number
  memo: string
  metadata: Record<string, unknown>
  status: PiPaymentStatus
  transaction: PiPaymentTransaction | null
  created_at: string
  network: string
}

// ─── Shipping cost mapping ────────────────────────────────────────────────────

export const SHIPPING_COSTS: Record<string, number> = {
  standard: 0.5,
  express: 1.0,
  local_pickup: 0,
}

// ─── State machine ────────────────────────────────────────────────────────────

/**
 * Maps each allowed action to the set of statuses that permit it.
 */
export const VALID_FROM_STATUS: Record<EscrowAction, EscrowStatus[]> = {
  shipped: ['funded'],
  delivered: ['shipped'],
  released: ['delivered'],
  disputed: ['funded', 'shipped'],
  refunded: ['pending', 'disputed'],
}
