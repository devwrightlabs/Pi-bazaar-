'use client'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const details = [error.message, error.stack].filter(Boolean).join('\n\n')

  return (
    <div
      className="min-h-screen p-4"
      style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
    >
      <div className="mx-auto max-w-4xl">
        <h1 className="text-lg font-semibold mb-3">Application Error</h1>
        <button
          onClick={reset}
          className="mb-4 rounded-md px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
        >
          Retry
        </button>
        <pre
          className="whitespace-pre-wrap break-words rounded-md border p-4 text-xs"
          style={{
            borderColor: '#000',
            backgroundColor: 'var(--color-error)',
            color: '#000',
          }}
        >
          {details || 'Unknown error'}
        </pre>
      </div>
    </div>
  )
}
