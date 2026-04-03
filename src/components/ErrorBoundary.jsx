// ErrorBoundary.jsx — Catches component crashes, shows recovery UI instead of white screen
import { Component } from 'react'
import * as Sentry from '@sentry/react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
    // Send to Sentry if configured
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '50vh', gap: 16, padding: 20,
        }}>
          <p style={{ fontFamily: 'Rajdhani', fontSize: 18, color: '#ef4444', letterSpacing: '0.12em', fontWeight: 700 }}>
            SYSTEM MALFUNCTION
          </p>
          <p style={{ fontFamily: 'Exo 2', fontSize: 13, color: '#5a7a94', textAlign: 'center', maxWidth: 300 }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              fontFamily: 'Share Tech Mono', fontSize: 12, letterSpacing: '0.12em',
              padding: '10px 24px', border: '1px solid #00b4d8', borderRadius: 4,
              color: '#00b4d8', background: 'rgba(0,180,216,0.08)', cursor: 'pointer',
            }}
          >
            RECOVER
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
