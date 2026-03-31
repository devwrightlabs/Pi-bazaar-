'use client'

interface Props {
  value: 'new' | 'like_new' | 'good' | 'fair'
  onChange: (value: 'new' | 'like_new' | 'good' | 'fair') => void
}

const OPTIONS: { value: 'new' | 'like_new' | 'good' | 'fair'; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
]

export default function ConditionSelector({ value, onChange }: Props) {
  return (
    <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(136,136,136,0.3)' }}>
      {OPTIONS.map((opt) => {
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="flex-1 py-3 text-sm font-medium transition-colors"
            style={{
              backgroundColor: isActive ? 'var(--color-gold)' : 'var(--color-background)',
              color: isActive ? '#000' : 'var(--color-subtext)',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
