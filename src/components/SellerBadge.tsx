'use client'

export type BadgeLevel = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum'
export type BadgeSize = 'sm' | 'md' | 'lg'

interface SellerBadgeProps {
  badge: BadgeLevel
  size?: BadgeSize
}

const BADGE_CONFIG: Record<Exclude<BadgeLevel, 'none'>, {
  emoji: string
  label: string
  style: React.CSSProperties
}> = {
  bronze: {
    emoji: '🥉',
    label: 'Bronze Seller',
    style: { backgroundColor: '#CD7F32', color: '#1a0f00' },
  },
  silver: {
    emoji: '🥈',
    label: 'Silver Seller',
    style: { backgroundColor: '#C0C0C0', color: '#1a1a1a' },
  },
  gold: {
    emoji: '🥇',
    label: 'Gold Seller',
    style: { backgroundColor: 'var(--color-gold)', color: '#000' },
  },
  platinum: {
    emoji: '💎',
    label: 'Platinum Seller',
    style: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#fff',
    },
  },
}

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
}

export default function SellerBadge({ badge, size = 'md' }: SellerBadgeProps) {
  if (badge === 'none') return null

  const config = BADGE_CONFIG[badge]
  const sizeClass = SIZE_CLASSES[size]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap ${sizeClass}`}
      style={config.style}
    >
      <span role="img" aria-hidden="true">{config.emoji}</span>
      {config.label}
    </span>
  )
}
