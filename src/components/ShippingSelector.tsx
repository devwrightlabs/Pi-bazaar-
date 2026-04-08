'use client'

import type {
  ShippingConfig,
  ShippingCategory,
  LocalCarrier,
  InternationalCarrier,
} from '@/lib/types'

interface CarrierOption {
  key: LocalCarrier | InternationalCarrier
  label: string
  description: string
}

const LOCAL_CARRIERS: CarrierOption[] = [
  { key: 'nassau_courier', label: '🚗 Nassau Courier', description: 'Same-day delivery in Nassau' },
  { key: 'local_pickup', label: '📍 Local Pickup', description: 'Arrange pickup with seller' },
  { key: 'bahamas_post', label: '📮 Bahamas Post', description: '2–5 business days' },
  { key: 'quickship_bahamas', label: '⚡ QuickShip Bahamas', description: 'Express island delivery' },
]

const INTERNATIONAL_CARRIERS: CarrierOption[] = [
  { key: 'fedex', label: '📦 FedEx', description: '2–5 business days internationally' },
  { key: 'dhl', label: '🌍 DHL', description: '3–7 business days internationally' },
  { key: 'ups', label: '📦 UPS', description: '3–7 business days internationally' },
  { key: 'usps', label: '✉️ USPS', description: '7–14 business days internationally' },
]

interface Props {
  value: ShippingConfig
  onChange: (config: ShippingConfig) => void
  disabled?: boolean
}

export default function ShippingSelector({ value, onChange, disabled = false }: Props) {
  const handleCategoryChange = (category: ShippingCategory) => {
    const defaultCarrier: LocalCarrier | InternationalCarrier =
      category === 'local' ? 'nassau_courier' : 'fedex'
    onChange({ category, carrier: defaultCarrier })
  }

  const handleCarrierChange = (carrier: LocalCarrier | InternationalCarrier) => {
    onChange({ ...value, carrier })
  }

  const carriers = value.category === 'local' ? LOCAL_CARRIERS : INTERNATIONAL_CARRIERS

  return (
    <div className="space-y-3">
      {/* Category toggle */}
      <div
        className="flex rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-card-bg)' }}
      >
        {(['local', 'international'] as ShippingCategory[]).map((cat) => {
          const active = value.category === cat
          return (
            <button
              key={cat}
              type="button"
              disabled={disabled}
              onClick={() => handleCategoryChange(cat)}
              className="flex-1 py-3 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: active ? 'var(--color-royal-purple)' : 'transparent',
                color: active ? '#fff' : 'var(--color-subtext)',
                opacity: disabled ? 0.6 : 1,
              }}
            >
              {cat === 'local' ? '🇧🇸 Local' : '🌐 International'}
            </button>
          )
        })}
      </div>

      {/* Carrier list */}
      <div className="space-y-2">
        {carriers.map((c) => {
          const selected = value.carrier === c.key
          return (
            <button
              key={c.key}
              type="button"
              disabled={disabled}
              onClick={() => handleCarrierChange(c.key)}
              className="w-full rounded-xl p-3 text-left flex items-center justify-between transition-colors"
              style={{
                backgroundColor: selected ? 'rgba(75,0,130,0.1)' : 'var(--color-card-bg)',
                border: `1px solid ${selected ? 'var(--color-royal-purple)' : 'rgba(136,136,136,0.2)'}`,
                opacity: disabled ? 0.6 : 1,
              }}
            >
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                {c.label}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-subtext)' }}>
                {c.description}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
