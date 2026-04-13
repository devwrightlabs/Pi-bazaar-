'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

declare global {
  interface Window {
    Pi?: {
      init: (config: { version: string; sandbox: boolean }) => void
      authenticate: () => Promise<{ accessToken: string; user: { uid: string; username: string } }>
    }
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLoginWithPi = async () => {
    setLoading(true)
    setError(null)

    try {
      // Initialize Pi SDK
      if (!window.Pi) {
        setError('Pi Browser is required to log in.')
        setLoading(false)
        return
      }

      window.Pi.init({ version: "2.0", sandbox: true })

      // Authenticate with Pi
      const auth = await window.Pi.authenticate()

      if (!auth || !auth.accessToken) {
        setError('Pi authentication failed. Please try again.')
        setLoading(false)
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
        setLoading(false)
        return
      }

      const data = await response.json()

      // Store session
      if (typeof window !== 'undefined' && data.token) {
        localStorage.setItem('pibazaar-token', data.token)
      }

      // Redirect to home
      router.push('/')
    } catch (err) {
      console.error('Login error:', err)
      setError('Login failed. Please try again.')
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
