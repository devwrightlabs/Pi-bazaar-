'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div
          className="flex flex-col items-center justify-center min-h-[200px] rounded-xl p-6 text-center"
          style={{ backgroundColor: 'var(--color-card-bg)' }}
        >
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            Something went wrong
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--color-subtext)' }}>
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-lg font-medium text-sm"
            style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
