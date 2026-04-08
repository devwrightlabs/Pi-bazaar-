'use client'

export type TrustBadgeSize = 'sm' | 'md' | 'lg'

export interface TrustBadgeProps {
  /** Controls badge text & icon dimensions */
  size?: TrustBadgeSize
  /** Optional override label — defaults to "Verified Pro" */
  label?: string
  /** Additional CSS classes */
  className?: string
}

const sizeConfig: Record<TrustBadgeSize, { icon: number; text: string; px: string; py: string }> = {
  sm: { icon: 10, text: 'text-[10px]', px: 'px-2', py: 'py-0.5' },
  md: { icon: 12, text: 'text-xs', px: 'px-2.5', py: 'py-1' },
  lg: { icon: 14, text: 'text-sm', px: 'px-3', py: 'py-1' },
}

/**
 * TrustBadge — Reusable "Verified Pro" seller badge.
 *
 * Renders when `is_pro_seller` is true on product cards, checkout screens,
 * and user profiles. Uses the `--color-gold` brand token for themed gold
 * styling, with a subtle drop shadow and verified checkmark icon.
 */
export default function TrustBadge({
  size = 'sm',
  label = 'Verified Pro',
  className = '',
}: TrustBadgeProps) {
  const cfg = sizeConfig[size]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${cfg.text} ${cfg.px} ${cfg.py} ${className}`}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-gold) 15%, transparent)',
        color: 'var(--color-gold)',
        boxShadow: '0 1px 4px color-mix(in srgb, var(--color-gold) 25%, transparent)',
      }}
      aria-label={label}
    >
      <svg
        width={cfg.icon}
        height={cfg.icon}
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        {/* Star / shield shape */}
        <path
          d="M6 1L7.5 4.2L11 4.7L8.5 7.1L9.1 10.6L6 9L2.9 10.6L3.5 7.1L1 4.7L4.5 4.2L6 1Z"
          fill="currentColor"
        />
        {/* Checkmark */}
        <path
          d="M4 6L5.5 7.5L8 5"
          stroke="var(--color-card-bg)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </span>
  )
}
