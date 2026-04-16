'use client'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Next.js App Router error boundary — catches errors in the root layout's
 * children. Never exposes raw error messages to users; shows a branded
 * fallback UI instead.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="text-5xl mb-4">⚠️</div>
      <h2
        className="text-xl font-bold mb-2"
        style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
      >
        Something went wrong
      </h2>
      <p
        className="text-sm mb-6 max-w-sm"
        style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--color-subtext)' }}
      >
        We hit an unexpected error. Please try again or go back to the home page.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-3 rounded-xl font-semibold text-sm min-h-[44px] transition-all active:scale-95"
          style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
        >
          Try Again
        </button>
        <a
          href="/"
          className="px-5 py-3 rounded-xl font-semibold text-sm min-h-[44px] transition-all active:scale-95 inline-flex items-center"
          style={{
            backgroundColor: 'var(--color-control-bg)',
            color: 'var(--color-text)',
          }}
        >
          Go Home
        </a>
      </div>
      {process.env.NODE_ENV === 'development' && error.message && (
        <pre
          className="mt-6 text-xs text-left max-w-md overflow-auto p-3 rounded-lg"
          style={{
            backgroundColor: 'var(--color-card-bg)',
            color: 'var(--color-error)',
          }}
        >
          {error.message}
        </pre>
      )}
    </div>
  )
}
