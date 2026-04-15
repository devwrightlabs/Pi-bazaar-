'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { initPiSdk, authenticateWithPi } from '@/lib/pi-sdk'
import { useStore } from '@/store/useStore'

// ─── Context ──────────────────────────────────────────────────────────────────

interface PiAuthContextValue {
  handleLogin: () => Promise<void>
  loading: boolean
  error: string | null
}

const PiAuthContext = createContext<PiAuthContextValue>({
  handleLogin: async () => {},
  loading: false,
  error: null,
})

export function usePiAuth() {
  return useContext(PiAuthContext)
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export default function PiAuthProvider({ children }: { children: React.ReactNode }) {
  const { setCurrentUser } = useStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialise the Pi SDK once on mount (sandbox mode for testnet).
  useEffect(() => {
    initPiSdk({ sandbox: true })
  }, [])

  const handleLogin = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Authenticate with the Pi SDK.
      const piAuth = await authenticateWithPi()
      if (!piAuth) {
        setError('Pi Browser is required to log in.')
        setLoading(false)
        return
      }

      // 2. POST the accessToken (and user object) to the backend for
      //    server-side verification and JWT minting.
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: piAuth.accessToken,
          user: piAuth.user,
        }),
      })

      if (!res.ok) {
        setError('Verification failed. Please try again.')
        setLoading(false)
        return
      }

      const data = (await res.json()) as {
        token: string
        user: {
          pi_uid: string
          username: string | null
          avatar_url: string | null
        }
      }

      // 3. Save the JWT to localStorage.
      if (typeof window !== 'undefined') {
        localStorage.setItem('pibazaar-token', data.token)
      }

      // 4. Update the Zustand store.
      setCurrentUser({
        id: data.user.pi_uid,
        pi_uid: data.user.pi_uid,
        username: data.user.username ?? 'Pioneer',
        avatar_url: data.user.avatar_url ?? null,
        bio: null,
        created_at: new Date().toISOString(),
      })

      setLoading(false)
    } catch (err) {
      console.error('[PiAuthProvider] Login failed:', err)
      setError('Login failed. Please try again.')
      setLoading(false)
    }
  }, [setCurrentUser])

  return (
    <PiAuthContext.Provider value={{ handleLogin, loading, error }}>
      {children}
    </PiAuthContext.Provider>
  )
}
