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
    if (typeof window !== 'undefined') {
      initPiSdk({ sandbox: true })
    }
  }, [])

  const handleLogin = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Authenticate with the Pi SDK with a 10-second timeout.
      // This prevents infinite loading if the Pi SDK hangs or fails silently.
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Authentication timed out after 10 seconds')), 10000)
      })

      const piAuth = await Promise.race([
        authenticateWithPi(),
        timeoutPromise,
      ])

      if (!piAuth) {
        setError('Pi Browser is required to log in.')
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
    } catch (err) {
      console.error('[PiAuthProvider] Login failed:', err)
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      // CRITICAL: Always reset loading state, even if the SDK hangs or times out.
      setLoading(false)
    }
  }, [setCurrentUser])

  return (
    <PiAuthContext.Provider value={{ handleLogin, loading, error }}>
      {children}
    </PiAuthContext.Provider>
  )
}
