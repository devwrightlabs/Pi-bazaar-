'use client'

import { useState } from 'react'
import { authenticateWithPi } from '@/lib/pi-sdk'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)
    try {
      const auth = await authenticateWithPi()
      if (auth) {
        const { data, error: upsertError } = await supabase
          .from('user_profiles')
          .upsert({
            pi_uid: auth.user.uid,
            username: auth.user.username,
          })
          .select()
          .single()
        if (upsertError) throw upsertError
        if (data) {
          setProfile(data as UserProfile)
        }
      }
    } catch (err) {
      console.error('Connect failed:', err)
      setError('Failed to connect Pi Wallet. Please try again.')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="px-4 pt-6 pb-4">
        <h1
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: 'Sora, sans-serif', color: '#ffffff' }}
        >
          Profile
        </h1>
        <ErrorBoundary>
          {connecting ? (
            <LoadingSkeleton rows={3} />
          ) : profile ? (
            <div
              className="rounded-2xl p-6 text-center"
              style={{ backgroundColor: 'var(--color-card-bg)' }}
            >
              <div
                className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl overflow-hidden"
                style={{ backgroundColor: 'var(--color-secondary-bg)' }}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                  <span>👤</span>
                )}
              </div>
              <h2
                className="text-xl font-bold mb-2"
                style={{ fontFamily: 'Sora, sans-serif', color: '#ffffff' }}
              >
                @{profile.username}
              </h2>
              {profile.bio && (
                <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
                  {profile.bio}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-6">👤</div>
              <h2
                className="text-xl font-bold mb-3"
                style={{ fontFamily: 'Sora, sans-serif', color: '#ffffff' }}
              >
                Connect with Pi Wallet
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-subtext)' }}>
                Sign in with your Pi Wallet to access your profile
              </p>
              <button
                onClick={() => void handleConnect()}
                disabled={connecting}
                className="px-8 py-4 rounded-2xl font-bold text-lg disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
              >
                {connecting ? 'Connecting...' : 'Connect Pi Wallet'}
              </button>
              {error && (
                <p className="mt-3 text-sm" style={{ color: 'var(--color-error)' }}>
                  {error}
                </p>
              )}
            </div>
          )}
        </ErrorBoundary>
      </div>
    </main>
  )
}
