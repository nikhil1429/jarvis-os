// useSessionContinuity.js — Auto-saves session state for inter-session memory
// WHY: JARVIS needs to know what happened last session. This hook auto-saves
// on tab close, every 5 minutes, and on shutdown ceremony.

import { useEffect } from 'react'
import { saveSessionState } from '../utils/sessionContinuity.js'

export default function useSessionContinuity() {
  useEffect(() => {
    // Save on tab close / refresh
    const handleUnload = () => saveSessionState()
    window.addEventListener('beforeunload', handleUnload)

    // Save every 5 minutes
    const interval = setInterval(() => saveSessionState(), 5 * 60 * 1000)

    // Save on shutdown event
    const handleShutdown = () => saveSessionState()
    window.addEventListener('jarvis-shutdown', handleShutdown)

    // Initial save after 30s (capture boot state)
    const initialTimeout = setTimeout(() => saveSessionState(), 30000)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      window.removeEventListener('jarvis-shutdown', handleShutdown)
      clearInterval(interval)
      clearTimeout(initialTimeout)
      // Final save on unmount
      saveSessionState()
    }
  }, [])
}
