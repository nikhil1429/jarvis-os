// BodyDoubleTimer.jsx — Focus timer + JARVIS chat + ghost mode check-ins
// WHY: Body doubling is an ADHD technique. JARVIS is silently present, checks in
// at 10-minute intervals ("What did you just write?"), timer counts down with
// color shift cyan→gold→red. Full chat available during session.

import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, X, Send, Mic, Clock } from 'lucide-react'
import useAI from '../../hooks/useAI.js'
import useStorage from '../../hooks/useStorage.js'
import useSound from '../../hooks/useSound.js'
import useJarvisVoice from '../../hooks/useJarvisVoice.js'

const GHOST_MESSAGES = [
  "Sir, what did you just write?",
  "Status check. Still on target?",
  "Quick check — what are you working on right now?",
  "Ghost Mode check. Report, Sir.",
  "Still engaged? What's your current progress?",
]

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getTimerColor(remaining, total) {
  if (remaining < 60) return '#ef4444'
  if (remaining < total * 0.2) return '#d4a853'
  return '#00f0ff'
}

export default function BodyDoubleTimer() {
  const { sendMessage } = useAI()
  const { get, update } = useStorage()
  const { play } = useSound()
  const voice = useJarvisVoice()

  const [duration, setDuration] = useState(25)
  const [remaining, setRemaining] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [taskText, setTaskText] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')

  const timerRef = useRef(null)
  const ghostRef = useRef(null)
  const startTimeRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Listen for voice send events
  useEffect(() => {
    const onSend = (e) => { if (isRunning) handleChat(e.detail.text) }
    const onInterim = (e) => setInput(e.detail.text)
    window.addEventListener('jarvis-voice-send', onSend)
    window.addEventListener('jarvis-voice-interim', onInterim)
    return () => {
      window.removeEventListener('jarvis-voice-send', onSend)
      window.removeEventListener('jarvis-voice-interim', onInterim)
    }
  }, [isRunning, handleChat])

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (ghostRef.current) clearInterval(ghostRef.current)
    }
  }, [])

  const addMessage = useCallback((role, content) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date().toISOString() }])
  }, [])

  const startSession = useCallback(() => {
    const totalSec = duration * 60
    setRemaining(totalSec)
    setIsRunning(true)
    startTimeRef.current = Date.now()
    play('boot')

    // JARVIS greeting
    const greeting = `Focus session initiated, Sir. ${duration} minutes on the clock.${taskText ? ` Target: ${taskText}.` : ' What shall we focus on?'} I will check in periodically.`
    addMessage('assistant', greeting)
    voice.speak(greeting, { isVoiceCommand: true })

    // Countdown timer
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          clearInterval(ghostRef.current)
          handleSessionEnd()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Ghost mode: check-in every 10 minutes
    ghostRef.current = setInterval(() => {
      const msg = GHOST_MESSAGES[Math.floor(Math.random() * GHOST_MESSAGES.length)]
      addMessage('assistant', msg)
      voice.speak(msg, { isVoiceCommand: true })
    }, 10 * 60 * 1000)
  }, [duration, taskText, play, voice, addMessage])

  const handleSessionEnd = useCallback(() => {
    setIsRunning(false)
    play('milestone')
    const endMsg = `Time, Sir. ${duration}-minute session complete. What did you accomplish?`
    addMessage('assistant', endMsg)
    voice.speak(endMsg, { isVoiceCommand: true })

    // Save session
    update('session-timer', prev => ({
      ...(prev || {}),
      date: new Date().toISOString().split('T')[0],
      lastSession: {
        duration,
        task: taskText,
        startTime: startTimeRef.current ? new Date(startTimeRef.current).toISOString() : null,
        endTime: new Date().toISOString(),
        completed: true,
      }
    }))
  }, [duration, taskText, play, voice, update, addMessage])

  const stopSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (ghostRef.current) clearInterval(ghostRef.current)
    setIsRunning(false)
    const elapsed = Math.round((Date.now() - (startTimeRef.current || Date.now())) / 60000)
    const msg = `Session ended early at ${elapsed} minutes. Sometimes knowing when to stop is wisdom, Sir.`
    addMessage('assistant', msg)
    voice.speak(msg, { isVoiceCommand: true })
  }, [voice, addMessage])

  const handleChat = useCallback(async (text) => {
    const trimmed = text?.trim()
    if (!trimmed) return
    addMessage('user', trimmed)
    setInput('')
    try {
      const result = await sendMessage(trimmed, 'body-double', {})
      if (result?.text) {
        addMessage('assistant', result.text)
        voice.speak(result.text)
      }
    } catch (err) {
      console.error('[BodyDouble] Chat failed:', err)
    }
  }, [sendMessage, voice, addMessage])

  const handleMicClick = useCallback(() => {
    if (voice.voiceState === 'SPEAKING') voice.stopSpeaking()
    else if (voice.voiceState === 'LISTENING') voice.stopListening()
    else voice.startListening()
  }, [voice])

  const timerColor = isRunning ? getTimerColor(remaining, duration * 60) : '#00f0ff'

  // Not started view
  if (!isRunning && messages.length === 0) {
    return (
      <div className="glass-card p-5">
        <div className="text-center mb-4">
          <Clock size={28} className="mx-auto mb-2" style={{ color: '#00f0ff' }} />
          <h3 className="font-display text-lg font-bold text-cyan tracking-wider uppercase neon-heading">Body Double</h3>
          <p className="font-body text-xs text-text-dim mt-1">ADHD co-working with JARVIS</p>
        </div>

        <div className="flex justify-center gap-3 mb-4">
          {[25, 45].map(d => (
            <button key={d} onClick={() => setDuration(d)}
              className={`glass-card px-5 py-2 font-mono text-sm transition-all ${
                duration === d ? 'border-cyan text-cyan' : 'text-text-muted hover:text-text-dim'
              }`}>{d} MIN</button>
          ))}
        </div>

        <input type="text" value={taskText} onChange={e => setTaskText(e.target.value)}
          placeholder="What are you working on? (optional)"
          className="w-full bg-void border border-border rounded-lg px-4 py-2 mb-4
            font-body text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-cyan" />

        <button onClick={startSession}
          className="w-full glass-card py-3 flex items-center justify-center gap-2 border-cyan text-cyan hover:bg-cyan/10 transition-all">
          <Play size={18} /> <span className="font-display text-sm font-bold tracking-wider">BEGIN SESSION</span>
        </button>
      </div>
    )
  }

  // Running / completed view
  return (
    <div className="glass-card flex flex-col" style={{ height: 'calc(100vh - 10rem)' }}>
      {/* Timer display */}
      <div className="text-center py-4 border-b border-border" style={{ flexShrink: 0 }}>
        <div className="flex items-center justify-between px-4">
          <span className="font-mono text-[10px] text-text-muted">{taskText || 'FOCUS SESSION'}</span>
          {isRunning && (
            <button onClick={stopSession} className="text-text-muted hover:text-red-400 transition-colors"><X size={16} /></button>
          )}
        </div>
        <p className="font-mono text-5xl font-bold mt-1" style={{
          color: timerColor,
          textShadow: `0 0 20px ${timerColor}60`,
          animation: remaining < 60 && isRunning ? 'neonPulse 1s ease-in-out infinite' : 'none',
        }}>
          {isRunning ? formatTimer(remaining) : 'COMPLETE'}
        </p>
        {isRunning && (
          <div className="w-48 h-1.5 rounded-full mx-auto mt-2 overflow-hidden" style={{ backgroundColor: '#0d2137' }}>
            <div className="h-full rounded-full transition-all duration-1000 progress-glow-dot"
              style={{
                width: `${((duration * 60 - remaining) / (duration * 60)) * 100}%`,
                backgroundColor: timerColor,
              }} />
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: 0 }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <p className={`font-body text-xs max-w-[85%] px-3 py-2 rounded-lg ${
              msg.role === 'user' ? 'bg-cyan/10 text-cyan/80' : 'glass-card text-text-dim holo-response'
            }`}>{msg.content}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar with mic */}
      {isRunning && (
        <div className="flex gap-2 p-3 border-t border-border" style={{ flexShrink: 0 }}>
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { handleChat(input); setInput('') } }}
            placeholder={voice.voiceState === 'LISTENING' ? 'Listening...' : 'Chat with JARVIS...'}
            className={`flex-1 bg-void border rounded-lg px-3 py-2 font-body text-xs text-text
              placeholder:text-text-muted focus:outline-none transition-all ${
              voice.voiceState === 'LISTENING' ? 'border-cyan shadow-[0_0_12px_rgba(0,180,216,0.3)]' : 'border-border focus:border-cyan'
            }`} />
          <button onClick={handleMicClick}
            className={`p-2 rounded-lg border transition-all ${
              voice.voiceState === 'LISTENING' ? 'bg-cyan/15 border-cyan text-cyan animate-pulse'
              : voice.voiceState === 'SPEAKING' ? 'bg-gold/10 border-gold/40 text-gold'
              : 'border-border text-text-muted hover:border-cyan/40 hover:text-cyan'
            }`}>
            <Mic size={16} />
          </button>
          <button onClick={() => { handleChat(input); setInput('') }}
            disabled={!input.trim()}
            className="p-2 rounded-lg border border-border text-text-muted hover:border-cyan/40 hover:text-cyan disabled:opacity-30">
            <Send size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
