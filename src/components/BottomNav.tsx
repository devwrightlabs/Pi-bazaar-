'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

/* ─── SVG icon helpers ────────────────────────────────────────────────── */

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-gold)' : 'var(--color-subtext)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-gold)' : 'var(--color-subtext)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function OrdersIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-gold)' : 'var(--color-subtext)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <path d="M8 7h8M8 12h6M8 17h4" />
    </svg>
  )
}

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-gold)' : 'var(--color-subtext)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="4" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="11" width="7" height="10" rx="1" />
    </svg>
  )
}

/* ─── Nav definition ──────────────────────────────────────────────────── */

interface NavItem {
  href: string
  label: string
  Icon: (props: { active: boolean }) => React.JSX.Element
  badgeCount?: number
}

const LEFT_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', Icon: HomeIcon },
  { href: '/browse', label: 'Search', Icon: SearchIcon },
]

const RIGHT_ITEMS: NavItem[] = [
  { href: '/orders', label: 'My Orders', Icon: OrdersIcon, badgeCount: 0 },
  { href: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
]

/* ─── Component ───────────────────────────────────────────────────────── */

export default function BottomNav() {
  const pathname = usePathname()

  const renderItem = (item: NavItem) => {
    const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        className="flex flex-col items-center gap-1 min-w-[56px] min-h-[44px] py-1 transition-colors active:scale-95"
      >
        <div className="relative">
          <item.Icon active={isActive} />
          {item.badgeCount !== undefined && item.badgeCount > 0 && (
            <Badge
              variant="error"
              count={item.badgeCount}
              className="absolute -top-1.5 -right-2.5"
            />
          )}
        </div>
        <span
          className="text-[11px] font-semibold tracking-wider"
          style={{ color: isActive ? 'var(--color-gold)' : 'var(--color-subtext)' }}
        >
          {item.label}
        </span>
      </Link>
    )
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-3 border-t"
      style={{
        backgroundColor: 'var(--color-secondary-bg)',
        borderColor: 'var(--color-border)',
        minWidth: '320px',
      }}
    >
      {LEFT_ITEMS.map(renderItem)}

      {/* Center Sell button */}
      <Link href="/create" className="flex flex-col items-center gap-0.5 -mt-4 min-h-[44px]">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg border-4 transition-transform active:scale-90"
          style={{
            backgroundColor: 'var(--color-gold)',
            borderColor: 'var(--color-secondary-bg)',
          }}
        >
          <span style={{ color: '#0A0A0F', fontWeight: 900, fontSize: '28px', lineHeight: 1 }}>+</span>
        </div>
        <span
          className="text-[11px] font-bold tracking-wider"
          style={{ color: pathname.startsWith('/create') ? 'var(--color-gold)' : 'var(--color-subtext)' }}
        >
          Sell
        </span>
      </Link>

      {RIGHT_ITEMS.map(renderItem)}
    </nav>
  )
}
