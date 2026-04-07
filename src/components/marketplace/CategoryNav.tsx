'use client'

interface CategoryNavProps {
  activeCategory: string
  onSelect: (category: string) => void
}

const CATEGORIES = [
  'All',
  'Physical Goods',
  'Digital Assets',
  'Professional Services',
  'Electronics',
  'Fashion',
  'Home',
  'Vehicles',
  'Sports',
  'Books',
  'Other',
]

export default function CategoryNav({ activeCategory, onSelect }: CategoryNavProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 pb-1" style={{ minWidth: 'max-content' }}>
        {CATEGORIES.map((category) => {
          const isActive = category === activeCategory
          return (
            <button
              key={category}
              onClick={() => onSelect(category)}
              className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--color-gold)' : 'var(--color-card-bg)',
                color: isActive ? '#000' : 'var(--color-text)',
                border: isActive ? 'none' : '1px solid var(--color-secondary-bg)',
              }}
            >
              {category}
            </button>
          )
        })}
      </div>
    </div>
  )
}
