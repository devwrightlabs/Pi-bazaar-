import type { HTMLAttributes } from 'react'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'error'
  count?: number
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-gold text-black',
  error: 'bg-error text-white',
}

export function Badge({
  variant = 'default',
  count,
  className = '',
  children,
  ...props
}: BadgeProps) {
  const label = count !== undefined ? (count > 99 ? '99+' : String(count)) : children

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full leading-none ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {label}
    </span>
  )
}
