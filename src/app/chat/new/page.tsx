'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'
import UserSearch from '@/components/UserSearch'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useStore } from '@/store/useStore'

export default function NewMessagePage() {
  const router = useRouter()
  const { currentUser } = useStore()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectUser = async (selectedUser: UserProfile) => {
    if (!currentUser) {
      setError('Please connect your Pi Wallet first')
      return
    }
    if (selectedUser.id === currentUser.id) {
      setError('You cannot message yourself')
      return
    }

    setCreating(true)
    setError(null)
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant_1.eq.${currentUser.id},participant_2.eq.${selectedUser.id}),and(participant_1.eq.${selectedUser.id},participant_2.eq.${currentUser.id})`
        )
        .single()

      if (existing) {
        router.push(`/chat/${(existing as { id: string }).id}`)
        return
      }

      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          participant_1: currentUser.id,
          participant_2: selectedUser.id,
          last_message: '',
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (createError) throw createError
      router.push(`/chat/${(newConv as { id: string }).id}`)
    } catch (err) {
      console.error('Failed to create conversation:', err)
      setError('Failed to start conversation. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/chat')}
            className="text-2xl"
            aria-label="Back"
          >
            ←
          </button>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'Sora, sans-serif', color: '#ffffff' }}
          >
            New Message
          </h1>
        </div>

        <ErrorBoundary>
          {!currentUser ? (
            <div className="text-center py-12">
              
              <p style={{ color: 'var(--color-subtext)' }}>Connect your Pi Wallet to send messages</p>
              <button
                onClick={() => router.push('/profile')}
                className="mt-4 px-6 py-3 rounded-xl font-semibold"
                style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
              >
                Go to Profile
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm mb-4" style={{ color: 'var(--color-subtext)' }}>
                Search for a user to start a conversation
              </p>
              {error && (
                <div
                  className="mb-4 p-3 rounded-xl text-sm"
                  style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: 'var(--color-error)' }}
                >
                  {error}
                </div>
              )}
              {creating && (
                <div className="text-center py-4">
                  <p style={{ color: 'var(--color-subtext)' }}>Creating conversation...</p>
                </div>
              )}
              <UserSearch
                onSelectUser={(user) => { void handleSelectUser(user) }}
                excludeUserId={currentUser.id}
              />
            </>
          )}
        </ErrorBoundary>
      </div>
    </main>
  )
}
