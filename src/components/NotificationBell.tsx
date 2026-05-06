'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('pibazaar-token')
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    const token = getToken()
    if (!token) return

    try {
      const res = await fetch('/api/notifications?unread=true&limit=5', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = (await res.json()) as NotificationsResponse
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unread_count ?? 0)
    } catch {
      // Silently ignore — bell should not break the UI
    }
  }, [])

  // On mount and every 60 seconds
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  const markAllRead = async () => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    try {
      // Mark each unread notification individually via the /read endpoint
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
      setLoading(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors"
        style={{
          background: open
            ? 'rgba(240, 192, 64, 0.12)'
            : 'transparent',
          color: 'var(--color-text-primary, #fff)',
        }}
      >
        <span className="text-xl leading-none select-none">🔔</span>
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1"
            style={{
              background: '#e53e3e',
              color: '#fff',
              fontFamily: 'var(--font-body, DM Sans, sans-serif)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-2 z-50 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: '320px',
            background: 'var(--color-card-bg, #16213E)',
            border: '1px solid rgba(240, 192, 64, 0.18)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(240, 192, 64, 0.12)' }}
          >
            <span
              className="font-semibold text-sm"
              style={{
                fontFamily: 'var(--font-heading, Sora, sans-serif)',
                color: 'var(--color-gold, #F0C040)',
              }}
            >
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                className="text-xs transition-opacity hover:opacity-80"
                style={{ color: 'var(--color-gold, #F0C040)' }}
              >
                {loading ? 'Marking...' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Notification list */}
          <ul className="max-h-72 overflow-y-auto divide-y"
            style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {notifications.length === 0 ? (
              <li
                className="px-4 py-6 text-center text-sm"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                You&apos;re all caught up! 🎉
              </li>
            ) : (
              notifications.map((notif) => (
                <li
                  key={notif.id}
                  className="px-4 py-3 flex flex-col gap-0.5"
                  style={{
                    background: notif.read
                      ? 'transparent'
                      : 'rgba(240, 192, 64, 0.05)',
                  }}
                >
                  <span
                    className="text-sm font-semibold leading-snug"
                    style={{
                      color: 'var(--color-text-primary, #fff)',
                      fontFamily: 'var(--font-heading, Sora, sans-serif)',
                    }}
                  >
                    {notif.title}
                  </span>
                  <span
                    className="text-xs leading-relaxed"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                  >
                    {notif.body}
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    {timeAgo(notif.created_at)}
                  </span>
                </li>
              ))
            )}
          </ul>

          {/* Footer */}
          <div
            className="px-4 py-3 flex items-center justify-center"
            style={{ borderTop: '1px solid rgba(240, 192, 64, 0.12)' }}
          >
            <a
              href="/notifications"
              className="text-xs font-medium transition-opacity hover:opacity-80"
              style={{ color: 'var(--color-gold, #F0C040)' }}
              onClick={() => setOpen(false)}
            >
              View all notifications →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
