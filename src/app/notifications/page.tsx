'use client'

import { useCallback, useEffect, useState } from 'react'

interface Notification {
  id: string
  user_pi_uid: string
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
  metadata?: Record<string, unknown> | null
}

interface NotificationsResponse {
  notifications: Notification[]
  unread_count: number
}

const TYPE_ICONS: Record<string, string> = {
  message: '💬',
  payment: '💰',
  shipping: '📦',
}

function getTypeIcon(type: string): string {
  return TYPE_ICONS[type] ?? '🔔'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('pibazaar-token')
}

const PAGE_LIMIT = 20

export default function NotificationsPage() {
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  const fetchPage = useCallback(
    async (pageNum: number, currentTab: 'all' | 'unread') => {
      const token = getToken()
      if (!token) return

      setLoading(true)
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_LIMIT),
          ...(currentTab === 'unread' ? { unread: 'true' } : {}),
        })
        const res = await fetch(`/api/notifications?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = (await res.json()) as NotificationsResponse

        const fetched = data.notifications ?? []

        if (pageNum === 1) {
          setNotifications(fetched)
        } else {
          setNotifications((prev) => [...prev, ...fetched])
        }

        setUnreadCount(data.unread_count ?? 0)
        setHasMore(fetched.length === PAGE_LIMIT)
      } catch {
        // Silently ignore
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Reload when tab changes
  useEffect(() => {
    setPage(1)
    fetchPage(1, tab)
  }, [tab, fetchPage])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchPage(nextPage, tab)
  }

  const markAsRead = async (notif: Notification) => {
    if (notif.read) return
    const token = getToken()
    if (!token) return

    try {
      await fetch(`/api/notifications/${notif.id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      // Non-fatal
    }
  }

  const markAllRead = async () => {
    const token = getToken()
    if (!token) return
    setMarkingAll(true)
    try {
      const unread = notifications.filter((n) => !n.read)
      await Promise.all(
        unread.map((n) =>
          fetch(`/api/notifications/${n.id}/read`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      )
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {
      // Non-fatal
    } finally {
      setMarkingAll(false)
    }
  }

  const visibleNotifications =
    tab === 'unread' ? notifications.filter((n) => !n.read) : notifications

  return (
    <main
      className="min-h-screen px-4 py-6 mx-auto max-w-2xl"
      style={{ color: 'var(--color-text-primary, #fff)' }}
    >
      {/* Page title */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-heading, Sora, sans-serif)' }}
        >
          Notifications
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="text-sm font-medium px-4 py-1.5 rounded-full transition-opacity hover:opacity-80"
            style={{
              background: 'rgba(240, 192, 64, 0.12)',
              color: 'var(--color-gold, #F0C040)',
              border: '1px solid rgba(240, 192, 64, 0.25)',
            }}
          >
            {markingAll ? 'Marking...' : 'Mark all as read'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-6 p-1 rounded-xl"
        style={{ background: 'var(--color-secondary-bg, #1A1A2E)' }}
      >
        {(['all', 'unread'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
            style={
              tab === t
                ? {
                    background: 'var(--color-card-bg, #16213E)',
                    color: 'var(--color-gold, #F0C040)',
                  }
                : {
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.5)',
                  }
            }
          >
            {t === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {loading && notifications.length === 0 ? (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl h-20 animate-pulse"
              style={{ background: 'var(--color-card-bg, #16213E)' }}
            />
          ))}
        </div>
      ) : visibleNotifications.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 text-center gap-3"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          <span className="text-5xl">🎉</span>
          <p className="text-lg font-medium">You&apos;re all caught up!</p>
          <p className="text-sm">No {tab === 'unread' ? 'unread ' : ''}notifications yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibleNotifications.map((notif) => (
            <li key={notif.id}>
              <button
                onClick={() => markAsRead(notif)}
                className="w-full text-left rounded-2xl px-4 py-4 flex items-start gap-4 transition-all hover:opacity-90"
                style={{
                  background: notif.read
                    ? 'var(--color-card-bg, #16213E)'
                    : 'rgba(240, 192, 64, 0.07)',
                  border: notif.read
                    ? '1px solid rgba(255,255,255,0.05)'
                    : '1px solid rgba(240, 192, 64, 0.2)',
                }}
              >
                {/* Type icon */}
                <span
                  className="text-2xl leading-none mt-0.5 shrink-0"
                  aria-label={notif.type}
                >
                  {getTypeIcon(notif.type)}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="text-sm font-semibold leading-snug"
                      style={{
                        fontFamily: 'var(--font-heading, Sora, sans-serif)',
                        color: notif.read
                          ? 'var(--color-text-primary, #fff)'
                          : 'var(--color-gold, #F0C040)',
                      }}
                    >
                      {notif.title}
                    </span>
                    <span
                      className="text-[10px] shrink-0"
                      style={{ color: 'rgba(255,255,255,0.35)' }}
                    >
                      {formatDate(notif.created_at)}
                    </span>
                  </div>
                  <p
                    className="text-xs mt-1 leading-relaxed"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                  >
                    {notif.body}
                  </p>
                </div>

                {/* Unread dot */}
                {!notif.read && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                    style={{ background: 'var(--color-gold, #F0C040)' }}
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div className="flex justify-center mt-6">
          <button
            onClick={loadMore}
            className="px-6 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-80"
            style={{
              background: 'rgba(240, 192, 64, 0.12)',
              color: 'var(--color-gold, #F0C040)',
              border: '1px solid rgba(240, 192, 64, 0.25)',
            }}
          >
            Load more
          </button>
        </div>
      )}

      {loading && notifications.length > 0 && (
        <div
          className="text-center text-sm mt-6"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          Loading...
        </div>
      )}
    </main>
  )
}
