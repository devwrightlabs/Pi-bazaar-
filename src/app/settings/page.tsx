'use client'

import { useEffect, useState, useCallback } from 'react'

// ─── Theme presets ────────────────────────────────────────────────────────────

type ThemeName = 'dark' | 'light' | 'sepia' | 'custom'

interface ThemeValues {
  bg: string
  accent: string
  card: string
  text: string
  subtext: string
}

const THEME_PRESETS: Record<Exclude<ThemeName, 'custom'>, ThemeValues> = {
  dark:  { bg: '#0A0A0F', accent: '#F0C040', card: '#16213E', text: '#FFFFFF', subtext: '#888888' },
  light: { bg: '#F5F5F5', accent: '#D4A017', card: '#FFFFFF', text: '#111111', subtext: '#555555' },
  sepia: { bg: '#F4ECD8', accent: '#8B6914', card: '#EDE0C4', text: '#3B2A1A', subtext: '#7A6045' },
}

function applyTheme(values: ThemeValues) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--color-background', values.bg)
  root.style.setProperty('--color-gold', values.accent)
  root.style.setProperty('--color-card-bg', values.card)
  root.style.setProperty('--color-text', values.text)
  root.style.setProperty('--color-subtext', values.subtext)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Settings {
  preferred_currency: string
  email_notifications: boolean
  theme: ThemeName
  custom_bg: string | null
  custom_accent: string | null
  custom_card_bg: string | null
  custom_text: string | null
  custom_subtext: string | null
}

const DEFAULT_SETTINGS: Settings = {
  preferred_currency: 'USD',
  email_notifications: true,
  theme: 'dark',
  custom_bg: null,
  custom_accent: null,
  custom_card_bg: null,
  custom_text: null,
  custom_subtext: null,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('pibazaar-token')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ backgroundColor: 'var(--color-card-bg)' }}
    >
      <h2
        className="text-base font-bold"
        style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
        {label}
      </span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative w-12 h-6 rounded-full transition-colors"
        style={{ backgroundColor: checked ? 'var(--color-gold)' : 'rgba(136,136,136,0.3)' }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(24px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}

function ColorPickerRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm" style={{ color: 'var(--color-text)' }}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono" style={{ color: 'var(--color-subtext)' }}>
          {value}
        </span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 p-0"
          style={{ backgroundColor: 'transparent' }}
        />
      </div>
    </div>
  )
}

function DeleteModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 space-y-4"
        style={{ backgroundColor: 'var(--color-card-bg)' }}
      >
        <h3
          className="font-bold text-lg"
          style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
        >
          Delete Account
        </h3>
        <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
          Contact support to delete your account. Please reach out to{' '}
          <span style={{ color: 'var(--color-gold)' }}>support@pibazaar.app</span>{' '}
          and we will process your request within 7 business days.
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
          style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
        >
          Got it
        </button>
      </div>
    </div>
  )
}

// ─── Preview Card ─────────────────────────────────────────────────────────────

function PreviewCard({ values }: { values: ThemeValues }) {
  return (
    <div
      className="rounded-xl p-4 space-y-2 mt-4"
      style={{ backgroundColor: values.bg, border: `1px solid ${values.accent}40` }}
    >
      <p className="text-xs font-semibold" style={{ color: values.subtext }}>
        Preview
      </p>
      <div
        className="rounded-lg p-3 space-y-1"
        style={{ backgroundColor: values.card }}
      >
        <p
          className="text-sm font-bold"
          style={{ fontFamily: 'Sora, sans-serif', color: values.text }}
        >
          Sample Listing
        </p>
        <p className="text-xs" style={{ color: values.subtext }}>
          A great product on PiBazaar
        </p>
        <span
          className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1"
          style={{ backgroundColor: values.accent, color: values.bg }}
        >
          3.14 π
        </span>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [customColors, setCustomColors] = useState<ThemeValues>({
    bg: '#0A0A0F',
    accent: '#F0C040',
    card: '#16213E',
    text: '#FFFFFF',
    subtext: '#888888',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // ─── Derived preview values ─────────────────────────────────────────────

  const previewValues: ThemeValues =
    settings.theme === 'custom'
      ? customColors
      : THEME_PRESETS[settings.theme as Exclude<ThemeName, 'custom'>] ?? THEME_PRESETS.dark

  // ─── Apply theme whenever selection changes ─────────────────────────────

  useEffect(() => {
    applyTheme(previewValues)
  }, [previewValues])

  // ─── Load settings on mount ─────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        const token = getToken()
        const res = await fetch('/api/users/settings', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error('Failed')
        const { settings: s } = (await res.json()) as { settings: Settings }

        setSettings(s)

        // Seed custom color pickers from saved custom values (fall back to dark preset)
        setCustomColors({
          bg:      s.custom_bg      ?? THEME_PRESETS.dark.bg,
          accent:  s.custom_accent  ?? THEME_PRESETS.dark.accent,
          card:    s.custom_card_bg ?? THEME_PRESETS.dark.card,
          text:    s.custom_text    ?? THEME_PRESETS.dark.text,
          subtext: s.custom_subtext ?? THEME_PRESETS.dark.subtext,
        })

        // Apply the saved theme
        if (s.theme === 'custom') {
          applyTheme({
            bg:      s.custom_bg      ?? THEME_PRESETS.dark.bg,
            accent:  s.custom_accent  ?? THEME_PRESETS.dark.accent,
            card:    s.custom_card_bg ?? THEME_PRESETS.dark.card,
            text:    s.custom_text    ?? THEME_PRESETS.dark.text,
            subtext: s.custom_subtext ?? THEME_PRESETS.dark.subtext,
          })
        } else {
          applyTheme(THEME_PRESETS[s.theme as Exclude<ThemeName, 'custom'>] ?? THEME_PRESETS.dark)
        }
      } catch {
        // silently keep defaults
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  // ─── Save handler ───────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const token = getToken()
      const payload: Record<string, unknown> = {
        preferred_currency: settings.preferred_currency,
        email_notifications: settings.email_notifications,
        theme: settings.theme,
      }
      if (settings.theme === 'custom') {
        payload.custom_bg      = customColors.bg
        payload.custom_accent  = customColors.accent
        payload.custom_card_bg = customColors.card
        payload.custom_text    = customColors.text
        payload.custom_subtext = customColors.subtext
      }

      const res = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Save failed')
      setToast(true)
      setTimeout(() => setToast(false), 2000)
    } catch {
      // Could show an error toast here
    } finally {
      setSaving(false)
    }
  }, [settings, customColors])

  // ─── CSV export ─────────────────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    try {
      const token = getToken()
      const res = await fetch('/api/users/export', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'pibazaar-export.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silent
    }
  }, [])

  // ─── Theme button helper ────────────────────────────────────────────────

  const themeButtons: { key: ThemeName; label: string; emoji: string }[] = [
    { key: 'dark',   label: 'Dark',   emoji: '🌙' },
    { key: 'light',  label: 'Light',  emoji: '☀️' },
    { key: 'sepia',  label: 'Sepia',  emoji: '📜' },
    { key: 'custom', label: 'Custom', emoji: '🎨' },
  ]

  if (loading) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--color-gold)', borderTopColor: 'transparent' }} />
      </main>
    )
  }

  return (
    <main
      className="min-h-screen pb-32"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="px-4 pt-6 max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="mb-2">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
          >
            Settings
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-subtext)' }}>
            Manage your preferences
          </p>
        </div>

        {/* ── Section 1: Notifications ─────────────────────────────── */}
        <SectionCard title="🔔 Notifications">
          <Toggle
            label="Email Notifications"
            checked={settings.email_notifications}
            onChange={(v) => setSettings((s) => ({ ...s, email_notifications: v }))}
          />
        </SectionCard>

        {/* ── Section 2: Currency ──────────────────────────────────── */}
        <SectionCard title="💱 Currency">
          <div>
            <label
              className="text-xs font-semibold block mb-1"
              style={{ color: 'var(--color-subtext)' }}
            >
              Preferred Currency
            </label>
            <input
              type="text"
              maxLength={5}
              placeholder="USD"
              value={settings.preferred_currency}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  preferred_currency: e.target.value.toUpperCase(),
                }))
              }
              className="w-full px-4 py-3 rounded-xl text-sm outline-none uppercase font-mono"
              style={{
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text)',
                border: '1px solid rgba(136,136,136,0.3)',
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-subtext)' }}>
              3-letter code: USD, EUR, GBP, etc.
            </p>
          </div>
        </SectionCard>

        {/* ── Section 3: Theme ─────────────────────────────────────── */}
        <SectionCard title="🎨 Theme">
          {/* 2×2 grid of preset buttons */}
          <div className="grid grid-cols-2 gap-3">
            {themeButtons.map(({ key, label, emoji }) => {
              const isActive = settings.theme === key
              const swatch = key !== 'custom' ? THEME_PRESETS[key] : null
              return (
                <button
                  key={key}
                  onClick={() => setSettings((s) => ({ ...s, theme: key }))}
                  className="rounded-xl p-4 text-left transition-all active:scale-95"
                  style={{
                    backgroundColor: swatch ? swatch.card : 'var(--color-card-bg)',
                    border: `2px solid ${isActive ? 'var(--color-gold)' : 'transparent'}`,
                    outline: 'none',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{emoji}</span>
                    <span
                      className="text-sm font-bold"
                      style={{
                        fontFamily: 'Sora, sans-serif',
                        color: swatch ? swatch.text : 'var(--color-text)',
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  {swatch && (
                    <div className="flex gap-1 mt-2">
                      <span
                        className="w-4 h-4 rounded-full border border-white/10"
                        style={{ backgroundColor: swatch.bg }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-white/10"
                        style={{ backgroundColor: swatch.accent }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-white/10"
                        style={{ backgroundColor: swatch.text }}
                      />
                    </div>
                  )}
                  {key === 'custom' && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-subtext)' }}>
                      Pick your own colors
                    </p>
                  )}
                </button>
              )
            })}
          </div>

          {/* Custom color pickers — shown only when Custom is active */}
          {settings.theme === 'custom' && (
            <div
              className="mt-4 rounded-xl p-4 space-y-3"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid rgba(136,136,136,0.2)',
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-subtext)' }}
              >
                Custom Colors
              </p>
              <ColorPickerRow
                label="Background"
                value={customColors.bg}
                onChange={(v) => setCustomColors((c) => ({ ...c, bg: v }))}
              />
              <ColorPickerRow
                label="Accent"
                value={customColors.accent}
                onChange={(v) => setCustomColors((c) => ({ ...c, accent: v }))}
              />
              <ColorPickerRow
                label="Card Background"
                value={customColors.card}
                onChange={(v) => setCustomColors((c) => ({ ...c, card: v }))}
              />
              <ColorPickerRow
                label="Text"
                value={customColors.text}
                onChange={(v) => setCustomColors((c) => ({ ...c, text: v }))}
              />
              <ColorPickerRow
                label="Subtext"
                value={customColors.subtext}
                onChange={(v) => setCustomColors((c) => ({ ...c, subtext: v }))}
              />
            </div>
          )}

          {/* Live preview card */}
          <PreviewCard values={previewValues} />
        </SectionCard>

        {/* ── Section 4: Account ───────────────────────────────────── */}
        <SectionCard title="👤 Account">
          <div className="space-y-3">
            <button
              onClick={handleExport}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text)',
                border: '1px solid rgba(136,136,136,0.3)',
              }}
            >
              📥 Export My Data (CSV)
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#EF4444' }}
            >
              🗑️ Delete Account
            </button>
          </div>
        </SectionCard>

        {/* ── Save button ──────────────────────────────────────────── */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-60"
          style={{
            backgroundColor: 'var(--color-gold)',
            color: '#000',
            fontFamily: 'Sora, sans-serif',
          }}
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* ── Success toast ─────────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed bottom-28 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl font-semibold text-sm shadow-xl z-50 transition-all"
          style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
        >
          ✓ Settings saved!
        </div>
      )}

      {/* ── Delete modal ─────────────────────────────────────────── */}
      {showDeleteModal && <DeleteModal onClose={() => setShowDeleteModal(false)} />}
    </main>
  )
}
