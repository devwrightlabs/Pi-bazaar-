'use client'

import { useState, useCallback } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'
import LoadingSkeleton from './LoadingSkeleton'

interface Props {
  onSelectUser: (user: UserProfile) => void
  excludeUserId?: string
}

export default function UserSearch({ onSelectUser, excludeUserId }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const searchUsers = useDebouncedCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .ilike('username', `%${q}%`)
        .limit(10)
      if (error) throw error
      const filtered = ((data as UserProfile[]) ?? []).filter(
        (u) => u.id !== excludeUserId
      )
      setResults(filtered)
    } catch (err) {
      console.error('User search failed:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, 300)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      setQuery(val)
      void searchUsers(val)
    },
    [searchUsers]
  )

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Search by username..."
        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
        style={{
          backgroundColor: 'var(--color-card-bg)',
          color: 'var(--color-text)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      />
      {loading && <LoadingSkeleton rows={2} />}
      {!loading && searched && results.length === 0 && (
        <p className="text-center text-sm py-4" style={{ color: 'var(--color-subtext)' }}>
          No users found
        </p>
      )}
      {!loading && results.length > 0 && (
        <div className="mt-3 space-y-2">
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => onSelectUser(user)}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors"
              style={{ backgroundColor: 'var(--color-card-bg)' }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ backgroundColor: 'var(--color-secondary-bg)' }}
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    {user.username?.charAt(0).toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  @{user.username}
                </p>
                {user.bio && (
                  <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--color-subtext)' }}>
                    {user.bio}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
