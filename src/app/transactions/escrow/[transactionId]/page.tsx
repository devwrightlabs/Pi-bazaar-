'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { releaseEscrow, markAsShipped } from '@/actions/transaction'
import type { TransactionRow } from '@/types/database'

/**
 * Escrow Transaction Dashboard
 *
 * Conditional UI based on user role and transaction status:
 * - Buyer + status=shipped: Show "Release Funds to Seller" button
 * - Seller + status=funded_in_escrow: Show "Mark as Shipped" button
 */
export default function EscrowDashboardPage() {
  const router = useRouter()
  const params = useParams()
  const transactionId = params.transactionId as string

  const [transaction, setTransaction] = useState<TransactionRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTransaction = async () => {
      setLoading(true)
      setError(null)

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        const user = session?.user
        const accessToken = session?.access_token

        if (!user || !accessToken) {
          router.push('/login')
          return
        }

        setUserId(user.id)

        const response = await fetch(`/api/escrow/${encodeURIComponent(transactionId)}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!response.ok) {
          let message = 'Transaction not found'

          try {
            const errorBody = (await response.json()) as { error?: string; message?: string }
            message = errorBody.error ?? errorBody.message ?? message
          } catch {
            // Ignore JSON parsing errors and fall back to the default message.
          }

          throw new Error(message)
        }

        const data = (await response.json()) as TransactionRow
        setTransaction(data)
      } catch (err) {
        console.error('Failed to fetch transaction:', err)
        setError(err instanceof Error ? err.message : 'Failed to load transaction')
      } finally {
        setLoading(false)
      }
    }

    void fetchTransaction()
  }, [transactionId, router])

  const handleReleaseFunds = async () => {
    if (!transaction || actionLoading) return

    setActionLoading(true)
    setError(null)

    try {
      await releaseEscrow(transaction.id)
      setTransaction({ ...transaction, status: 'completed_released' })
      alert('Funds have been released to the seller!')
    } catch (err) {
      console.error('Failed to release funds:', err)
      setError(err instanceof Error ? err.message : 'Failed to release funds')
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkAsShipped = async () => {
    if (!transaction || actionLoading) return

    setActionLoading(true)
    setError(null)

    try {
      await markAsShipped(transaction.id)
      setTransaction({ ...transaction, status: 'shipped' })
      alert('Order marked as shipped!')
    } catch (err) {
      console.error('Failed to mark as shipped:', err)
      setError(err instanceof Error ? err.message : 'Failed to mark as shipped')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div className="text-center">
          <div
            className="inline-block w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mb-2"
            style={{ borderColor: 'var(--color-gold)' }}
          />
          <p style={{ color: 'var(--color-subtext)' }}>Loading transaction...</p>
        </div>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div className="text-center">
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            Transaction Not Found
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--color-subtext)' }}>
            {error || 'The requested transaction could not be found.'}
          </p>
          <button
            onClick={() => router.push('/marketplace')}
            className="px-6 py-3 rounded-xl font-semibold"
            style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
          >
            Go to Marketplace
          </button>
        </div>
      </div>
    )
  }

  const isBuyer = userId === transaction.buyer_id
  const isSeller = userId === transaction.seller_id
  const canRelease = isBuyer && transaction.status === 'shipped'
  const canMarkShipped = isSeller && transaction.status === 'funded_in_escrow'

  const statusColor = {
    pending: '#94A3B8',
    funded_in_escrow: '#F0C040',
    shipped: '#8B5CF6',
    completed_released: '#22C55E',
    disputed: '#EF4444',
  }[transaction.status]

  return (
    <main
      className="min-h-screen pb-8"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="px-4 pt-6 max-w-2xl mx-auto space-y-5">
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
            Escrow Dashboard
          </h1>
        </div>

        <div
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-card-bg)' }}
        >
          <div className="flex items-center justify-between">
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
            >
              Transaction Details
            </h2>
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold capitalize"
              style={{
                backgroundColor: `${statusColor}20`,
                color: statusColor,
                border: `1px solid ${statusColor}`,
              }}
            >
              {transaction.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-subtext)' }}>Transaction ID</span>
              <span className="font-mono text-xs" style={{ color: 'var(--color-text)' }}>
                {transaction.id.slice(0, 12)}...
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-subtext)' }}>Listing ID</span>
              <span className="font-mono text-xs" style={{ color: 'var(--color-text)' }}>
                {transaction.listing_id.slice(0, 12)}...
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-subtext)' }}>Price</span>
              <span className="font-bold" style={{ color: 'var(--color-gold)' }}>
                {transaction.price} π
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-subtext)' }}>Your Role</span>
              <span
                className="font-semibold capitalize"
                style={{ color: 'var(--color-text)' }}
              >
                {isBuyer ? 'Buyer' : isSeller ? 'Seller' : 'Observer'}
              </span>
            </div>
            {transaction.created_at && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-subtext)' }}>Created</span>
                <span style={{ color: 'var(--color-text)' }}>
                  {new Date(transaction.created_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {transaction.status === 'funded_in_escrow' && (
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: '#0D1B2A',
              border: '1px solid rgba(240,192,64,0.3)',
            }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: '#F0C040' }}>
              🔒 Escrow Protection Active
            </p>
            <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
              Funds are held securely in escrow. {isSeller ? 'Ship the item to release payment.' : 'Payment will be released once you confirm receipt.'}
            </p>
          </div>
        )}

        {error && (
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <p className="text-sm font-semibold" style={{ color: '#EF4444' }}>
              {error}
            </p>
          </div>
        )}

        {canRelease && (
          <button
            onClick={() => void handleReleaseFunds()}
            disabled={actionLoading}
            className="w-full py-4 rounded-xl font-bold text-lg transition-opacity"
            style={{
              backgroundColor: '#22C55E',
              color: '#fff',
              fontFamily: 'Sora, sans-serif',
              opacity: actionLoading ? 0.7 : 1,
            }}
          >
            {actionLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Releasing Funds...
              </span>
            ) : (
              '✓ Release Funds to Seller'
            )}
          </button>
        )}

        {canMarkShipped && (
          <button
            onClick={() => void handleMarkAsShipped()}
            disabled={actionLoading}
            className="w-full py-4 rounded-xl font-bold text-lg transition-opacity"
            style={{
              backgroundColor: '#8B5CF6',
              color: '#fff',
              fontFamily: 'Sora, sans-serif',
              opacity: actionLoading ? 0.7 : 1,
            }}
          >
            {actionLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Marking as Shipped...
              </span>
            ) : (
              '🚚 Mark as Shipped'
            )}
          </button>
        )}

        {transaction.status === 'completed_released' && (
          <div
            className="rounded-xl p-5 text-center"
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <div className="text-4xl mb-2">✅</div>
            <p className="font-semibold mb-1" style={{ color: '#22C55E' }}>
              Transaction Complete
            </p>
            <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
              {isBuyer
                ? 'Funds have been released to the seller. Thank you for your purchase!'
                : 'Funds have been released to your wallet. Thank you for selling!'}
            </p>
          </div>
        )}

        {transaction.status === 'disputed' && (
          <div
            className="rounded-xl p-5 text-center"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <div className="text-4xl mb-2">⚠️</div>
            <p className="font-semibold mb-1" style={{ color: '#EF4444' }}>
              Transaction Disputed
            </p>
            <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
              This transaction is under review. Our support team will resolve this issue.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
