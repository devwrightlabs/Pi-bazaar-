'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useStore } from '@/store/useStore'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import ErrorBoundary from '@/components/ErrorBoundary'
import TrustBadge from '@/components/marketplace/TrustBadge'
import MakeOfferModal from '@/components/MakeOfferModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductDetail {
  id: string
  seller_id: string
  title: string
  description: string
  price_in_pi: number
  category: string
  condition?: string
  images: string[]
  city: string
  country: string
  origin_country?: string
  is_pro_seller?: boolean
  product_type?: 'physical' | 'digital' | 'service'
  created_at: string
}

type EscrowStep = 'payment_held' | 'under_review' | 'funds_released'

const ESCROW_STEPS: { key: EscrowStep; label: string; icon: string }[] = [
  { key: 'payment_held', label: 'Payment Held', icon: '🔒' },
  { key: 'under_review', label: 'Under Review', icon: '🔍' },
  { key: 'funds_released', label: 'Funds Released', icon: '✅' },
]

const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
}

// ─── ProductDetailContent ─────────────────────────────────────────────────────

function ProductDetailContent({ productId }: { productId: string }) {
  const router = useRouter()
  const { currentUser, openModal } = useStore()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const [currentStep, setCurrentStep] = useState<EscrowStep>('payment_held')
  const [reviewLoading, setReviewLoading] = useState(false)
  const [offerOpen, setOfferOpen] = useState(false)

  const fetchProduct = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}`)
      if (!res.ok) throw new Error('Product not found')
      const data = (await res.json()) as ProductDetail
      setProduct(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product')
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    void fetchProduct()
  }, [fetchProduct])

  const handleRequestRevision = async () => {
    if (!product) return
    setReviewLoading(true)
    try {
      const res = await fetch(`/api/escrow/${encodeURIComponent(product.id)}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'revision_requested',
          description: 'Buyer has requested a revision of deliverables.',
        }),
      })
      if (!res.ok) throw new Error('Request failed')
      setCurrentStep('under_review')
      openModal({
        title: 'Revision Requested',
        message: 'Your revision request has been submitted. The seller will be notified.',
        variant: 'info',
      })
    } catch {
      openModal({
        title: 'Error',
        message: 'Failed to submit revision request. Please try again.',
        variant: 'alert',
      })
    } finally {
      setReviewLoading(false)
    }
  }

  const handleApproveRelease = async () => {
    if (!product) return
    setReviewLoading(true)
    try {
      const res = await fetch(`/api/escrow/${encodeURIComponent(product.id)}/confirm`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Approval failed')
      setCurrentStep('funds_released')
      openModal({
        title: 'Pi Released',
        message: 'Payment has been approved and Pi will be released to the seller.',
        variant: 'info',
      })
    } catch {
      openModal({
        title: 'Error',
        message: 'Failed to approve release. Please try again.',
        variant: 'alert',
      })
    } finally {
      setReviewLoading(false)
    }
  }

  // Loading state with skeleton
  if (loading) {
    return (
      <main className="min-h-screen pb-8" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="px-4 pt-6 max-w-lg mx-auto space-y-4">
          <Skeleton shape="line" className="h-8 w-24 rounded-lg" />
          <Skeleton shape="card" className="h-72 w-full rounded-2xl" />
          <Skeleton shape="line" className="h-6 w-3/4" />
          <Skeleton shape="line" className="h-8 w-1/3" />
          <Skeleton shape="line" className="h-4 w-full" />
          <Skeleton shape="line" className="h-4 w-5/6" />
          <Skeleton shape="card" className="h-24 w-full rounded-xl" />
        </div>
      </main>
    )
  }

  // Error state
  if (error || !product) {
    return (
      <main className="min-h-screen pb-8" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <p className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            {error ?? 'Product not found'}
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--color-subtext)' }}>
            This listing may have been removed or is no longer available.
          </p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </main>
    )
  }

  const imageUrl = product.images?.[0]
  const hasImage = Boolean(imageUrl) && !imgError
  // Dual-check: product_type is the canonical field; category fallback supports
  // listings that were created before the product_type column was added.
  const isService = product.product_type === 'service' || product.category === 'Professional Services'
  const currentUserSellerId = currentUser?.pi_uid
  const isAuthenticated = Boolean(currentUserSellerId)
  const isBuyer = isAuthenticated && currentUserSellerId !== product.seller_id
  const currentStepIndex = ESCROW_STEPS.findIndex((s) => s.key === currentStep)

  return (
    <main className="min-h-screen pb-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="px-4 pt-6 max-w-lg mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-xl"
            style={{ color: 'var(--color-gold)' }}
            aria-label="Go back"
          >
            ←
          </button>
          <h1
            className="text-xl font-bold flex-1"
            style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
          >
            Product Detail
          </h1>
          {product.is_pro_seller && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
              style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 1L7.5 4.2L11 4.7L8.5 7.1L9.1 10.6L6 9L2.9 10.6L3.5 7.1L1 4.7L4.5 4.2L6 1Z" fill="#8B5CF6" />
                <path d="M4 6L5.5 7.5L8 5" stroke="#fff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Pro Seller
            </span>
          )}
        </div>

        {/* Product Image */}
        <div
          className="relative w-full aspect-[4/3] overflow-hidden rounded-2xl"
          style={{
            border: product.is_pro_seller
              ? '2px solid var(--color-gold)'
              : '1px solid var(--color-border)',
          }}
        >
          {hasImage ? (
            <Image
              src={imageUrl}
              alt={product.title}
              fill
              className="object-cover"
              unoptimized
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-5xl"
              style={{ backgroundColor: 'var(--color-secondary-bg)' }}
            >
              📦
            </div>
          )}
          {product.is_pro_seller && (
            <div className="absolute top-3 left-3 z-10">
              <TrustBadge size="md" />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-2">
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
          >
            {product.title}
          </h2>
          <p className="text-3xl font-bold" style={{ color: 'var(--color-gold)' }}>
            π {product.price_in_pi}
          </p>
        </div>

        {/* Details Card */}
        <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: 'var(--color-card-bg)' }}>
          {product.description && (
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
              {product.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            {product.category && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: 'var(--color-secondary-bg)', color: 'var(--color-text)' }}
              >
                {product.category}
              </span>
            )}
            {product.condition && CONDITION_LABELS[product.condition] && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: 'var(--color-secondary-bg)', color: 'var(--color-text)' }}
              >
                {CONDITION_LABELS[product.condition]}
              </span>
            )}
            {product.product_type && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium capitalize"
                style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }}
              >
                {product.product_type}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs" style={{ color: 'var(--color-subtext)' }}>
              📍 {product.city}, {product.country}
            </span>
            {product.origin_country && (
              <span className="text-xs" style={{ color: 'var(--color-subtext)' }}>
                · Origin: {product.origin_country}
              </span>
            )}
          </div>
        </div>

        {/* Escrow Transaction Progress */}
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-card-bg)' }}>
          <h3
            className="font-semibold text-sm mb-4"
            style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
          >
            Transaction Progress
          </h3>
          <div className="flex items-center justify-between">
            {ESCROW_STEPS.map((step, idx) => {
              const isCompleted = idx < currentStepIndex
              const isActive = idx === currentStepIndex
              const isFuture = idx > currentStepIndex

              return (
                <div key={step.key} className="flex items-center flex-1">
                  {/* Step circle */}
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold border-2"
                      style={{
                        backgroundColor: isActive
                          ? 'var(--color-gold)'
                          : isCompleted
                          ? '#22C55E'
                          : 'var(--color-secondary-bg)',
                        borderColor: isActive
                          ? 'var(--color-gold)'
                          : isCompleted
                          ? '#22C55E'
                          : 'var(--color-border)',
                        color: isActive || isCompleted ? '#000' : 'var(--color-subtext)',
                      }}
                    >
                      {isCompleted ? '✓' : step.icon}
                    </div>
                    <p
                      className="text-[10px] mt-1.5 text-center font-medium leading-tight"
                      style={{
                        color: isActive
                          ? 'var(--color-gold)'
                          : isCompleted
                          ? '#22C55E'
                          : isFuture
                          ? 'var(--color-subtext)'
                          : 'var(--color-text)',
                      }}
                    >
                      {step.label}
                    </p>
                  </div>

                  {/* Connector */}
                  {idx < ESCROW_STEPS.length - 1 && (
                    <div
                      className="h-0.5 flex-1 mx-1 -mt-5"
                      style={{
                        backgroundColor: idx < currentStepIndex ? '#22C55E' : 'var(--color-border)',
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Review Deliverables — for Services, always show; for others, show when relevant */}
        {isBuyer && (isService || currentStep !== 'funds_released') && (
          <div
            className="rounded-xl p-4 space-y-4"
            style={{
              backgroundColor: 'var(--color-card-bg)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}
          >
            <h3
              className="font-semibold text-sm"
              style={{ fontFamily: 'Sora, sans-serif', color: '#8B5CF6' }}
            >
              {isService ? '📋 Review Deliverables' : '📦 Review Deliverables'}
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-subtext)' }}>
              {isService
                ? 'Review the service deliverables before approving payment release.'
                : 'Review the received item before confirming and releasing payment.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRequestRevision}
                disabled={reviewLoading}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--color-gold)',
                  border: '1px solid rgba(240, 192, 64, 0.4)',
                  opacity: reviewLoading ? 0.6 : 1,
                }}
              >
                Request Revision
              </button>
              <button
                onClick={handleApproveRelease}
                disabled={reviewLoading}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-150 active:scale-95"
                style={{
                  backgroundColor: '#22C55E',
                  color: '#fff',
                  opacity: reviewLoading ? 0.6 : 1,
                }}
              >
                Approve & Release Pi
              </button>
            </div>
          </div>
        )}

        {/* Shipping Details — for physical products only, hidden for services */}
        {!isService && (
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-card-bg)' }}>
            <h3
              className="font-semibold text-sm mb-2"
              style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
            >
              📦 Shipping Details
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-subtext)' }}>
              Shipping information will be available once the seller dispatches the item.
            </p>
          </div>
        )}

        {/* Buy Button */}
        <Button
          size="lg"
          className="w-full rounded-xl"
          onClick={() => router.push(`/checkout/${product.id}`)}
        >
          Buy with π {product.price_in_pi}
        </Button>

        {/* Make Offer Button — only for buyers */}
        {isBuyer && (
          <button
            onClick={() => setOfferOpen(true)}
            className="w-full border border-[#F0C040] text-[#F0C040] bg-transparent rounded-xl px-4 py-3 font-semibold text-sm transition-all duration-150 active:scale-95"
          >
            💰 Make an Offer
          </button>
        )}

        {/* Message Seller */}
        <button
          onClick={() => router.push('/chat')}
          className="w-full py-3 rounded-xl font-semibold text-sm"
          style={{
            backgroundColor: 'var(--color-card-bg)',
            color: 'var(--color-gold)',
            border: '1px solid rgba(240, 192, 64, 0.3)',
          }}
        >
          💬 Message Seller
        </button>
      </div>

      {/* Make Offer Modal */}
      <MakeOfferModal
        listing={{
          id: product.id,
          title: product.title,
          price_in_pi: product.price_in_pi,
          seller_id: product.seller_id,
        }}
        isOpen={offerOpen}
        onClose={() => setOfferOpen(false)}
        onSuccess={() => {
          setOfferOpen(false)
        }}
      />
    </main>
  )
}

// ─── Page Component ───────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ProductDetailPage({ params }: PageProps) {
  const [productId, setProductId] = useState<string | null>(null)

  useEffect(() => {
    params.then(({ id }) => setProductId(id))
  }, [params])

  if (!productId) return <Skeleton shape="card" className="m-4" />

  return (
    <ErrorBoundary>
      <ProductDetailContent productId={productId} />
    </ErrorBoundary>
  )
}
