// ErrorBoundary.jsx — Catches component crashes, shows recovery UI instead of white screen
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#d0e8f8', fontFamily: 'Exo 2, sans-serif' }}>
          <p style={{ color: '#ef4444', fontSize: 14, marginBottom: 12 }}>SYSTEM MALFUNCTION</p>
          <p style={{ color: '#5a7a94', fontSize: 13, marginBottom: 20 }}>{this.state.error?.message || 'Component crashed'}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            style={{ background: 'transparent', border: '1px solid #00b4d8', color: '#00b4d8', padding: '8px 20px', borderRadius: 4, cursor: 'pointer', fontFamily: 'Rajdhani', fontSize: 13, letterSpacing: '0.1em' }}>
            RECOVER
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
