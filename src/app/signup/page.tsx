'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match')
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long')
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      })

      if (signUpError) {
        throw signUpError
      }

      if (data.user) {
        setSuccess(true)
      }
    } catch (err) {
      console.error('Signup error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div className="w-full max-w-md space-y-6 text-center">
          <div
            className="rounded-2xl p-8 space-y-4"
            style={{ backgroundColor: 'var(--color-card-bg)' }}
          >
            <div
              className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#22C55E' }}
            >
              ✓
            </div>
            <h2
              className="text-2xl font-bold"
              style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
            >
              Check Your Email
            </h2>
            <p style={{ color: 'var(--color-subtext)' }}>
              We&apos;ve sent a confirmation link to <strong>{email}</strong>.
              Click the link to verify your account and complete registration.
            </p>
            <Link href="/login">
              <button
                className="w-full mt-4 py-3 rounded-xl font-semibold"
                style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
              >
                Go to Login
              </button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
          >
            Create Account
          </h1>
          <p style={{ color: 'var(--color-subtext)' }}>
            Join Pi Bazaar and start trading
          </p>
        </div>

        <div
          className="rounded-2xl p-6 space-y-5"
          style={{ backgroundColor: 'var(--color-card-bg)' }}
        >
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text)' }}
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--color-secondary-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                placeholder="Choose a username"
              />
            </div>

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
                minLength={8}
                className="w-full px-4 py-3 rounded-xl text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--color-secondary-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text)' }}
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
                className="w-full px-4 py-3 rounded-xl text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--color-secondary-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                placeholder="Re-enter your password"
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
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="text-center text-sm" style={{ color: 'var(--color-subtext)' }}>
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold"
              style={{ color: 'var(--color-gold)' }}
            >
              Sign In
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
