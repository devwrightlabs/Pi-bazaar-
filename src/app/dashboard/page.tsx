'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { supabase } from '@/lib/supabase'
import type { EscrowTransaction, Listing } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import ErrorBoundary from '@/components/ErrorBoundary'
import EscrowStatusBadge from '@/components/EscrowStatusBadge'
import OrderCard from '@/components/OrderCard'

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardTab = 'purchases' | 'shop' | 'analytics' | 'manage'

interface ShopStats {
  totalPiEarned: number
  activeOrders: number
  pendingReviews: number
}

// ─── Revenue helpers ──────────────────────────────────────────────────────────

interface MonthlySale {
  month: string
  revenue: number
}

function getMonthlyRevenue(sales: EscrowTransaction[]): MonthlySale[] {
  const completed = sales.filter((t) =>
    ['completed', 'auto_released'].includes(t.status),
  )

  const buckets: Record<string, number> = {}
  for (const tx of completed) {
    const d = new Date(tx.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets[key] = (buckets[key] ?? 0) + tx.net_amount_pi
  }

  // Return last 6 months (most recent last)
  const allKeys = Object.keys(buckets).sort()
  const last6 = allKeys.slice(-6)
  return last6.map((key) => ({
    month: new Date(key + '-01').toLocaleDateString(undefined, { month: 'short' }),
    revenue: buckets[key],
  }))
}

function getTopProducts(
  sales: EscrowTransaction[],
  listings: Listing[],
): Array<{ listingId: string; title: string; count: number; revenue: number }> {
  const map = new Map<string, { count: number; revenue: number }>()
  for (const tx of sales.filter((t) =>
    ['completed', 'auto_released'].includes(t.status),
  )) {
    const prev = map.get(tx.listing_id) ?? { count: 0, revenue: 0 }
    map.set(tx.listing_id, {
      count: prev.count + 1,
      revenue: prev.revenue + tx.net_amount_pi,
    })
  }

  const arr = Array.from(map.entries()).map(([listingId, data]) => {
    const listing = listings.find((l) => l.id === listingId)
    return { listingId, title: listing?.title ?? `Listing #${listingId.slice(0, 8)}`, ...data }
  })
  arr.sort((a, b) => b.revenue - a.revenue)
  return arr.slice(0, 5)
}

// ─── CSS Bar Chart ────────────────────────────────────────────────────────────

function RevenueChart({ data }: { data: MonthlySale[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1)

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
          No sales data yet
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2" style={{ height: '160px' }}>
      {data.map((d, i) => {
        const pct = (d.revenue / max) * 100
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] font-semibold" style={{ color: 'var(--color-gold)' }}>
              {d.revenue.toFixed(1)}π
            </span>
            <div
              className="w-full rounded-t-lg transition-all duration-500"
              style={{
                height: `${Math.max(pct, 4)}%`,
                backgroundColor: 'var(--color-gold)',
                opacity: 0.8 + (i / data.length) * 0.2,
              }}
            />
            <span className="text-[10px]" style={{ color: 'var(--color-subtext)' }}>
              {d.month}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Top Products Table ───────────────────────────────────────────────────────

function TopProductsTable({
  products,
}: {
  products: Array<{ listingId: string; title: string; count: number; revenue: number }>
}) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-center py-4" style={{ color: 'var(--color-subtext)' }}>
        No completed sales yet
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {products.map((p, idx) => (
        <div
          key={p.listingId}
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{ backgroundColor: 'var(--color-card-bg)' }}
        >
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{
              backgroundColor: idx === 0 ? 'var(--color-gold)' : 'var(--color-control-bg)',
              color: idx === 0 ? '#000' : 'var(--color-text)',
            }}
          >
            {idx + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--color-text)' }}
            >
              {p.title}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-subtext)' }}>
              {p.count} sale{p.count > 1 ? 's' : ''}
            </p>
          </div>
          <span
            className="text-sm font-bold flex-shrink-0"
            style={{ color: 'var(--color-gold)' }}
          >
            {p.revenue.toFixed(2)} π
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Bulk Listing Manager ─────────────────────────────────────────────────────

function BulkListingManager({
  sellerListings,
  onBulkAction,
  loading,
}: {
  sellerListings: Listing[]
  onBulkAction: (ids: string[], action: 'activate' | 'deactivate' | 'delete') => void
  loading: boolean
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === sellerListings.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(sellerListings.map((l) => l.id)))
    }
  }

  const activeListings = sellerListings.filter((l) => l.status === 'active')
  const inactiveListings = sellerListings.filter((l) => l.status !== 'active')

  return (
    <div className="space-y-4">
      {/* Select all + bulk actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={toggleAll}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: 'var(--color-control-bg)', color: 'var(--color-text)' }}
        >
          {selected.size === sellerListings.length ? 'Deselect All' : 'Select All'}
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => onBulkAction(Array.from(selected), 'activate')}
            disabled={selected.size === 0 || loading}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-success)', color: '#fff' }}
          >
            Activate
          </button>
          <button
            onClick={() => onBulkAction(Array.from(selected), 'deactivate')}
            disabled={selected.size === 0 || loading}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-control-bg)', color: 'var(--color-text)' }}
          >
            Deactivate
          </button>
          <button
            onClick={() => onBulkAction(Array.from(selected), 'delete')}
            disabled={selected.size === 0 || loading}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-error)', color: '#fff' }}
          >
            Delete
          </button>
        </div>
      </div>

      {sellerListings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
            No listings to manage
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sellerListings.map((listing) => (
            <div
              key={listing.id}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{
                backgroundColor: 'var(--color-card-bg)',
                border: selected.has(listing.id)
                  ? '2px solid var(--color-gold)'
                  : '2px solid transparent',
              }}
            >
              <button
                onClick={() => toggle(listing.id)}
                className="w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors"
                style={{
                  borderColor: selected.has(listing.id) ? 'var(--color-gold)' : 'var(--color-border)',
                  backgroundColor: selected.has(listing.id) ? 'var(--color-gold)' : 'transparent',
                }}
                aria-label={`Select ${listing.title}`}
              >
                {selected.has(listing.id) && (
                  <span className="text-xs font-bold" style={{ color: '#000' }}>✓</span>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: 'var(--color-text)' }}
                >
                  {listing.title}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-subtext)' }}>
                  {listing.price_in_pi} π · {listing.category}
                </p>
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor:
                    listing.status === 'active'
                      ? 'rgba(34, 197, 94, 0.15)'
                      : 'rgba(136, 136, 136, 0.15)',
                  color: listing.status === 'active' ? 'var(--color-success)' : 'var(--color-subtext)',
                }}
              >
                {listing.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-center" style={{ color: 'var(--color-subtext)' }}>
        {selected.size} of {sellerListings.length} selected
      </p>
    </div>
  )
}

// ─── Scheduled Publishing Placeholder ─────────────────────────────────────────

function ScheduledPublishing({
  onSchedule,
}: {
  onSchedule: (listingId: string, date: string) => void
}) {
  const [draftId, setDraftId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
  }

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
        Schedule a listing to go live at a specific date and time.
      </p>
      <div>
        <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--color-subtext)' }}>
          Listing ID
        </label>
        <input
          type="text"
          placeholder="Paste listing ID…"
          value={draftId}
          onChange={(e) => setDraftId(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={inputStyle}
        />
      </div>
      <div>
        <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--color-subtext)' }}>
          Publish Date & Time
        </label>
        <input
          type="datetime-local"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={inputStyle}
        />
      </div>
      <button
        onClick={() => {
          if (draftId.trim() && scheduledDate) {
            onSchedule(draftId.trim(), scheduledDate)
            setDraftId('')
            setScheduledDate('')
          }
        }}
        disabled={!draftId.trim() || !scheduledDate}
        className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-40 transition-all active:scale-[0.98]"
        style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
      >
        Schedule Publish
      </button>
    </div>
  )
}

// ─── Dashboard Skeleton ───────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto space-y-5">
      {/* Profile header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton shape="circle" className="w-16 h-16" />
        <div className="flex-1 space-y-2">
          <Skeleton shape="line" className="h-5 w-32" />
          <Skeleton shape="line" className="h-3 w-48" />
        </div>
      </div>
      {/* Tabs skeleton */}
      <div className="flex gap-2">
        <Skeleton shape="line" className="h-10 w-32 rounded-full" />
        <Skeleton shape="line" className="h-10 w-32 rounded-full" />
      </div>
      {/* Bento grid skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton shape="card" className="h-28 rounded-xl" />
        <Skeleton shape="card" className="h-28 rounded-xl" />
        <Skeleton shape="card" className="h-28 rounded-xl col-span-2" />
      </div>
      {/* Order list skeleton */}
      <div className="space-y-3">
        <Skeleton shape="card" className="h-20 rounded-xl" />
        <Skeleton shape="card" className="h-20 rounded-xl" />
        <Skeleton shape="card" className="h-20 rounded-xl" />
      </div>
    </div>
  )
}

// ─── Bento Stat Card ──────────────────────────────────────────────────────────

function BentoCard({
  label,
  value,
  icon,
  accent,
  className = '',
}: {
  label: string
  value: string | number
  icon: string
  accent: string
  className?: string
}) {
  return (
    <div
      className={`rounded-xl p-4 flex flex-col justify-between min-h-[100px] ${className}`}
      style={{
        backgroundColor: 'var(--color-card-bg)',
        border: `1px solid ${accent}25`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${accent}20`, color: accent }}
        >
          {label}
        </span>
      </div>
      <p
        className="text-2xl font-bold"
        style={{ fontFamily: 'Sora, sans-serif', color: accent }}
      >
        {value}
      </p>
    </div>
  )
}

// ─── Active Order Row (seller view) ──────────────────────────────────────────

function SellerOrderRow({
  order,
  onShip,
  onDeliver,
}: {
  order: EscrowTransaction
  onShip: (orderId: string) => void
  onDeliver: (orderId: string) => void
}) {
  const canShip =
    order.status === 'payment_received' && order.product_type === 'physical'
  const canDeliver =
    order.status === 'payment_received' && order.product_type === 'digital'

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        backgroundColor: 'var(--color-card-bg)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--color-text)', fontFamily: 'Sora, sans-serif' }}
          >
            Order #{order.id.slice(0, 8)}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-subtext)' }}>
            {order.product_type === 'physical' ? '📦 Physical' : '💾 Digital'} · {order.amount_pi} π
          </p>
        </div>
        <EscrowStatusBadge status={order.status} />
      </div>

      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-subtext)' }}>
        <span>
          {new Date(order.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
        <span className="font-bold" style={{ color: 'var(--color-gold)' }}>
          Net: {order.net_amount_pi} π
        </span>
      </div>

      {/* Action buttons */}
      {(canShip || canDeliver) && (
        <div className="flex gap-2">
          {canShip && (
            <button
              onClick={() => onShip(order.id)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{ backgroundColor: '#8B5CF6', color: '#fff' }}
            >
              🚚 Mark as Shipped
            </button>
          )}
          {canDeliver && (
            <button
              onClick={() => onDeliver(order.id)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{ backgroundColor: '#14B8A6', color: '#fff' }}
            >
              📤 Upload Deliverables
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Ship Modal ───────────────────────────────────────────────────────────────

function ShipModal({
  onSubmit,
  onClose,
  loading,
}: {
  onSubmit: (tracking: string, carrier: string) => void
  onClose: () => void
  loading: boolean
}) {
  const [tracking, setTracking] = useState('')
  const [carrier, setCarrier] = useState('')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 space-y-4"
        style={{ backgroundColor: 'var(--color-card-bg)' }}
      >
        <h3
          className="font-bold text-lg"
          style={{ color: 'var(--color-text)', fontFamily: 'Sora, sans-serif' }}
        >
          Enter Tracking Info
        </h3>
        <input
          type="text"
          placeholder="Tracking Number"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{
            backgroundColor: 'var(--color-background)',
            color: 'var(--color-text)',
            border: '1px solid rgba(136,136,136,0.3)',
          }}
        />
        <input
          type="text"
          placeholder="Shipping Carrier"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{
            backgroundColor: 'var(--color-background)',
            color: 'var(--color-text)',
            border: '1px solid rgba(136,136,136,0.3)',
          }}
        />
        <button
          onClick={() => onSubmit(tracking, carrier)}
          disabled={!tracking.trim() || !carrier.trim() || loading}
          className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all active:scale-95"
          style={{ backgroundColor: 'var(--color-royal-purple)', color: '#fff' }}
        >
          {loading ? 'Updating…' : '🚚 Mark as Shipped'}
        </button>
        <button
          onClick={onClose}
          className="w-full py-2 text-sm transition-all active:scale-95"
          style={{ color: 'var(--color-subtext)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Deliver Modal ────────────────────────────────────────────────────────────

function DeliverModal({
  onSubmit,
  onClose,
  loading,
}: {
  onSubmit: (proof: string) => void
  onClose: () => void
  loading: boolean
}) {
  const [proof, setProof] = useState('')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 space-y-4"
        style={{ backgroundColor: 'var(--color-card-bg)' }}
      >
        <h3
          className="font-bold text-lg"
          style={{ color: 'var(--color-text)', fontFamily: 'Sora, sans-serif' }}
        >
          Upload Deliverables
        </h3>
        <p className="text-xs" style={{ color: 'var(--color-subtext)' }}>
          Provide a download link or delivery proof for the buyer to review.
        </p>
        <textarea
          placeholder="Paste download link or delivery proof URL…"
          value={proof}
          onChange={(e) => setProof(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
          style={{
            backgroundColor: 'var(--color-background)',
            color: 'var(--color-text)',
            border: '1px solid rgba(136,136,136,0.3)',
          }}
        />
        <button
          onClick={() => onSubmit(proof)}
          disabled={!proof.trim() || loading}
          className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all active:scale-95"
          style={{ backgroundColor: '#14B8A6', color: '#fff' }}
        >
          {loading ? 'Uploading…' : '📤 Upload Deliverables'}
        </button>
        <button
          onClick={onClose}
          className="w-full py-2 text-sm transition-all active:scale-95"
          style={{ color: 'var(--color-subtext)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const { currentUser, escrowTransactions, fetchOrders, openModal } = useStore()
  const [tab, setTab] = useState<DashboardTab>('purchases')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [shipOrderId, setShipOrderId] = useState<string | null>(null)
  const [deliverOrderId, setDeliverOrderId] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<{
    username: string
    avatar_url: string | null
    bio: string | null
    created_at: string
  } | null>(null)

  // ─── Fetch data ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    setError(null)
    try {
      // Fetch profile from user_profiles table
      const profilePromise = supabase
        .from('user_profiles')
        .select('username, avatar_url, bio, created_at')
        .eq('pi_uid', currentUser.id)
        .single()

      // Fetch orders in parallel
      const ordersPromise = fetchOrders(currentUser.id)

      const [profileRes, ordersRes] = await Promise.all([profilePromise, ordersPromise])

      if (profileRes.data) {
        setProfileData(profileRes.data as {
          username: string
          avatar_url: string | null
          bio: string | null
          created_at: string
        })
      }

      // ordersRes is handled by fetchOrders callback which already sets state
    } catch (err) {
      console.error('Dashboard data load error:', err)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [currentUser, fetchOrders])

  useEffect(() => {
    if (!currentUser) {
      setLoading(false)
      return
    }
    void loadData()
  }, [currentUser, loadData])

  // ─── Derived data ───────────────────────────────────────────────────────

  const purchases = escrowTransactions.filter(
    (t) => t.buyer_id === currentUser?.id,
  )
  const sales = escrowTransactions.filter(
    (t) => t.seller_id === currentUser?.id,
  )
  const activeOrders = sales.filter((t) =>
    ['payment_received', 'funded', 'held_in_escrow', 'shipped'].includes(t.status),
  )

  const stats: ShopStats = {
    totalPiEarned: sales
      .filter((t) => ['completed', 'auto_released'].includes(t.status))
      .reduce((sum, t) => sum + t.net_amount_pi, 0),
    activeOrders: activeOrders.length,
    pendingReviews: sales.filter((t) => t.status === 'delivered').length,
  }

  // Analytics derived data
  const { listings: storeListings } = useStore()

  const sellerListings = useMemo(
    () => storeListings.filter((l) => l.seller_id === currentUser?.id),
    [storeListings, currentUser?.id],
  )

  const monthlyRevenue = useMemo(() => getMonthlyRevenue(sales), [sales])
  const topProducts = useMemo(
    () => getTopProducts(sales, storeListings),
    [sales, storeListings],
  )

  // Conversion rate = completed orders / total orders
  const conversionRate = useMemo(() => {
    if (sales.length === 0) return '0.0'
    const completed = sales.filter((t) =>
      ['completed', 'auto_released'].includes(t.status),
    ).length
    return ((completed / sales.length) * 100).toFixed(1)
  }, [sales])

  // ─── Bulk actions ──────────────────────────────────────────────────────

  const handleBulkAction = useCallback(
    async (ids: string[], action: 'activate' | 'deactivate' | 'delete') => {
      if (ids.length === 0) return
      setActionLoading(true)
      try {
        const token =
          typeof window !== 'undefined' ? localStorage.getItem('pibazaar-token') : null

        let succeeded = 0
        let failed = 0

        for (const id of ids) {
          try {
            const endpoint =
              action === 'delete'
                ? `/api/products?id=${encodeURIComponent(id)}`
                : `/api/products`

            const method = action === 'delete' ? 'DELETE' : 'PATCH'
            const body =
              action === 'delete'
                ? undefined
                : JSON.stringify({
                    id,
                    status: action === 'activate' ? 'active' : 'removed',
                  })

            const res = await fetch(endpoint, {
              method,
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body,
            })

            if (res.ok) {
              succeeded++
            } else {
              failed++
            }
          } catch {
            failed++
          }
        }

        openModal({
          title: failed > 0 ? 'Partially Done' : 'Done',
          message:
            failed > 0
              ? `${succeeded} listing(s) updated, ${failed} failed.`
              : `${succeeded} listing(s) updated.`,
          variant: failed > 0 ? 'alert' : 'info',
        })

        // Reload
        if (currentUser) await fetchOrders(currentUser.id)
      } catch {
        openModal({
          title: 'Error',
          message: 'Bulk action failed. Please try again.',
          variant: 'alert',
        })
      } finally {
        setActionLoading(false)
      }
    },
    [currentUser, fetchOrders, openModal],
  )

  const handleSchedulePublish = useCallback(
    (listingId: string, date: string) => {
      // In a full implementation this would call an API endpoint.
      // For now, show a confirmation via the global modal.
      openModal({
        title: 'Scheduled',
        message: `Listing ${listingId.slice(0, 8)}… will publish on ${new Date(date).toLocaleString()}.`,
        variant: 'info',
      })
    },
    [openModal],
  )

  // ─── Seller actions ─────────────────────────────────────────────────────

  const handleShip = async (tracking: string, carrier: string) => {
    if (!shipOrderId) return
    setActionLoading(true)
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('pibazaar-token')
          : null
      const res = await fetch('/api/escrow/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          escrowId: shipOrderId,
          status: 'shipped',
          tracking_number: tracking,
          shipping_carrier: carrier,
        }),
      })
      if (!res.ok) throw new Error('Ship failed')
      setShipOrderId(null)
      if (currentUser) await fetchOrders(currentUser.id)
      openModal({
        title: 'Shipped!',
        message: 'Order has been marked as shipped.',
        variant: 'info',
      })
    } catch {
      openModal({
        title: 'Error',
        message: 'Failed to update shipment. Please try again.',
        variant: 'alert',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeliver = async (proof: string) => {
    if (!deliverOrderId) return
    setActionLoading(true)
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('pibazaar-token')
          : null
      const res = await fetch(`/api/escrow/${deliverOrderId}/deliver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ delivery_proof: proof }),
      })
      if (!res.ok) throw new Error('Deliver failed')
      setDeliverOrderId(null)
      if (currentUser) await fetchOrders(currentUser.id)
      openModal({
        title: 'Delivered!',
        message: 'Deliverables uploaded. The buyer will review them.',
        variant: 'info',
      })
    } catch {
      openModal({
        title: 'Error',
        message: 'Failed to upload deliverables. Please try again.',
        variant: 'alert',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // ─── Not authenticated ──────────────────────────────────────────────────

  if (!currentUser && !loading) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div className="text-center px-6">
          <div
            className="text-6xl mb-6"
            style={{ color: 'var(--color-gold)' }}
            aria-hidden="true"
          >
            π
          </div>
          <h2
            className="text-xl font-bold mb-3"
            style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
          >
            Connect your Pi Wallet
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-subtext)' }}>
            Sign in to access your dashboard
          </p>
          <Button onClick={() => router.push('/profile')}>Go to Profile</Button>
        </div>
      </main>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <ErrorBoundary>
      <main
        className="min-h-screen"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
            {/* ── Profile Header ─────────────────────────────────── */}
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: 'var(--color-secondary-bg)' }}
              >
                {profileData?.avatar_url ? (
                  <img
                    src={profileData.avatar_url}
                    alt={currentUser?.username ?? 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span style={{ color: 'var(--color-gold)' }}>
                    {(currentUser?.username ?? 'P').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1
                  className="text-xl font-bold truncate"
                  style={{
                    fontFamily: 'Sora, sans-serif',
                    color: 'var(--color-text)',
                  }}
                >
                  @{profileData?.username ?? currentUser?.username ?? 'Pioneer'}
                </h1>
                <p className="text-xs" style={{ color: 'var(--color-subtext)' }}>
                  Member since{' '}
                  {new Date(
                    profileData?.created_at ?? currentUser?.created_at ?? '',
                  ).toLocaleDateString(undefined, {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/create')}
              >
                + New Listing
              </Button>
            </div>

            {/* ── Tabs ───────────────────────────────────────────── */}
            <div className="overflow-x-auto scrollbar-hide mb-5">
              <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
                {(
                  [
                    { key: 'purchases', label: 'Purchases' },
                    { key: 'shop', label: 'My Shop' },
                    { key: 'analytics', label: 'Analytics' },
                    { key: 'manage', label: 'Manage' },
                  ] as { key: DashboardTab; label: string }[]
                ).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className="px-5 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
                    style={{
                      backgroundColor:
                        tab === t.key ? 'var(--color-gold)' : 'var(--color-card-bg)',
                      color: tab === t.key ? '#000' : 'var(--color-text)',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Error ──────────────────────────────────────────── */}
            {error && (
              <div className="text-center py-8">
                <p
                  className="font-semibold mb-2"
                  style={{ color: 'var(--color-text)' }}
                >
                  Something went wrong
                </p>
                <p
                  className="text-sm mb-4"
                  style={{ color: 'var(--color-subtext)' }}
                >
                  {error}
                </p>
                <Button onClick={() => void loadData()}>Try Again</Button>
              </div>
            )}

            {/* ── My Purchases Tab ───────────────────────────────── */}
            {tab === 'purchases' && !error && (
              <div>
                {purchases.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-4xl mb-3">🛒</p>
                    <p
                      className="font-semibold mb-2"
                      style={{ color: 'var(--color-text)' }}
                    >
                      No purchases yet
                    </p>
                    <p style={{ color: 'var(--color-subtext)' }}>
                      Browse listings to find something you love
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => router.push('/browse')}
                    >
                      Browse Listings
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchases.map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── My Shop Tab ────────────────────────────────────── */}
            {tab === 'shop' && !error && (
              <div className="space-y-5">
                {/* Bento Grid Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <BentoCard
                    label="Total Pi Earned"
                    value={`${stats.totalPiEarned.toFixed(2)} π`}
                    icon="💰"
                    accent="#F0C040"
                  />
                  <BentoCard
                    label="Active Orders"
                    value={stats.activeOrders}
                    icon="📋"
                    accent="#8B5CF6"
                  />
                  <BentoCard
                    label="Pending Reviews"
                    value={stats.pendingReviews}
                    icon="⏳"
                    accent="#14B8A6"
                    className="col-span-2"
                  />
                </div>

                {/* Active Orders List */}
                <div>
                  <h2
                    className="text-lg font-bold mb-3"
                    style={{
                      fontFamily: 'Sora, sans-serif',
                      color: 'var(--color-text)',
                    }}
                  >
                    Active Orders
                  </h2>
                  {activeOrders.length === 0 &&
                  sales.filter((t) => t.status === 'delivered').length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-4xl mb-3">🏪</p>
                      <p
                        className="font-semibold mb-2"
                        style={{ color: 'var(--color-text)' }}
                      >
                        No active orders
                      </p>
                      <p style={{ color: 'var(--color-subtext)' }}>
                        Your sales will appear here when buyers purchase your
                        listings
                      </p>
                      <Button
                        className="mt-4"
                        onClick={() => router.push('/create')}
                      >
                        Create a Listing
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        ...activeOrders,
                        ...sales.filter((t) => t.status === 'delivered'),
                      ].map((order) => (
                        <SellerOrderRow
                          key={order.id}
                          order={order}
                          onShip={(id) => setShipOrderId(id)}
                          onDeliver={(id) => setDeliverOrderId(id)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent completed sales */}
                {sales.filter((t) =>
                  ['completed', 'auto_released'].includes(t.status),
                ).length > 0 && (
                  <div>
                    <h2
                      className="text-lg font-bold mb-3"
                      style={{
                        fontFamily: 'Sora, sans-serif',
                        color: 'var(--color-text)',
                      }}
                    >
                      Completed Sales
                    </h2>
                    <div className="space-y-3">
                      {sales
                        .filter((t) =>
                          ['completed', 'auto_released'].includes(t.status),
                        )
                        .slice(0, 5)
                        .map((order) => (
                          <OrderCard key={order.id} order={order} />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Analytics Tab ──────────────────────────────────── */}
            {tab === 'analytics' && !error && (
              <div className="space-y-6">
                {/* Revenue Chart */}
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--color-card-bg)' }}
                >
                  <h2
                    className="font-bold text-base mb-4"
                    style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
                  >
                    Revenue (π)
                  </h2>
                  <RevenueChart data={monthlyRevenue} />
                </div>

                {/* Quick stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div
                    className="rounded-xl p-3 text-center"
                    style={{ backgroundColor: 'var(--color-card-bg)' }}
                  >
                    <p className="text-xl font-bold" style={{ color: 'var(--color-gold)' }}>
                      {stats.totalPiEarned.toFixed(1)}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--color-subtext)' }}>
                      Total π Earned
                    </p>
                  </div>
                  <div
                    className="rounded-xl p-3 text-center"
                    style={{ backgroundColor: 'var(--color-card-bg)' }}
                  >
                    <p className="text-xl font-bold" style={{ color: 'var(--color-success)' }}>
                      {conversionRate}%
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--color-subtext)' }}>
                      Conversion Rate
                    </p>
                  </div>
                  <div
                    className="rounded-xl p-3 text-center"
                    style={{ backgroundColor: 'var(--color-card-bg)' }}
                  >
                    <p className="text-xl font-bold" style={{ color: 'var(--color-royal-purple)' }}>
                      {sales.length}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--color-subtext)' }}>
                      Total Orders
                    </p>
                  </div>
                </div>

                {/* Top Products */}
                <div>
                  <h2
                    className="font-bold text-base mb-3"
                    style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
                  >
                    Top Products
                  </h2>
                  <TopProductsTable products={topProducts} />
                </div>
              </div>
            )}

            {/* ── Manage Tab ─────────────────────────────────────── */}
            {tab === 'manage' && !error && (
              <div className="space-y-6">
                {/* Bulk Listing Manager */}
                <div>
                  <h2
                    className="font-bold text-base mb-3"
                    style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
                  >
                    Bulk Listing Management
                  </h2>
                  <BulkListingManager
                    sellerListings={sellerListings}
                    onBulkAction={handleBulkAction}
                    loading={actionLoading}
                  />
                </div>

                {/* Scheduled Publishing */}
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--color-card-bg)' }}
                >
                  <h2
                    className="font-bold text-base mb-3"
                    style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
                  >
                    Scheduled Publishing
                  </h2>
                  <ScheduledPublishing onSchedule={handleSchedulePublish} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Ship Modal ────────────────────────────────────────── */}
        {shipOrderId && (
          <ShipModal
            onSubmit={handleShip}
            onClose={() => setShipOrderId(null)}
            loading={actionLoading}
          />
        )}

        {/* ── Deliver Modal ─────────────────────────────────────── */}
        {deliverOrderId && (
          <DeliverModal
            onSubmit={handleDeliver}
            onClose={() => setDeliverOrderId(null)}
            loading={actionLoading}
          />
        )}
      </main>
    </ErrorBoundary>
  )
}
