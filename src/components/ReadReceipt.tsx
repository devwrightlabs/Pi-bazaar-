'use client'

interface Props {
  isRead: boolean
}

export default function ReadReceipt({ isRead }: Props) {
  return (
    <span
      className="text-[10px] ml-1"
      style={{ color: isRead ? 'var(--color-success)' : 'var(--color-subtext)' }}
      aria-label={isRead ? 'Read' : 'Sent'}
    >
      {isRead ? '✓✓' : '✓'}
    </span>
  )
}
