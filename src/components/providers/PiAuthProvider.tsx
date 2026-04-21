'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { authenticateWithPi, initPiSdk } from '@/lib/pi-sdk'
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
  const [isPiSdkReady, setIsPiSdkReady] = useState(false)
  const isSandbox = process.env.NEXT_PUBLIC_PI_ENV !== 'production'

  // Initialise the Pi SDK once on mount (sandbox mode for testnet).
  useEffect(() => {
    const initialisePiSdk = () => {
      if (!(typeof window !== 'undefined' && window.Pi)) {
        setIsPiSdkReady(false)
        console.error('[PiAuthProvider] Pi SDK not found on window')
        setError('Pi SDK failed to initialize. Please refresh and try again.')
        return
      }

      try {
        const initialised = initPiSdk({ sandbox: isSandbox })
        setIsPiSdkReady(initialised)
        if (!initialised) {
          setError('Pi SDK failed to initialize. Please refresh and try again.')
        }
      } catch (err) {
        console.error('[PiAuthProvider] Pi SDK init failed', err)
        setIsPiSdkReady(false)
        setError('Pi SDK failed to initialize. Please refresh and try again.')
      }
    }

    initialisePiSdk()
  }, [isSandbox])

  const handleLogin = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (!(typeof window !== 'undefined' && window.Pi)) {
        setError('Pi Browser is required to log in.')
        return
      }

      if (!isPiSdkReady) {
        setError('Pi SDK failed to initialize. Please refresh and try again.')
        return
      }

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
        console.warn('Authentication returned null. Handshake failed.')
        setError('Pi authentication failed. Please try again.')
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
        const data = await res.json().catch(() => ({})) as { error?: string }
        const errorMessage = data.error ?? 'Verification failed. Please try again.'
        setError(errorMessage)

        // Log internal server errors during verification for debugging
        if (res.status === 500) {
          console.error('[PiAuthProvider] Server error during verification:', errorMessage)
        }
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
  }, [isPiSdkReady, setCurrentUser])

  return (
    <PiAuthContext.Provider value={{ handleLogin, loading, error }}>
      {children}
    </PiAuthContext.Provider>
  )
}
