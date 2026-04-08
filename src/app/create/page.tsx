'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { CreateListingForm, ScrapedListing } from '@/lib/types'
import type { TargetMarket, ProductType, ShippingMethod } from '@/lib/types'
import { useStore } from '@/store/useStore'
import PhotoUploader from '@/components/PhotoUploader'
import ListingPreviewCard from '@/components/ListingPreviewCard'
import ConditionSelector from '@/components/ConditionSelector'
import CategoryDropdown from '@/components/CategoryDropdown'
import PiPriceInput from '@/components/PiPriceInput'
import AISuggestButton from '@/components/AISuggestButton'
import LocationPicker from '@/components/LocationPicker'
import FastSellerAgreement from '@/components/FastSellerAgreement'
import URLImportForm from '@/components/URLImportForm'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorBoundary from '@/components/ErrorBoundary'

const INITIAL_FORM: CreateListingForm = {
  title: '',
  description: '',
  price_pi: 0,
  category: '',
  condition: 'new',
  images: [],
  location_city: '',
  location_country: '',
  allow_offers: true,
  fast_seller_agreed: false,
  target_market: 'global',
  product_type: 'physical',
  shipping_method: 'shipping_information',
}

type Tab = 'manual' | 'url'

function CharCounter({ value, max }: { value: string; max: number }) {
  const count = value.length
  const near = count >= max * 0.9
  return (
    <span
      className="text-xs"
      style={{ color: near ? 'var(--color-error)' : 'var(--color-subtext)' }}
    >
      {count}/{max}
    </span>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block text-sm font-medium mb-1.5"
      style={{ color: 'var(--color-text)', fontFamily: 'Sora, sans-serif' }}
    >
      {children}
    </label>
  )
}

function inputStyle(): React.CSSProperties {
  return {
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text)',
    border: '1px solid rgba(136,136,136,0.3)',
  }
}

export default function CreateListingPage() {
  const router = useRouter()
  const { currentUser, openModal } = useStore()
  const [activeTab, setActiveTab] = useState<Tab>('manual')
  const [form, setForm] = useState<CreateListingForm>(INITIAL_FORM)
  const [publishing, setPublishing] = useState(false)
  const [previewCollapsed, setPreviewCollapsed] = useState(false)

  const update = useCallback(<K extends keyof CreateListingForm>(key: K, value: CreateListingForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleURLImport = (data: Partial<ScrapedListing> & { piPrice?: number }) => {
    setForm((prev) => ({
      ...prev,
      title: data.title ?? prev.title,
      description: data.description ?? prev.description,
      price_pi: data.piPrice ?? prev.price_pi,
      images: data.images && data.images.length > 0 ? data.images : prev.images,
    }))
    // Switch to manual tab so user can review/edit
    setActiveTab('manual')
  }

  const validate = (): string | null => {
    if (!form.title.trim()) return 'Title is required'
    if (form.price_pi <= 0) return 'Price must be greater than 0'
    if (!form.category) return 'Please select a category'
    if (!form.condition) return 'Please select a condition'
    if (!form.description.trim()) return 'Description is required'
    if (form.images.length === 0) return 'At least one photo is required'
    if (!form.fast_seller_agreed) return 'You must agree to the Fast Seller Agreement'
    return null
  }

  const handlePublish = async () => {
    if (!currentUser) {
      openModal({
        title: 'Not logged in',
        message: 'Please connect your Pi Wallet before publishing a listing.',
        variant: 'alert',
      })
      return
    }

    const validationError = validate()
    if (validationError) {
      openModal({
        title: 'Missing information',
        message: validationError,
        variant: 'alert',
      })
      return
    }

    setPublishing(true)
    try {
      const { data, error } = await supabase
        .from('listings')
        .insert({
          seller_id: currentUser.id,
          title: form.title.trim(),
          description: form.description.trim(),
          price_pi: form.price_pi,
          category: form.category,
          condition: form.condition,
          images: form.images,
          location_lat: 0,
          location_lng: 0,
          city: form.location_city.trim(),
          country: form.location_country.trim(),
          origin_country: form.target_market === 'local' ? 'BS' : form.location_country.trim(),
          product_type: form.product_type,
          allow_offers: form.allow_offers,
          is_active: true,
          is_boosted: false,
        })
        .select()
        .single()

      if (error) throw error

      openModal({
        title: 'Listing published!',
        message: 'Your listing is now live on PiBazaar.',
        variant: 'info',
      })
      setForm(INITIAL_FORM)
      router.push(`/browse`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to publish listing'
      openModal({
        title: 'Publish failed',
        message: `${msg} Please try again.`,
        variant: 'confirm',
        onConfirm: () => void handlePublish(),
        onCancel: () => setPublishing(false),
      })
      setPublishing(false)
    }
  }

  const canPublish =
    form.title.trim().length > 0 &&
    form.price_pi > 0 &&
    form.category.length > 0 &&
    form.description.trim().length > 0 &&
    form.images.length > 0 &&
    form.fast_seller_agreed &&
    !publishing

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="px-4 pt-6 pb-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="text-2xl"
            aria-label="Go back"
          >
            &#8592;
          </button>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
          >
            Create Listing
          </h1>
        </div>

        {/* Tabs */}
        <div
          className="flex rounded-xl mb-6 overflow-hidden"
          style={{ backgroundColor: 'var(--color-card-bg)' }}
        >
          {(['manual', 'url'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-3 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: activeTab === tab ? 'var(--color-gold)' : 'transparent',
                color: activeTab === tab ? '#000' : 'var(--color-subtext)',
              }}
            >
              {tab === 'manual' ? 'Manual' : 'URL Import'}
            </button>
          ))}
        </div>

        <ErrorBoundary>
          {/* Desktop 2-column layout */}
          <div className="lg:grid lg:grid-cols-2 lg:gap-8">
            {/* Left — Form */}
            <div className="space-y-5">
              {activeTab === 'url' ? (
                <URLImportForm onImported={handleURLImport} />
              ) : (
                <>
                  {/* Photos */}
                  <div>
                    <FieldLabel>Photos</FieldLabel>
                    <PhotoUploader
                      photos={form.images}
                      onPhotosChange={(urls) => update('images', urls)}
                    />
                  </div>

                  {/* Title */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <FieldLabel>Title</FieldLabel>
                      <CharCounter value={form.title} max={100} />
                    </div>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => update('title', e.target.value.slice(0, 100))}
                      placeholder="What are you selling?"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={{
                        ...inputStyle(),
                        caretColor: 'var(--color-gold)',
                      }}
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <FieldLabel>Price (Pi)</FieldLabel>
                    <PiPriceInput
                      value={form.price_pi}
                      onChange={(val) => update('price_pi', val)}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <FieldLabel>Category</FieldLabel>
                    <CategoryDropdown
                      value={form.category}
                      onChange={(val) => update('category', val)}
                    />
                  </div>

                  {/* Condition */}
                  <div>
                    <FieldLabel>Condition</FieldLabel>
                    <ConditionSelector
                      value={form.condition}
                      onChange={(val) => update('condition', val)}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <FieldLabel>Description</FieldLabel>
                      <CharCounter value={form.description} max={2000} />
                    </div>
                    <textarea
                      value={form.description}
                      onChange={(e) => update('description', e.target.value.slice(0, 2000))}
                      placeholder="Describe your item — condition, features, why you're selling..."
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                      style={{
                        ...inputStyle(),
                        caretColor: 'var(--color-gold)',
                      }}
                    />
                    <div className="mt-2">
                      <AISuggestButton
                        title={form.title}
                        category={form.category}
                        condition={form.condition}
                        onGenerated={(desc) => update('description', desc)}
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <FieldLabel>Location</FieldLabel>
                    <LocationPicker
                      city={form.location_city}
                      country={form.location_country}
                      onCityChange={(val) => update('location_city', val)}
                      onCountryChange={(val) => update('location_country', val)}
                    />
                  </div>

                  {/* Product Type */}
                  <div>
                    <FieldLabel>Product Type</FieldLabel>
                    <div className="flex gap-2">
                      {(
                        [
                          { key: 'physical' as ProductType, label: '📦 Physical', desc: 'Ships to buyer' },
                          { key: 'digital' as ProductType, label: '💾 Digital', desc: 'Delivered online' },
                        ] as const
                      ).map((pt) => (
                        <button
                          key={pt.key}
                          type="button"
                          onClick={() => {
                            update('product_type', pt.key)
                            if (pt.key === 'digital') {
                              update('shipping_method', 'digital_delivery')
                            } else if (form.target_market === 'local') {
                              update('shipping_method', 'nassau_courier')
                            } else {
                              update('shipping_method', 'international_shipping')
                            }
                          }}
                          className="flex-1 py-3 px-3 rounded-xl text-center transition-all"
                          style={{
                            backgroundColor: form.product_type === pt.key ? 'rgba(240,192,64,0.15)' : 'var(--color-card-bg)',
                            color: form.product_type === pt.key ? 'var(--color-gold)' : 'var(--color-text)',
                            border: form.product_type === pt.key ? '1px solid rgba(240,192,64,0.4)' : '1px solid rgba(136,136,136,0.2)',
                          }}
                        >
                          <p className="text-sm font-semibold">{pt.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-subtext)' }}>{pt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target Market Toggle — only for physical products */}
                  {form.product_type === 'physical' && (
                    <div>
                      <FieldLabel>Target Market</FieldLabel>
                      <div
                        className="flex items-center justify-between py-3 px-4 rounded-xl"
                        style={{ backgroundColor: 'var(--color-card-bg)' }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-2xl">{form.target_market === 'local' ? '🇧🇸' : '🌐'}</span>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                              {form.target_market === 'local' ? 'Local (Bahamas)' : 'Global'}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--color-subtext)' }}>
                              {form.target_market === 'local'
                                ? 'Ship within The Bahamas only'
                                : 'Ship internationally'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={form.target_market === 'global'}
                          aria-label={`Target market: ${form.target_market}`}
                          onClick={() => {
                            const next: TargetMarket = form.target_market === 'local' ? 'global' : 'local'
                            update('target_market', next)
                            update('shipping_method', next === 'local' ? 'nassau_courier' : 'international_shipping')
                          }}
                          className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
                          style={{
                            backgroundColor: form.target_market === 'global' ? 'var(--color-gold)' : '#8B5CF6',
                          }}
                        >
                          <span
                            className="absolute top-0.5 w-5 h-5 rounded-full transition-transform bg-white"
                            style={{
                              transform: form.target_market === 'global' ? 'translateX(26px)' : 'translateX(2px)',
                            }}
                          />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Shipping Information — dynamic based on target market & product type */}
                  <div>
                    <FieldLabel>
                      {form.product_type === 'digital' ? 'Delivery Method' : 'Shipping Information'}
                    </FieldLabel>
                    {form.product_type === 'digital' ? (
                      <div
                        className="py-3 px-4 rounded-xl text-sm"
                        style={{
                          backgroundColor: 'rgba(20,184,166,0.1)',
                          color: '#14B8A6',
                          border: '1px solid rgba(20,184,166,0.3)',
                        }}
                      >
                        💾 Digital Delivery — files/links sent via PiBazaar
                      </div>
                    ) : form.target_market === 'local' ? (
                      <div className="flex gap-2">
                        {(
                          [
                            { key: 'nassau_courier', label: '🚗 Nassau Courier' },
                            { key: 'local_pickup', label: '📍 Local Pickup' },
                          ] as const
                        ).map((sm) => (
                          <button
                            key={sm.key}
                            type="button"
                            onClick={() => update('shipping_method', sm.key)}
                            className="flex-1 py-3 px-3 rounded-xl text-sm font-medium transition-all"
                            style={{
                              backgroundColor: form.shipping_method === sm.key ? 'rgba(139,92,246,0.15)' : 'var(--color-card-bg)',
                              color: form.shipping_method === sm.key ? '#8B5CF6' : 'var(--color-text)',
                              border: form.shipping_method === sm.key ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(136,136,136,0.2)',
                            }}
                          >
                            {sm.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div
                        className="py-3 px-4 rounded-xl text-sm"
                        style={{
                          backgroundColor: 'rgba(240,192,64,0.1)',
                          color: 'var(--color-gold)',
                          border: '1px solid rgba(240,192,64,0.3)',
                        }}
                      >
                        🌐 International Shipping — standard worldwide delivery
                      </div>
                    )}
                  </div>

                  {/* Allow Offers */}
                  <div className="flex items-center justify-between py-3 px-4 rounded-xl" style={{ backgroundColor: 'var(--color-card-bg)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                        Allow Offers
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-subtext)' }}>
                        Let buyers send you offers
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => update('allow_offers', !form.allow_offers)}
                      className="relative w-12 h-6 rounded-full transition-colors"
                      style={{
                        backgroundColor: form.allow_offers ? 'var(--color-gold)' : 'rgba(136,136,136,0.3)',
                      }}
                      aria-label={`Allow offers: ${form.allow_offers ? 'on' : 'off'}`}
                    >
                      <span
                        className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
                        style={{
                          backgroundColor: '#fff',
                          transform: form.allow_offers ? 'translateX(26px)' : 'translateX(2px)',
                        }}
                      />
                    </button>
                  </div>

                  {/* Fast Seller Agreement */}
                  <FastSellerAgreement
                    checked={form.fast_seller_agreed}
                    onChange={(val) => update('fast_seller_agreed', val)}
                  />

                  {/* Publish Button */}
                  <button
                    type="button"
                    onClick={() => void handlePublish()}
                    disabled={!canPublish}
                    className="w-full py-4 rounded-xl text-base font-bold transition-opacity disabled:opacity-40"
                    style={{
                      backgroundColor: canPublish ? 'var(--color-gold)' : 'rgba(136,136,136,0.3)',
                      color: canPublish ? '#000' : 'var(--color-subtext)',
                    }}
                  >
                    {publishing ? (
                      <span className="flex items-center justify-center gap-2">
                        <span
                          className="inline-block w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                          style={{ borderColor: '#000', borderTopColor: 'transparent' }}
                        />
                        Publishing...
                      </span>
                    ) : (
                      'Publish Listing'
                    )}
                  </button>

                  {!form.fast_seller_agreed && (
                    <p className="text-xs text-center" style={{ color: 'var(--color-subtext)' }}>
                      You must agree to the Fast Seller Agreement before publishing
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Right — Live Preview (desktop sticky, mobile collapsible) */}
            <div className="mt-8 lg:mt-0">
              {/* Mobile toggle */}
              <button
                type="button"
                onClick={() => setPreviewCollapsed((p) => !p)}
                className="lg:hidden w-full flex items-center justify-between py-3 px-4 rounded-xl mb-3"
                style={{ backgroundColor: 'var(--color-card-bg)', color: 'var(--color-text)' }}
              >
                <span className="text-sm font-semibold" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Preview
                </span>
                <span className="text-xs" style={{ color: 'var(--color-gold)' }}>
                  {previewCollapsed ? 'Show' : 'Hide'}
                </span>
              </button>

              {!previewCollapsed && (
                <div className="lg:sticky lg:top-6">
                  <p
                    className="hidden lg:block text-sm font-semibold mb-4"
                    style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
                  >
                    Live Preview
                  </p>
                  <div className="flex justify-center">
                    <ListingPreviewCard
                      form={form}
                      sellerName={currentUser?.username ?? 'you'}
                    />
                  </div>
                  <p className="text-xs text-center mt-3" style={{ color: 'var(--color-subtext)' }}>
                    This is how your listing will appear in the browse feed
                  </p>
                </div>
              )}
            </div>
          </div>
        </ErrorBoundary>
      </div>
    </main>
  )
}
