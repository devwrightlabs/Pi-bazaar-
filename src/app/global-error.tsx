'use client'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Next.js global-error — catches errors that occur in the root layout itself.
 * Must provide its own <html> and <body> tags since the root layout may have
 * failed. Uses inline styles only (no CSS imports available).
 */
export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body
        style={{
          backgroundColor: '#0A0A0F',
          color: '#FFFFFF',
          fontFamily: 'DM Sans, system-ui, sans-serif',
          margin: 0,
          padding: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚠️</div>
          <h1
            style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '12px',
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: '#888888',
              maxWidth: '400px',
              marginBottom: '24px',
            }}
          >
            PiBazaar encountered a critical error. Please try reloading the app.
          </p>
          <button
            onClick={reset}
            style={{
              backgroundColor: '#F0C040',
              color: '#000000',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
