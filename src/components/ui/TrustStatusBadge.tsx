'use client'

export type TrustStatus = 'kyc_verified' | 'trusted' | 'new_user'

interface TrustStatusBadgeProps {
  status: TrustStatus
  className?: string
}

const STATUS_CONFIG: Record<TrustStatus, { label: string; color: string; bg: string; icon: 'shield' | 'check' | 'user' }> = {
  kyc_verified: {
    label: 'KYC Verified',
    color: 'var(--color-success)',
    bg: 'rgba(34, 197, 94, 0.12)',
    icon: 'shield',
  },
  trusted: {
    label: 'Trusted',
    color: 'var(--color-gold)',
    bg: 'rgba(240, 192, 64, 0.12)',
    icon: 'check',
  },
  new_user: {
    label: 'New User',
    color: 'var(--color-subtext)',
    bg: 'var(--color-control-bg)',
    icon: 'user',
  },
}

/**
 * TrustStatusBadge — Displays user verification status.
 *
 * Shows "KYC Verified", "Trusted", or "New User" based on the user's
 * trust score and KYC status.
 */
export default function TrustStatusBadge({
  status,
  className = '',
}: TrustStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
      aria-label={cfg.label}
    >
      {cfg.icon === 'shield' && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      )}
      {cfg.icon === 'check' && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="M22 4L12 14.01l-3-3" />
        </svg>
      )}
      {cfg.icon === 'user' && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )}
      {cfg.label}
    </span>
  )
}
