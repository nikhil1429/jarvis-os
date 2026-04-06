// useGeminiStatus.js — Reactive hook for Gemini Live connection state
// WHY: Components need to know if Gemini is connected to decide their behavior.
// VoiceMode becomes visual-only when Gemini active. ChatView mic opens VoiceMode.

import { useState, useEffect } from 'react'

export default function useGeminiStatus() {
  const [active, setActive] = useState(!!window.__geminiConnected)
  useEffect(() => {
    const on = () => setActive(true)
    const off = () => setActive(false)
    window.addEventListener('gemini-connected', on)
    window.addEventListener('gemini-disconnected', off)
    return () => {
      window.removeEventListener('gemini-connected', on)
      window.removeEventListener('gemini-disconnected', off)
    }
  }, [])
  return active
}
