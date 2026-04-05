// GeminiVoiceButton.jsx — Floating voice button with Phase 3 omnipresence
// Glow on initiation events, processing indicator, LIVE badge, timer.

import { useState, useEffect } from 'react'
import { Mic } from 'lucide-react'
import useGeminiVoice from '../hooks/useGeminiVoice.js'
import useTranscriptProcessor from '../hooks/useTranscriptProcessor.js'

export default function GeminiVoiceButton() {
  const { isConnected, error, connectToJarvis, disconnectFromJarvis, startTime } = useGeminiVoice()
  const { processTranscript, isProcessing } = useTranscriptProcessor()
  const [elapsed, setElapsed] = useState(0)
  const [showError, setShowError] = useState(false)
  const [isGlowing, setIsGlowing] = useState(false)
  const [initiateMessage, setInitiateMessage] = useState(null)

  const enabled = (() => { try { return JSON.parse(localStorage.getItem('jos-settings') || '{}').geminiVoice !== false } catch { return true } })()

  useEffect(() => {
    if (!isConnected) { setElapsed(0); return }
    const i = setInterval(() => setElapsed(Math.round((Date.now() - (startTime || Date.now())) / 1000)), 1000)
    return () => clearInterval(i)
  }, [isConnected, startTime])

  useEffect(() => { if (error) { setShowError(true); setTimeout(() => setShowError(false), 4000) } }, [error])

  useEffect(() => {
    const h = () => { setTimeout(() => processTranscript(), 500) }
    window.addEventListener('gemini-session-ended', h)
    return () => window.removeEventListener('gemini-session-ended', h)
  }, [processTranscript])

  // Boot briefing: auto-connect Gemini and speak briefing text
  useEffect(() => {
    const h = async (e) => {
      const text = e.detail?.text
      if (!text || !enabled) return
      try {
        // Connect, then once connected inject briefing as model turn
        connectToJarvis()
        // Wait for connection to establish, then inject briefing
        const waitForConnection = (retries = 0) => {
          if (retries > 20) return // 10s max wait
          setTimeout(() => {
            // Check if connected by looking for active WebSocket
            if (isConnected) {
              // Dispatch event for the hook to inject text into Gemini session
              window.dispatchEvent(new CustomEvent('gemini-inject-briefing', { detail: { text } }))
            } else {
              waitForConnection(retries + 1)
            }
          }, 500)
        }
        waitForConnection()
      } catch (err) {
        console.warn('[Boot] Gemini briefing failed, text-only fallback:', err)
      }
    }
    window.addEventListener('jarvis-boot-briefing', h)
    return () => window.removeEventListener('jarvis-boot-briefing', h)
  }, [connectToJarvis, isConnected, enabled])

  // Piece 8: JARVIS initiates — glow on important events
  useEffect(() => {
    const h = (e) => {
      const { type, message } = e.detail || {}
      if (type === 'glow') { setIsGlowing(true); setInitiateMessage(message); setTimeout(() => { setIsGlowing(false); setInitiateMessage(null) }, 30000) }
      if (type === 'ghost') window.dispatchEvent(new CustomEvent('jarvis-ghost-card', { detail: { id: 'jarvis-initiate', text: message } }))
    }
    window.addEventListener('jarvis-initiate', h)
    return () => window.removeEventListener('jarvis-initiate', h)
  }, [])

  if (!enabled) return null
  const handleClick = () => { if (isConnected) disconnectFromJarvis(); else { setIsGlowing(false); setInitiateMessage(null); connectToJarvis() } }
  const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

  return (
    <>
      {showError && error && (
        <div className="fixed bottom-24 right-4 z-50 max-w-xs">
          <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-3 py-2">
            <p className="font-mono text-[10px] text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Initiate tooltip */}
      {isGlowing && initiateMessage && !isConnected && (
        <div className="fixed bottom-[5.5rem] right-4 z-50 max-w-48">
          <div className="bg-card/95 border border-gold/20 rounded-lg px-3 py-2 backdrop-blur-md">
            <p className="font-mono text-[9px] text-gold/80">{initiateMessage}</p>
          </div>
        </div>
      )}

      <button onClick={handleClick}
        className={`fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
          isConnected ? 'bg-gold/20 border-2 border-gold shadow-[0_0_20px_rgba(212,168,83,0.3)]'
          : isGlowing ? 'bg-gold/15 border-2 border-gold/50 shadow-[0_0_15px_rgba(212,168,83,0.25)] animate-pulse'
          : 'bg-cyan/10 border border-cyan/30 hover:bg-cyan/20 hover:shadow-[0_0_12px_rgba(0,180,216,0.2)]'
        }`} style={{ backdropFilter: 'blur(8px)' }}>
        <Mic size={20} className={isConnected ? 'text-gold animate-pulse' : isGlowing ? 'text-gold' : 'text-cyan'} />
        {isConnected && (
          <span className="absolute -top-1 -right-1 flex items-center gap-0.5 bg-gold/90 text-void font-mono text-[7px] font-bold tracking-wider px-1.5 py-0.5 rounded-full">
            <span className="w-1 h-1 bg-void rounded-full animate-pulse" />LIVE
          </span>
        )}
      </button>

      {isConnected && <div className="fixed bottom-[4.2rem] right-4 z-50 text-center" style={{ width: 48 }}><span className="font-mono text-[9px] text-gold/70 tracking-wider">{fmt(elapsed)}</span></div>}
      {isProcessing && <div className="fixed bottom-14 right-4 z-50 text-center" style={{ width: 48 }}><span className="font-mono text-[8px] text-cyan/50 animate-pulse tracking-wider">processing</span></div>}
    </>
  )
}
