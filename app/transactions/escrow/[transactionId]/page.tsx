'use client'

/**
 * Escrow Transaction Detail Page
 *
 * This page displays escrow transaction details with conditional UI based on
 * the transaction status and user role (buyer/seller).
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { Database, TransactionRow } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export default function EscrowTransactionPage({ params }: { params: { transactionId: string } }) {
  const { transactionId } = params
  const router = useRouter()
  const [transaction, setTransaction] = useState<TransactionRow | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

  useEffect(() => {
    const loadTransaction = async () => {
      setLoading(true)
      setError(null)

      try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError('Please log in to view transactions')
          setLoading(false)
          return
        }

        setUserId(session.user.id)

        // Fetch transaction
        const { data, error: fetchError } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', transactionId)
          .single()

        if (fetchError) {
          console.error('[escrow] Error fetching transaction:', fetchError)
          setError('Failed to load transaction')
        } else {
          setTransaction(data)
        }
      } catch (err) {
        console.error('[escrow] Error:', err)
        setError('An error occurred')
      } finally {
        setLoading(false)
      }
    }

    void loadTransaction()
  }, [transactionId, supabase])

  const handleMarkAsShipped = async () => {
    if (!transaction) return

    setActionLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ status: 'shipped' })
        .eq('id', transactionId)

      if (updateError) {
        setError('Failed to mark as shipped')
      } else {
        setSuccessMessage('Transaction marked as shipped!')
        setTransaction({ ...transaction, status: 'shipped' })
      }
    } catch (err) {
      console.error('[escrow] Ship error:', err)
      setError('An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReleaseFunds = async () => {
    if (!transaction) return

    setActionLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ status: 'completed_released' })
        .eq('id', transactionId)

      if (updateError) {
        setError('Failed to release funds')
      } else {
        setSuccessMessage('Funds released to seller!')
        setTransaction({ ...transaction, status: 'completed_released' })
      }
    } catch (err) {
      console.error('[escrow] Release error:', err)
      setError('An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <p style={{ color: 'var(--color-subtext)' }}>Loading...</p>
      </main>
    )
  }

  if (error && !transaction) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="text-center">
          <p style={{ color: '#EF4444' }}>{error}</p>
        </div>
      </main>
    )
  }

  if (!transaction) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="text-center">
          <p style={{ color: 'var(--color-subtext)' }}>Transaction not found</p>
        </div>
      </main>
    )
  }

  const isBuyer = userId === transaction.buyer_id
  const isSeller = userId === transaction.seller_id

  // Conditional UI based on status
  const showReleaseFundsButton = isBuyer && transaction.status === 'shipped'
  const showMarkAsShippedButton = isSeller && transaction.status === 'funded_in_escrow'

  return (
    <main className="min-h-screen pb-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="px-4 pt-6 max-w-lg mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-xl"
            style={{ color: 'var(--color-gold)' }}
          >
            ←
          </button>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
          >
            Escrow Transaction
          </h1>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--color-subtext)' }}>
            Status:
          </span>
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: transaction.status === 'completed_released' ? '#22C55E' : 'var(--color-gold)',
              color: '#000',
            }}
          >
            {transaction.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* Transaction Details */}
        <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: 'var(--color-card-bg)' }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-subtext)' }}>Transaction ID</span>
            <span className="font-mono text-xs" style={{ color: 'var(--color-text)' }}>
              {transaction.id.slice(0, 8)}…
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-subtext)' }}>Listing ID</span>
            <span className="font-mono text-xs" style={{ color: 'var(--color-text)' }}>
              {transaction.listing_id.slice(0, 8)}…
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-subtext)' }}>Price</span>
            <span className="font-bold" style={{ color: 'var(--color-gold)' }}>
              {transaction.price} π
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-subtext)' }}>Your Role</span>
            <span style={{ color: 'var(--color-text)' }}>
              {isBuyer ? 'Buyer' : isSeller ? 'Seller' : 'Observer'}
            </span>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div
            className="p-4 rounded-xl"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22C55E' }}
          >
            <p className="text-sm" style={{ color: '#22C55E' }}>{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            className="p-4 rounded-xl"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444' }}
          >
            <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>
          </div>
        )}

        {/* Buyer Actions */}
        {showReleaseFundsButton && (
          <div className="space-y-2">
            <button
              onClick={() => void handleReleaseFunds()}
              disabled={actionLoading}
              className="w-full py-3 rounded-xl font-semibold text-sm"
              style={{
                backgroundColor: '#22C55E',
                color: '#fff',
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              {actionLoading ? 'Processing...' : 'Release Funds to Seller'}
            </button>
            <p className="text-xs text-center" style={{ color: 'var(--color-subtext)' }}>
              Only release funds when you have received the item
            </p>
          </div>
        )}

        {/* Seller Actions */}
        {showMarkAsShippedButton && (
          <div className="space-y-2">
            <button
              onClick={() => void handleMarkAsShipped()}
              disabled={actionLoading}
              className="w-full py-3 rounded-xl font-semibold text-sm"
              style={{
                backgroundColor: '#8B5CF6',
                color: '#fff',
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              {actionLoading ? 'Processing...' : 'Mark as Shipped'}
            </button>
            <p className="text-xs text-center" style={{ color: 'var(--color-subtext)' }}>
              Only mark as shipped when you have sent the item
            </p>
          </div>
        )}

        {/* Status Information */}
        {transaction.status === 'pending' && (
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-card-bg)' }}>
            <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
              Transaction is pending payment confirmation.
            </p>
          </div>
        )}

        {transaction.status === 'funded_in_escrow' && isBuyer && (
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-card-bg)' }}>
            <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
              Funds are held in escrow. Waiting for seller to ship the item.
            </p>
          </div>
        )}

        {transaction.status === 'completed_released' && (
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22C55E' }}>
            <p className="text-sm font-semibold" style={{ color: '#22C55E' }}>
              ✅ Transaction Complete
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-subtext)' }}>
              Funds have been released to the seller.
            </p>
          </div>
        )}

        {transaction.status === 'disputed' && (
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444' }}>
            <p className="text-sm font-semibold" style={{ color: '#EF4444' }}>
              ⚠️ Transaction Disputed
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-subtext)' }}>
              This transaction is under review.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
