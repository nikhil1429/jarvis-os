// QuickVoiceOverlay.jsx — Slide-down voice panel on any tab
// Uses useJarvisVoice hook for all voice logic. This file is just UI.

import { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import useAI from '../hooks/useAI.js'
import useSound from '../hooks/useSound.js'
import useVoiceCheckIn from '../hooks/useVoiceCheckIn.js'
import useJarvisVoice from '../hooks/useJarvisVoice.js'
import { processVoiceCommand } from '../utils/voiceCommands.js'

export default function QuickVoiceOverlay({ onClose }) {
  const { sendMessage } = useAI()
  const { play, startThinking, stopThinking } = useSound()
  const checkIn = useVoiceCheckIn()
  const voice = useJarvisVoice()

  const [messages, setMessages] = useState([])
  const [visible, setVisible] = useState(false)
  const autoHideTimerRef = useRef(null)

  // Slide in

  // Cleanup
  // Auto-hide 8s after IDLE with messages
  // Auto-start listening
  // Listen for voice events

  const handleClose = useCallback(() => {
    voice.stopSpeaking()
    voice.stopListening()
    stopThinking()
    setVisible(false)
    setTimeout(() => onClose(), 300)
  }, [onClose, voice, stopThinking])

  const handleSend = useCallback(async (text) => {
    const trimmed = text?.trim()
    if (!trimmed) return

    if (checkIn.active) {
      const r = checkIn.processAnswer(trimmed)
      if (r) {
        setMessages(prev => [...prev, { role: 'assistant', content: r.nextPrompt, ts: Date.now() }].slice(-3))
        voice.speak(r.nextPrompt, { isVoiceCommand: true })
      }
      return
    }

    const cmd = processVoiceCommand(trimmed)
    if (cmd) {
      setMessages(prev => [...prev, { role: 'user', content: trimmed, ts: Date.now() }].slice(-3))
      if (cmd.type === 'stop') { voice.stopSpeaking(); handleClose(); return }
      if (cmd.type === 'checkin') checkIn.start()
      if (cmd.type === 'mode') window.dispatchEvent(new CustomEvent('jarvis-open-mode', { detail: { mode: cmd.mode } }))
      setMessages(prev => [...prev, { role: 'assistant', content: cmd.response, ts: Date.now() }].slice(-3))
      voice.speak(cmd.response, { isVoiceCommand: true })
      return
    }

    setMessages(prev => [...prev, { role: 'user', content: trimmed, ts: Date.now() }].slice(-3))
    const stopTick = await startThinking()
    try {
      const result = await sendMessage(trimmed, 'chat', {})
      stopTick(); stopThinking()
      if (result) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.text, ts: Date.now(), tier: result.tier }].slice(-3))
        voice.speak(result.text)
      }
    } catch (err) {
      console.error('[QuickVoice] Send failed:', err)
      stopTick(); stopThinking()
    }
  }, [sendMessage, voice, checkIn, handleClose, startThinking, stopThinking])

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])


  useEffect(() => {
    return () => {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current)
      voice.stopListening()
      voice.stopSpeaking()
      stopThinking()
    }
  }, [stopThinking])

  useEffect(() => {
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current)
    if (voice.voiceState === 'IDLE' && messages.length > 0) {
      autoHideTimerRef.current = setTimeout(() => handleClose(), 8000)
    }
    return () => { if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current) }
  }, [voice.voiceState, messages.length])

  useEffect(() => {
    const t = setTimeout(() => voice.startListening(), 200)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const onSend = (e) => handleSend(e.detail.text)
    const onInterrupt = (e) => handleSend(e.detail.text)
    window.addEventListener('jarvis-voice-send', onSend)
    window.addEventListener('jarvis-voice-interrupt', onInterrupt)
    return () => {
      window.removeEventListener('jarvis-voice-send', onSend)
      window.removeEventListener('jarvis-voice-interrupt', onInterrupt)
    }
  }, [])


  const vs = voice.voiceState
  const stateDisplay = {
    IDLE: { icon: '', text: '', color: '' },
    LISTENING: { icon: '\u{1F3A4}', text: 'Listening...', color: '#00b4d8' },
    PROCESSING: { icon: '\u23F3', text: 'Processing...', color: '#d4a853' },
    SPEAKING: { icon: '\u{1F50A}', text: 'JARVIS speaking...', color: '#d4a853' },
  }[vs]
  const barColor = vs === 'LISTENING' ? '#00b4d8' : vs !== 'IDLE' ? '#d4a853' : 'transparent'

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'rgba(2, 10, 19, 0.95)', borderBottom: '1px solid rgba(0, 180, 216, 0.3)',
      backdropFilter: 'blur(12px)', minHeight: 120, maxHeight: '40vh',
      display: 'flex', flexDirection: 'column', padding: '16px 20px', gap: 12,
      transform: visible ? 'translateY(0)' : 'translateY(-100%)', opacity: visible ? 1 : 0,
      transition: 'transform 0.3s ease, opacity 0.3s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {vs !== 'IDLE' && (
            <>
              <span style={{ fontSize: 16 }}>{stateDisplay.icon}</span>
              <span className="animate-pulse" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 13, letterSpacing: '0.08em', color: stateDisplay.color }}>
                {stateDisplay.text}
                {voice.silenceCountdown && <span style={{ marginLeft: 8, color: '#5a7a94' }}>{voice.silenceCountdown}</span>}
              </span>
            </>
          )}
          {vs === 'IDLE' && messages.length === 0 && (
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 13, color: '#5a7a94' }}>Tap mic or speak...</span>
          )}
        </div>
        <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#5a7a94', display: 'flex' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {messages.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.slice(-3).map((msg, i) => (
              <div key={i} style={{ textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                <span style={{
                  display: 'inline-block', maxWidth: '85%', padding: '8px 12px', borderRadius: 8,
                  fontSize: 14, fontFamily: 'Exo 2, sans-serif', lineHeight: 1.4,
                  ...(msg.role === 'user'
                    ? { background: 'rgba(0,180,216,0.1)', color: 'rgba(0,180,216,0.85)' }
                    : msg.tier >= 2 ? { background: 'rgba(212,168,83,0.1)', color: 'rgba(212,168,83,0.85)' }
                    : { background: 'rgba(6,20,34,1)', color: '#d0e8f8' }),
                }}>{msg.content?.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ width: '100%', height: 3, borderRadius: 2, background: 'rgba(13,33,55,0.8)', flexShrink: 0, overflow: 'hidden' }}>
        {vs !== 'IDLE' && (
          <div className="animate-pulse" style={{ height: '100%', borderRadius: 2, background: barColor, width: vs === 'PROCESSING' ? '66%' : '100%', transition: 'width 0.5s ease' }} />
        )}
      </div>
    </div>
  )
}
