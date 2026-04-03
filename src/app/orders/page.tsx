'use client'

import { useEffect, useState, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import type { EscrowTransaction } from '@/lib/types'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorBoundary from '@/components/ErrorBoundary'
import OrderCard from '@/components/OrderCard'

type Tab = 'purchases' | 'sales'

export default function OrdersPage() {
  const { currentUser, escrowTransactions, fetchOrders } = useStore()
  const [tab, setTab] = useState<Tab>('purchases')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOrders = useCallback(() => {
    if (!currentUser) return
    setLoading(true)
    setError(null)
    fetchOrders(currentUser.id)
      .catch(() => {
        setError('Failed to load orders. Please try again.')
      })
      .finally(() => setLoading(false))
  }, [currentUser, fetchOrders])

  useEffect(() => {
    if (!currentUser) {
      setLoading(false)
      return
    }
    loadOrders()
  }, [currentUser, loadOrders])

  const purchases = escrowTransactions.filter(
    (t: EscrowTransaction) => t.buyer_id === currentUser?.id
  )
  const sales = escrowTransactions.filter(
    (t: EscrowTransaction) => t.seller_id === currentUser?.id
  )
  const displayed = tab === 'purchases' ? purchases : sales

  return (
    <ErrorBoundary>
      <main className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
          <h1
            className="text-2xl font-bold mb-4"
            style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
          >
            Orders
          </h1>

          {/* Tabs */}
          <div className="flex gap-2 mb-5">
            {(['purchases', 'sales'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-5 py-2 rounded-full text-sm font-medium capitalize"
                style={{
                  backgroundColor: tab === t ? '#F0C040' : 'var(--color-card-bg)',
                  color: tab === t ? '#000' : 'var(--color-text)',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {!currentUser ? (
            <div className="text-center py-16">
              
              <p style={{ color: 'var(--color-subtext)' }}>Sign in to view your orders.</p>
            </div>
          ) : loading ? (
            <LoadingSkeleton rows={4} variant="rows" />
          ) : error ? (
            <div className="text-center py-16">
              
              <p className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                Something went wrong
              </p>
              <p className="text-sm mb-4" style={{ color: 'var(--color-subtext)' }}>
                {error}
              </p>
              <button
                onClick={loadOrders}
                className="px-6 py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
              >
                Try Again
              </button>
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-16">
              
              <p className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                No orders yet
              </p>
              <p style={{ color: 'var(--color-subtext)' }}>
                {tab === 'purchases'
                  ? 'Browse listings to get started'
                  : 'Your sales will appear here when buyers purchase your listings'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map((order: EscrowTransaction) => (
                <OrderCard
                  key={order.id}
                  order={order}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </ErrorBoundary>
  )
}
