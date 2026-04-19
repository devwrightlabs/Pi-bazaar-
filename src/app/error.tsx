'use client'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const details = [error.message, error.stack].filter(Boolean).join('\n\n')

  return (
    <div className="min-h-screen p-4 bg-[#2a0000] text-[#ffe6e6]">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-lg font-semibold mb-3">Application Error</h1>
        <button
          onClick={reset}
          className="mb-4 rounded-md bg-[#ffb3b3] px-4 py-2 text-sm font-semibold text-[#2a0000]"
        >
          Retry
        </button>
        <pre className="whitespace-pre-wrap break-words rounded-md border border-[#ff8080] bg-[#4d0000] p-4 text-xs">
          {details || 'Unknown error'}
        </pre>
      </div>
    </div>
  )
}
