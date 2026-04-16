'use client'

export type BuyerProtectionTier = 'standard' | 'enhanced' | 'premium'

interface BuyerProtectionBadgeProps {
  tier?: BuyerProtectionTier
  className?: string
}

const TIER_CONFIG: Record<BuyerProtectionTier, { label: string; color: string; bg: string }> = {
  standard: {
    label: 'Buyer Protected',
    color: 'var(--color-success)',
    bg: 'rgba(34, 197, 94, 0.1)',
  },
  enhanced: {
    label: 'Enhanced Protection',
    color: 'var(--color-gold)',
    bg: 'rgba(240, 192, 64, 0.1)',
  },
  premium: {
    label: 'Premium Protection',
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.1)',
  },
}

/**
 * BuyerProtectionBadge — Visual badge indicating buyer protection level.
 *
 * Displayed on listings and checkout screens to communicate escrow safety.
 */
export default function BuyerProtectionBadge({
  tier = 'standard',
  className = '',
}: BuyerProtectionBadgeProps) {
  const cfg = TIER_CONFIG[tier]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
      aria-label={cfg.label}
    >
      {/* Shield icon */}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
      {cfg.label}
    </span>
  )
}
