interface VerifiedBadgeProps {
  size?: 'sm' | 'md'
}

export default function VerifiedBadge({ size = 'sm' }: VerifiedBadgeProps) {
  const isMd = size === 'md'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${isMd ? 'text-xs' : 'text-[10px]'}`}
      style={{
        backgroundColor: 'rgba(240, 192, 64, 0.1)',
        color: 'var(--color-gold)',
      }}
    >
      <svg
        width={isMd ? 12 : 10}
        height={isMd ? 12 : 10}
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6 1L7.5 4.2L11 4.7L8.5 7.1L9.1 10.6L6 9L2.9 10.6L3.5 7.1L1 4.7L4.5 4.2L6 1Z"
          fill="var(--color-gold)"
        />
        <path
          d="M4 6L5.5 7.5L8 5"
          stroke="#000"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Pi Verified
    </span>
  )
}
