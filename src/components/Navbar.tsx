'use client'

import { useStore } from '@/store/useStore'
import { useUIStore } from '@/store/useUIStore'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { authenticateWithPi } from '@/lib/pi-sdk'
import { useState } from 'react'
import NotificationBell from '@/components/NotificationBell'

export default function Navbar() {
  const { currentUser, isAuthenticated, setCurrentUser } = useStore()
  const jurisdictionMode = useUIStore((s) => s.jurisdictionMode)
  const setJurisdictionMode = useUIStore((s) => s.setJurisdictionMode)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  const handleConnect = async () => {
    setConnecting(true)
    setConnectError(null)
    try {
      const piAuth = await authenticateWithPi()
      if (!piAuth) {
        setConnectError('Pi Browser is required to connect.')
        setConnecting(false)
        return
      }

      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: piAuth.accessToken }),
      })

      if (!res.ok) {
        setConnectError('Verification failed. Please try again.')
        setConnecting(false)
        return
      }

      const data = (await res.json()) as {
        token: string
        user: { pi_uid: string; username: string | null; avatar_url: string | null }
      }

      setCurrentUser({
        id: data.user.pi_uid,
        pi_uid: data.user.pi_uid,
        username: data.user.username ?? 'Pioneer',
        avatar_url: data.user.avatar_url ?? null,
        bio: null,
        created_at: new Date().toISOString(),
      })

      if (typeof window !== 'undefined') {
        localStorage.setItem('pibazaar-token', data.token)
      }
      setConnecting(false)
    } catch (err) {
      console.error('Wallet connection failed:', err)
      setConnectError('Connection failed. Please try again.')
      setConnecting(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-secondary-bg/60 backdrop-blur-lg">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo placeholder */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center">
            <span className="font-bold text-black text-sm">π</span>
          </div>
          <span className="text-lg font-bold font-heading text-text-primary">
            Pi Bazaar
          </span>
        </div>

        {/* Jurisdiction toggle */}
        <div className="flex items-center">
          <button
            onClick={() => setJurisdictionMode(jurisdictionMode === 'local' ? 'global' : 'local')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
            style={{
              backgroundColor: jurisdictionMode === 'local'
                ? 'rgba(139, 92, 246, 0.15)'
                : 'rgba(240, 192, 64, 0.12)',
              color: jurisdictionMode === 'local' ? '#8B5CF6' : 'var(--color-gold)',
              border: `1px solid ${jurisdictionMode === 'local' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(240, 192, 64, 0.25)'}`,
            }}
            aria-label={`Switch to ${jurisdictionMode === 'local' ? 'global' : 'local'} marketplace`}
          >
            <span>{jurisdictionMode === 'local' ? '🇧🇸' : '🌐'}</span>
            <span>{jurisdictionMode === 'local' ? 'Local' : 'Global'}</span>
          </button>
        </div>

        {/* Auth area */}
        <div className="flex items-center gap-3">
          <NotificationBell />
          {connecting ? (
            <Skeleton shape="line" className="h-9 w-28 rounded-xl" />
          ) : isAuthenticated && currentUser ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center">
                <span className="font-bold text-black text-xs">
                  {(currentUser.username ?? 'P').charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-text-primary hidden sm:inline">
                {currentUser.username}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <Button
                size="sm"
                onClick={handleConnect}
                aria-label="Connect wallet"
              >
                Connect Wallet
              </Button>
              {connectError && (
                <span className="text-[10px] text-error">{connectError}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
