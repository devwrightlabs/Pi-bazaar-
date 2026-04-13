'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * Server Action: Release Escrow
 *
 * Allows the buyer to release funds to the seller when satisfied with delivery.
 * Updates transaction status to 'completed_released'.
 */
export async function releaseEscrow(transactionId: string, accessToken: string) {
  if (!accessToken) {
    throw new Error('Unauthorized: Missing access token')
  }

  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken)

  if (userError || !user) {
    throw new Error('Unauthorized: User must be logged in')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: transaction, error: fetchError } = await (supabase as any)
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (fetchError || !transaction) {
    throw new Error('Transaction not found')
  }

  if (transaction.buyer_id !== user.id) {
    throw new Error('Unauthorized: Only the buyer can release funds')
  }

  if (transaction.status !== 'shipped') {
    throw new Error('Transaction must be in shipped status to release funds')
  }

  const update = {
    status: 'completed_released',
    updated_at: new Date().toISOString(),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updatedTransaction, error: updateError } = await (supabase as any)
    .from('transactions')
    .update(update)
    .eq('id', transactionId)
    .eq('status', 'shipped')
    .select('id')
    .single()

  if (updateError || !updatedTransaction) {
    console.error('Failed to release escrow:', updateError)
    throw new Error('Failed to release funds: transaction is no longer in shipped status')
  }

  return { success: true }
}

/**
 * Server Action: Mark as Shipped
 *
 * Allows the seller to mark the transaction as shipped.
 * Updates transaction status to 'shipped'.
 */
export async function markAsShipped(transactionId: string) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized: User must be logged in')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: transaction, error: fetchError } = await (supabase as any)
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (fetchError || !transaction) {
    throw new Error('Transaction not found')
  }

  if (transaction.seller_id !== user.id) {
    throw new Error('Unauthorized: Only the seller can mark as shipped')
  }

  if (transaction.status !== 'funded_in_escrow') {
    throw new Error('Transaction must be funded in escrow to mark as shipped')
  }

  const update = {
    status: 'shipped',
    updated_at: new Date().toISOString(),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('transactions')
    .update(update)
    .eq('id', transactionId)

  if (updateError) {
    console.error('Failed to mark as shipped:', updateError)
    throw new Error('Failed to mark as shipped')
  }

  return { success: true }
}

/**
 * Server Action: Open Dispute
 *
 * Allows the buyer to open a dispute on a transaction.
 */
export async function openDispute(transactionId: string, reason: string) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized: User must be logged in')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: transaction, error: fetchError } = await (supabase as any)
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (fetchError || !transaction) {
    throw new Error('Transaction not found')
  }

  if (transaction.buyer_id !== user.id) {
    throw new Error('Unauthorized: Only the buyer can open a dispute')
  }

  if (!['funded_in_escrow', 'shipped'].includes(transaction.status)) {
    throw new Error('Cannot dispute a transaction in this status')
  }

  const update = {
    status: 'disputed',
    updated_at: new Date().toISOString(),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('transactions')
    .update(update)
    .eq('id', transactionId)

  if (updateError) {
    console.error('Failed to open dispute:', updateError)
    throw new Error('Failed to open dispute')
  }

  return { success: true }
}
