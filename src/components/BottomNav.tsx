'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'HOME' },
  { href: '/browse', label: 'BROWSE' },
  { href: '/map', label: 'MAP' },
  { href: '/orders', label: 'ORDERS' },
  { href: '/chat', label: 'CHAT' },
  { href: '/profile', label: 'PROFILE' },
]

export default function BottomNav() {
  const pathname = usePathname()

  // Split navItems into two halves with the Sell button in the center
  const leftItems = navItems.slice(0, 2)
  const rightItems = navItems.slice(2)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-3 border-t"
      style={{
        backgroundColor: 'var(--color-secondary-bg)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      {leftItems.map((item) => {
        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 min-w-[56px] py-1"
          >
            <span
              className="text-[10px] font-semibold tracking-wider"
              style={{ color: isActive ? 'var(--color-gold)' : 'var(--color-subtext)' }}
            >
              {item.label}
            </span>
          </Link>
        )
      })}

      {/* Center Sell button */}
      <Link href="/create" className="flex flex-col items-center gap-1 -mt-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg border-4"
          style={{
            backgroundColor: 'var(--color-gold)',
            borderColor: 'var(--color-secondary-bg)',
          }}
        >
          <span style={{ color: '#0A0A0F', fontWeight: 900, fontSize: '28px', lineHeight: 1 }}>+</span>
        </div>
        <span
          className="text-[10px] font-bold tracking-wider"
          style={{ color: pathname.startsWith('/create') ? 'var(--color-gold)' : 'var(--color-subtext)' }}
        >
          SELL
        </span>
      </Link>

      {rightItems.map((item) => {
        const isActive = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 min-w-[56px] py-1"
          >
            <span
              className="text-[10px] font-semibold tracking-wider"
              style={{ color: isActive ? 'var(--color-gold)' : 'var(--color-subtext)' }}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
