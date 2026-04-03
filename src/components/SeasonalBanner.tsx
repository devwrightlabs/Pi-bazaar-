'use client'

import { useRouter } from 'next/navigation'

function getCurrentSeason(): { name: string; category: string; gradient: string; emoji: string } {
  const month = new Date().getMonth() + 1 // 1-12
  if (month >= 3 && month <= 5) {
    return { name: 'Spring', category: 'garden', gradient: 'linear-gradient(135deg, #22C55E, #86EFAC)', emoji: '🌷' }
  } else if (month >= 6 && month <= 8) {
    return { name: 'Summer', category: 'outdoor', gradient: 'linear-gradient(135deg, #F0C040, #FDE68A)', emoji: '☀️' }
  } else if (month >= 9 && month <= 11) {
    return { name: 'Autumn', category: 'home-decor', gradient: 'linear-gradient(135deg, #EF4444, #FCA5A5)', emoji: '🍂' }
  } else {
    return { name: 'Winter', category: 'electronics', gradient: 'linear-gradient(135deg, #3B82F6, #93C5FD)', emoji: '❄️' }
  }
}

export default function SeasonalBanner() {
  const router = useRouter()
  const season = getCurrentSeason()

  const handleClick = () => {
    router.push(`/browse?category=${season.category}&season=${season.name.toLowerCase()}`)
  }

  return (
    <button
      onClick={handleClick}
      className="w-full rounded-2xl p-5 text-left transition-transform active:scale-[0.98] cursor-pointer"
      style={{ background: season.gradient }}
      aria-label={`Browse ${season.name} deals`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-black/60 mb-1">SEASONAL DEALS</p>
          <h2
            className="text-2xl font-bold text-black"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            {season.name} Sale
          </h2>
          <p className="text-sm text-black/70 mt-1">Tap to browse {season.name.toLowerCase()} listings</p>
        </div>
        <span className="text-4xl text-black" aria-hidden="true">{season.emoji}</span>
      </div>
    </button>
  )
}
