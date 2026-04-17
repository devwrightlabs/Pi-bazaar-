'use client'

import ErrorBoundary from '@/components/ErrorBoundary'

function RootFallback() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
      style={{ backgroundColor: '#0A0A0F' }}
    >
      <div className="text-6xl mb-6">⚠️</div>
      <h1
        className="text-2xl font-bold mb-3"
        style={{ fontFamily: 'Sora, sans-serif', color: '#FFFFFF' }}
      >
        Something went wrong
      </h1>
      <p
        className="text-sm mb-6 max-w-md"
        style={{ fontFamily: 'DM Sans, sans-serif', color: '#888888' }}
      >
        PiBazaar encountered an unexpected error. Please try reloading the app.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-xl font-semibold text-sm"
        style={{ backgroundColor: '#F0C040', color: '#000' }}
      >
        Reload App
      </button>
    </div>
  )
}

export default function RootErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={<RootFallback />}> 
      {children}
    </ErrorBoundary>
  )
}
