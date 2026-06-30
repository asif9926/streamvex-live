// [Update #3] ErrorBoundary.jsx — Global crash protection
// VideoPlayer ও ScoreGrid এ wrap করলে site crash হবে না

import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Production এ Sentry বা অন্য error tracker এখানে দাও
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-brand-surface border border-brand-border text-center">
          <p className="text-brand-red font-semibold text-sm mb-1">
            ⚠️ Something went wrong
          </p>
          <p className="text-white/40 text-xs">
            {this.props.label || 'This section'} লোড হয়নি।{' '}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="underline text-brand-blue hover:text-blue-400 transition-colors"
            >
              আবার চেষ্টা করুন
            </button>
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
