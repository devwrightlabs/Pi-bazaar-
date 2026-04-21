'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authenticateWithPi, initPiSdk } from '@/lib/pi-sdk'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSandbox = process.env.NEXT_PUBLIC_PI_ENV !== 'production'

  const handleLoginWithPi = async () => {
    setLoading(true)
    setError(null)

    try {
      // Initialize Pi SDK
      initPiSdk({ sandbox: isSandbox })

      // Authenticate with Pi
      const auth = await authenticateWithPi()

      if (!auth || !auth.accessToken) {
        console.warn('Authentication returned null. Handshake failed.')
        setError('Pi authentication failed. Please try again.')
        return
      }

      // Send to backend for verification
      const response = await fetch('/api/auth/pi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: auth.accessToken }),
      })

      if (!response.ok) {
        setError('Authentication failed. Please try again.')
        return
      }

      const data = await response.json()

      // Store session and force a full app reload so authenticated UI state
      // can be re-hydrated from persisted auth data instead of preserving
      // stale in-memory client state across a SPA navigation.
      if (typeof window !== 'undefined' && data.token) {
        localStorage.setItem('pibazaar-token', data.token)
        window.location.assign('/')
        return
      }

      // Fallback redirect
      router.push('/')
    } catch (err) {
      console.error('Login error:', err)
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-text)', fontFamily: 'Sora, sans-serif' }}>
            Welcome to <span style={{ color: 'var(--color-gold)' }}>Pi Bazaar</span>
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
            The decentralized marketplace for the Pi Network
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => void handleLoginWithPi()}
            disabled={loading}
            className="w-full py-4 px-6 rounded-xl font-semibold text-base transition-opacity"
            style={{
              backgroundColor: 'var(--color-gold)',
              color: '#000',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Connecting...' : 'Login with Pi Wallet'}
          </button>

          {error && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444' }}>
              <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>
            </div>
          )}
        </div>

        <p className="text-xs" style={{ color: 'var(--color-subtext)' }}>
          By logging in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </main>
  )
}
