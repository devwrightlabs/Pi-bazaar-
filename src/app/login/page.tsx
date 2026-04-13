'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw signInError
      }

      if (data.user) {
        router.push('/marketplace')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
          >
            Welcome Back
          </h1>
          <p style={{ color: 'var(--color-subtext)' }}>
            Sign in to your Pi Bazaar account
          </p>
        </div>

        <div
          className="rounded-2xl p-6 space-y-5"
          style={{ backgroundColor: 'var(--color-card-bg)' }}
        >
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text)' }}
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--color-secondary-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text)' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--color-secondary-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div
                className="rounded-xl p-3 text-sm"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#EF4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-lg transition-opacity"
              style={{
                backgroundColor: '#F0C040',
                color: '#000',
                fontFamily: 'Sora, sans-serif',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="text-center text-sm" style={{ color: 'var(--color-subtext)' }}>
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="font-semibold"
              style={{ color: 'var(--color-gold)' }}
            >
              Sign Up
            </Link>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="text-sm"
            style={{ color: 'var(--color-subtext)' }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
}
