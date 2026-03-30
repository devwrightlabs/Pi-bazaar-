'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'HOME', icon: '🏠' },
  { href: '/browse', label: 'BROWSE', icon: '🔍' },
  { href: '/map', label: 'MAP', icon: '🗺️' },
  { href: '/profile', label: 'PROFILE', icon: '👤' },
  { href: '/chat', label: 'CHAT', icon: '💬' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-3 border-t"
      style={{
        backgroundColor: 'var(--color-secondary-bg)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      {navItems.map((item) => {
        const isActive =
          item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 min-w-[56px] py-1"
          >
            <span className="text-xl">{item.icon}</span>
            <span
              className="text-[10px] font-semibold tracking-wider"
              style={{
                color: isActive ? 'var(--color-gold)' : 'var(--color-subtext)',
              }}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
