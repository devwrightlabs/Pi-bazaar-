'use client'

const CATEGORIES = [
  'Electronics',
  'Clothing',
  'Home & Garden',
  'Sports',
  'Toys',
  'Books',
  'Automotive',
  'Art',
  'Collectibles',
  'Music',
  'Jewelry',
  'Health & Beauty',
  'Food & Drink',
  'Services',
  'Other',
]

interface Props {
  value: string
  onChange: (value: string) => void
}

export default function CategoryDropdown({ value, onChange }: Props) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none cursor-pointer"
        style={{
          backgroundColor: 'var(--color-background)',
          color: value ? 'var(--color-text)' : 'var(--color-subtext)',
          border: '1px solid rgba(136,136,136,0.3)',
        }}
      >
        <option value="" disabled style={{ color: 'var(--color-subtext)' }}>
          Select a category...
        </option>
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat} style={{ backgroundColor: 'var(--color-background)', color: '#fff' }}>
            {cat}
          </option>
        ))}
      </select>
      <div
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs"
        style={{ color: 'var(--color-subtext)' }}
      >
        ▼
      </div>
    </div>
  )
}
