'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Listing, ShippingAddress, ShippingConfig } from '@/lib/types'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorBoundary from '@/components/ErrorBoundary'
import PaymentBreakdown from '@/components/PaymentBreakdown'
import ShippingAddressForm from '@/components/ShippingAddressForm'
import ShippingSelector from '@/components/ShippingSelector'
import PiPayButton from '@/components/PiPayButton'
import { useStore } from '@/store/useStore'

interface CheckoutContentProps {
  listingId: string
}

function CheckoutContent({ listingId }: CheckoutContentProps) {
  const router = useRouter()
  const { currentUser, createEscrow, openModal } = useStore()

  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [shipping, setShipping] = useState<ShippingConfig>({ category: 'local', carrier: 'nassau_courier' })
  const [selectedAddress, setSelectedAddress] = useState<Omit<ShippingAddress, 'id' | 'user_id' | 'created_at'> | null>(null)
  const [savedAddresses, setSavedAddresses] = useState<ShippingAddress[]>([])
  const [escrowId, setEscrowId] = useState<string | null>(null)
  const [creatingEscrow, setCreatingEscrow] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listingId)
          .single()
        if (error || !data) throw new Error('Listing not found')
        setListing(data as Listing)

        if (currentUser) {
          const { data: addrs } = await supabase
            .from('shipping_addresses')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('is_default', { ascending: false })
          setSavedAddresses((addrs as ShippingAddress[]) ?? [])
        }
      } catch (err) {
        console.error('Checkout fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    void fetchData()
  }, [listingId, currentUser])

  const isPhysical = listing?.product_type === 'physical'

  /**
   * Create escrow BEFORE initiating the Pi payment so we have an escrow_id
   * to pass to PiPayButton.  The escrow is created in 'pending' status and
   * the paymentId is linked to it during onReadyForServerApproval.
   */
  const handleInitiatePayment = async () => {
    if (!listing || !currentUser || creatingEscrow || escrowId) return
    setCreatingEscrow(true)
    try {
      let savedAddressId: string | undefined

      // Save new shipping address if provided
      if (isPhysical && selectedAddress && currentUser) {
        const { data: addrData } = await supabase
          .from('shipping_addresses')
          .insert({
            user_id: currentUser.id,
            ...selectedAddress,
          })
          .select('id')
          .single()
        savedAddressId = (addrData as { id: string } | null)?.id
      }

      const escrow = await createEscrow({
        listing_id: listing.id,
        buyer_id: currentUser.id,
        seller_id: listing.seller_id,
        amount_pi: listing.price_pi,
        product_type: isPhysical ? 'physical' : 'digital',
        pi_payment_id: 'pending',
        ...(savedAddressId ? { shipping_address_id: savedAddressId } : {}),
        ...(isPhysical
          ? {
              shipping_carrier: shipping.carrier,
            }
          : {}),
      })
      if (!escrow) throw new Error('Failed to create escrow record')
      setEscrowId(escrow.id)
    } catch (err) {
      console.error('Escrow creation failed:', err)
      openModal({
        title: 'Checkout Error',
        message: 'Could not prepare your order. Please try again.',
        variant: 'alert',
      })
    } finally {
      setCreatingEscrow(false)
    }
  }

  /**
   * Called after Pi payment is fully verified and the escrow is held.
   * Navigate the user to the order detail page.
   */
  const handlePaymentComplete = async (_pid: string, _txid: string) => {
    if (!escrowId) return
    router.push(`/orders/${escrowId}`)
  }

  if (loading) return <LoadingSkeleton rows={6} variant="rows" />
  if (!listing) {
    return (
      <div className="p-6 text-center">
        <p style={{ color: 'var(--color-subtext)' }}>Listing not found.</p>
      </div>
    )
  }

  const readyToPay = (!isPhysical || selectedAddress !== null) && escrowId !== null
  const canInitiatePayment = !isPhysical || selectedAddress !== null

  return (
    <main className="min-h-screen pb-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="px-4 pt-6 max-w-lg mx-auto space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => router.back()} className="text-xl" style={{ color: 'var(--color-gold)' }}>
            ←
          </button>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}>
            Checkout
          </h1>
        </div>

        {/* Listing summary */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-card-bg)' }}>
          <div className="flex gap-3 p-4">
            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: '#0A0A0F' }}>
              {listing.images[0] ? (
                <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-secondary-bg"></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span
                className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-1"
                style={{
                  backgroundColor: isPhysical ? '#16213E' : '#1a2a1a',
                  color: isPhysical ? '#8B5CF6' : '#22C55E',
                  border: `1px solid ${isPhysical ? '#8B5CF6' : '#22C55E'}`,
                }}
              >
                {isPhysical ? 'Physical' : 'Digital'}
              </span>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)', fontFamily: 'Sora, sans-serif' }}>
                {listing.title}
              </h2>
              <p className="font-bold mt-1" style={{ color: 'var(--color-gold)' }}>
                {listing.price_pi} π
              </p>
            </div>
          </div>
        </div>

        {/* Shipping or digital note */}
        {isPhysical ? (
          <div className="space-y-4">
            <h2 className="font-semibold" style={{ color: 'var(--color-text)', fontFamily: 'Sora, sans-serif' }}>
              Shipping Address
            </h2>
            <ShippingAddressForm
              savedAddresses={savedAddresses}
              onAddressSelected={(addr) => setSelectedAddress(addr)}
            />

            <h2 className="font-semibold" style={{ color: 'var(--color-text)', fontFamily: 'Sora, sans-serif' }}>
              Shipping Method
            </h2>
            <ShippingSelector
              value={shipping}
              onChange={setShipping}
            />
          </div>
        ) : (
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: '#22C55E' }}>
              📥 Digital Delivery — No Shipping Required
            </p>
            <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
              The seller will deliver this item via chat or a download link after payment is confirmed.
            </p>
          </div>
        )}

        {/* Payment breakdown */}
        <PaymentBreakdown amountPi={listing.price_pi} />

        {/* Escrow protection info */}
        <div className="rounded-xl p-4" style={{ backgroundColor: '#0D1B2A', border: '1px solid rgba(240,192,64,0.2)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#F0C040' }}>
            🔒 Escrow Protection
          </p>
          <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
            Your Pi is held securely until you confirm receipt. If there&apos;s a problem, you can open a dispute and our team will help resolve it.
          </p>
        </div>

        {/* Pay button */}
        {currentUser ? (
          escrowId ? (
            <PiPayButton
              amount={listing.price_pi}
              memo={`PiBazaar: ${listing.title}`}
              metadata={{ listing_id: listing.id, buyer_id: currentUser.id }}
              escrowId={escrowId}
              onComplete={() => {}}
              onEscrowHeld={(eid) => router.push(`/orders/${eid}`)}
              onCancel={() => {
                openModal({ title: 'Payment Cancelled', message: 'Your payment was cancelled. No Pi was charged.', variant: 'info' })
              }}
              disabled={!readyToPay}
            />
          ) : (
            <button
              onClick={() => void handleInitiatePayment()}
              disabled={creatingEscrow || !canInitiatePayment}
              className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-opacity"
              style={{
                backgroundColor: '#F0C040',
                color: '#000',
                fontFamily: 'Sora, sans-serif',
                opacity: creatingEscrow || !canInitiatePayment ? 0.7 : 1,
              }}
            >
              {creatingEscrow ? (
                <>
                  <span className="inline-block w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  Preparing Order…
                </>
              ) : (
                'Proceed to Payment'
              )}
            </button>
          )
        ) : (
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--color-card-bg)' }}>
            <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
              Please sign in with your Pi account to continue.
            </p>
          </div>
        )}

        {isPhysical && !selectedAddress && (
          <p className="text-xs text-center" style={{ color: 'var(--color-subtext)' }}>
            Please enter a shipping address to enable payment.
          </p>
        )}
      </div>
    </main>
  )
}

interface PageProps {
  params: Promise<{ listingId: string }>
}

export default function CheckoutPage({ params }: PageProps) {
  const [listingId, setListingId] = useState<string | null>(null)

  useEffect(() => {
    params.then(({ listingId: id }) => setListingId(id)).catch(() => {
      // params resolution failed — leave listingId null so the fallback UI shows
    })
  }, [params])

  if (!listingId) return <LoadingSkeleton rows={6} variant="rows" />

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSkeleton rows={6} variant="rows" />}>
        <CheckoutContent listingId={listingId} />
      </Suspense>
    </ErrorBoundary>
  )
}
