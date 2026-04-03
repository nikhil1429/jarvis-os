// ChatView.jsx — Voice-first chat interface powered by useJarvisVoice hook
// All voice logic lives in the hook. ChatView handles UI + message flow only.

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Send, Mic, Zap, Image as ImageIcon } from 'lucide-react'
import useAI from '../../hooks/useAI.js'
import useStorage from '../../hooks/useStorage.js'
import useSound from '../../hooks/useSound.js'
import useEventBus from '../../hooks/useEventBus.js'
import useVoiceCheckIn from '../../hooks/useVoiceCheckIn.js'
import useJarvisVoice from '../../hooks/useJarvisVoice.js'
import { processVoiceCommand } from '../../utils/voiceCommands.js'
import TASKS from '../../data/tasks.js'
import { extractQuizScores, stripQuizTags, updateConceptStrength } from '../../utils/quizScoring.js'
import renderMd from '../../utils/renderMd.js'
import VizSmartCards from '../viz/VizSmartCards.jsx'

const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null

export default function ChatView({ mode, weekNumber, onBack, onModeSwitch, autoMic }) {
  const { sendMessage, isStreaming, streamingText, error } = useAI()
  const { get } = useStorage()
  const { play, startThinking, stopThinking } = useSound()
  const eventBus = useEventBus()
  const checkIn = useVoiceCheckIn()
  const voice = useJarvisVoice()
  const modeEnterTime = useRef(Date.now())

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [pendingImage, setPendingImage] = useState(null)
  const [lastTier, setLastTier] = useState(1)

  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)

  // Scroll on new messages

  // Load history + mode events
  // Auto-mic on mount
  // External mic activation (from GlobalMic)
  // Listen for voice hook events
  // ============================================================
  // SEND
  // ============================================================
  // Typed send
  // Mic button

  const handleSendDirect = useCallback(async (text) => {
    const trimmed = text?.trim()
    if (!trimmed) return
    setInput('')

    // Voice check-in
    if (checkIn.active) {
      const result = checkIn.processAnswer(trimmed)
      if (result) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.nextPrompt, timestamp: new Date().toISOString() }])
        voice.speak(result.nextPrompt, { isVoiceCommand: true })
      }
      return
    }

    // Voice commands
    const cmd = processVoiceCommand(trimmed)
    if (cmd) {
      setMessages(prev => [...prev, { role: 'user', content: trimmed, timestamp: new Date().toISOString() }])
      if (cmd.type === 'stop') { voice.stopSpeaking(); return }
      if (cmd.type === 'shutdown') {
        setMessages(prev => [...prev, { role: 'assistant', content: cmd.response, timestamp: new Date().toISOString() }])
        voice.speak(cmd.response, { isVoiceCommand: true })
        setTimeout(() => window.dispatchEvent(new CustomEvent('jarvis-request-shutdown')), 2000)
        return
      }
      if (cmd.type === 'checkin') {
        checkIn.start()
        setMessages(prev => [...prev, { role: 'assistant', content: cmd.response, timestamp: new Date().toISOString() }])
        voice.speak(cmd.response, { isVoiceCommand: true })
        return
      }
      if (cmd.type === 'task') {
        setMessages(prev => [...prev, { role: 'assistant', content: cmd.response, timestamp: new Date().toISOString() }])
        voice.speak(cmd.response, { isVoiceCommand: true })
        eventBus.emit('task:complete', { taskId: cmd.taskId })
        // Auto-question pipeline: queue interview question for completed task
        try {
          const task = TASKS.find(t => t.id === cmd.taskId)
          if (task) {
            const existing = JSON.parse(localStorage.getItem('jos-interviews') || '[]')
            if (!existing.some(e => e.taskId === cmd.taskId)) {
              existing.push({ taskId: cmd.taskId, taskName: task.name, week: task.week, status: 'pending' })
              localStorage.setItem('jos-interviews', JSON.stringify(existing))
            }
          }
        } catch { /* ok */ }
        return
      }
      if (cmd.type === 'mode' && onModeSwitch) {
        setMessages(prev => [...prev, { role: 'assistant', content: cmd.response, timestamp: new Date().toISOString() }])
        voice.speak(cmd.response, { isVoiceCommand: true })
        setTimeout(() => onModeSwitch(cmd.mode), 1500)
        return
      }
      setMessages(prev => [...prev, { role: 'assistant', content: cmd.response, timestamp: new Date().toISOString() }])
      voice.speak(cmd.response, { isVoiceCommand: true })
      return
    }

    // Normal API call
    setMessages(prev => [...prev, { role: 'user', content: trimmed, timestamp: new Date().toISOString() }])
    play('send')

    const stopTick = await startThinking()
    try {
      const result = await sendMessage(trimmed, mode.id, { weekNumber, image: pendingImage })
      setPendingImage(null)
      stopTick(); stopThinking()
      if (result) {
        // Strip quiz score tags from display + voice
        const cleanText = stripQuizTags(result.text)
        setMessages(prev => [...prev, {
          role: 'assistant', content: cleanText, timestamp: new Date().toISOString(),
          model: result.model, tier: result.tier, autoUpgraded: result.autoUpgraded, reason: result.reason,
        }])
        setLastTier(result.tier)
        play('receive')
        voice.speak(cleanText)

        // Decision log — auto-capture decisions
        checkDecisionLog(trimmed, cleanText)

        // Parse quiz scores and update concepts
        if (['quiz', 'presser', 'battle', 'forensics', 'code-autopsy', 'scenario-bomb'].includes(mode.id)) {
          const scores = extractQuizScores(result.text)
          scores.forEach(({ score, concept }) => {
            const change = updateConceptStrength(concept, score)
            if (change) {
              eventBus.emit('quiz:score', { concept, score, ...change })
              console.log(`QUIZ: ${concept} ${change.oldStrength}% → ${change.newStrength}% (score: ${score}/10)`)
            }
          })
        }
      }
    } catch (err) {
      console.error('[ChatView] Send failed:', err)
      stopTick(); stopThinking()
      // Reset voice state on API error — prevent stuck PROCESSING
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message || 'Request failed'}. Try again, Sir.`, timestamp: new Date().toISOString() }])
      voice.speak('I encountered an error, Sir. Please try again.', { isVoiceCommand: true })
    }
  }, [sendMessage, mode.id, weekNumber, play, voice, checkIn, onModeSwitch, stopThinking, startThinking])

  const handleSendDirectRef = useRef(handleSendDirect)
  handleSendDirectRef.current = handleSendDirect

  // Decision log — auto-capture decisions from conversation
  const checkDecisionLog = useCallback((userMsg, jarvisMsg) => {
    const decisionKeywords = ['decided', 'decision', 'going with', 'choosing', 'picked', 'committed to', 'approved', 'finalized']
    const combined = (userMsg + ' ' + jarvisMsg).toLowerCase()
    if (decisionKeywords.some(k => combined.includes(k))) {
      try {
        const decisions = JSON.parse(localStorage.getItem('jos-decisions') || '[]')
        decisions.push({
          date: new Date().toISOString(),
          userContext: userMsg.substring(0, 200),
          jarvisResponse: jarvisMsg.substring(0, 200),
          mode: mode?.id || 'chat',
        })
        localStorage.setItem('jos-decisions', JSON.stringify(decisions.slice(-100)))
      } catch { /* ok */ }
    }
  }, [mode?.id])

  // Identity update detection
  const checkIdentityUpdate = (msg) => {
    const match = msg.match(/jarvis,?\s*(?:remember|note|update|save)\s*(?:that)?\s*:?\s*(.+)/i)
    if (match) {
      try {
        const identity = JSON.parse(localStorage.getItem('jos-identity') || '{}')
        if (!identity.notes) identity.notes = ''
        identity.notes += (identity.notes ? ' | ' : '') + match[1].trim() + ` [${new Date().toISOString().split('T')[0]}]`
        localStorage.setItem('jos-identity', JSON.stringify(identity))
        console.log('IDENTITY UPDATE:', match[1].trim())
      } catch { /* ok */ }
    }
  }

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || isStreaming) return
    checkIdentityUpdate(text)
    voice.stopListening()
    voice.setTypedInput()
    handleSendDirect(text)
  }, [input, isStreaming, voice, handleSendDirect])

  const handleMicClick = useCallback(() => {
    if (voice.voiceState === 'SPEAKING') {
      voice.stopSpeaking()
    } else if (voice.voiceState === 'LISTENING') {
      const text = input.trim()
      if (text && voice.silenceCountdown) {
        // Skip countdown, send now
        window.dispatchEvent(new CustomEvent('jarvis-voice-send', { detail: { text } }))
        voice.stopListening()
      } else {
        voice.stopListening()
      }
    } else {
      voice.startListening()
    }
  }, [voice, input])

  useEffect(() => {
    setTimeout(() => {
      const c = messagesContainerRef.current
      if (c) c.scrollTop = c.scrollHeight
    }, 100)
  }, [messages, streamingText])

  useEffect(() => {
    const history = get(`msgs-${mode.id}`) || []
    setMessages(history)
    modeEnterTime.current = Date.now()
    eventBus.emit('mode:enter', { mode: mode.id })
    return () => {
      const dur = Math.round((Date.now() - modeEnterTime.current) / 1000)
      eventBus.emit('mode:exit', { mode: mode.id, durationSeconds: dur })
      voice.stopListening()
      voice.stopSpeaking()
    }
  }, [mode.id])

  useEffect(() => {
    inputRef.current?.focus()
    if (autoMic) setTimeout(() => voice.startListening(), 400)
  }, [])

  useEffect(() => {
    const h = () => { if (voice.voiceState === 'IDLE') voice.startListening() }
    window.addEventListener('jarvis-activate-mic', h)
    return () => window.removeEventListener('jarvis-activate-mic', h)
  }, [voice.voiceState])

  useEffect(() => {
    const onSend = (e) => handleSendDirectRef.current(e.detail.text)
    const onInterrupt = (e) => {
      setInput(e.detail.text)
    }
    const onInterim = (e) => setInput(e.detail.text)
    window.addEventListener('jarvis-voice-send', onSend)
    window.addEventListener('jarvis-voice-interrupt', onInterrupt)
    window.addEventListener('jarvis-voice-interim', onInterim)
    return () => {
      window.removeEventListener('jarvis-voice-send', onSend)
      window.removeEventListener('jarvis-voice-interrupt', onInterrupt)
      window.removeEventListener('jarvis-voice-interim', onInterim)
    }
  }, [])


  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const isOpusTier = lastTier >= 2
  const vs = voice.voiceState

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }} className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-3" style={{ flexShrink: 0 }}>
        <button onClick={onBack} className="flex items-center gap-2 text-text-dim hover:text-cyan transition-colors">
          <ArrowLeft size={18} /><span className="font-mono text-xs tracking-wider">BACK</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">{mode.emoji}</span>
          <span className="font-display text-lg font-bold text-text tracking-wider">{mode.name}</span>
        </div>
        <div className="w-20 text-right">
          {isOpusTier && (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-gold bg-gold/10 border border-gold/30 px-2 py-0.5 rounded">
              <Zap size={10} /> OPUS
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="space-y-3 pr-1" style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px 4px' }}>
        {messages.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center" style={{ height: '100%' }}>
            <div className="text-center">
              <span className="text-4xl mb-3 block">{mode.emoji}</span>
              <p className="font-body text-sm text-text-dim">{mode.description}</p>
              <p className="font-mono text-[10px] text-text-muted mt-2 tracking-wider">TYPE OR SPEAK TO BEGIN</p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i}>
            <MessageBubble message={msg} />
            {msg.role === 'assistant' && <VizSmartCards response={msg.content} mode={mode.id} />}
          </div>
        ))}
        {isStreaming && streamingText && (
          <div className={`rounded-lg p-3 border ${isOpusTier ? 'bg-gold/5 border-gold/20' : 'bg-card border-border'}`}>
            <p className={`font-body text-sm whitespace-pre-wrap ${isOpusTier ? 'text-gold' : 'text-cyan'}`}>
              {streamingText}<span className="typewriter-cursor" />
            </p>
          </div>
        )}
        {isStreaming && !streamingText && (
          <div className="flex items-center gap-2 p-3">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="font-mono text-[10px] text-text-muted tracking-wider">JARVIS IS THINKING...</span>
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="font-mono text-xs text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Voice state indicator */}
      <div style={{ flexShrink: 0 }}>
        {vs === 'LISTENING' && (
          <div className="flex items-center justify-between mb-1.5 mx-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs animate-pulse">&#127908;</span>
              <span className="font-mono text-[10px] text-cyan tracking-wider animate-pulse">
                {voice.isWaitMode ? 'Standing by...' : 'Listening...'}
              </span>
            </div>
            {voice.silenceCountdown && (
              <span className="font-mono text-[10px] text-text-muted tracking-wider">{voice.silenceCountdown}</span>
            )}
          </div>
        )}
        {vs === 'PROCESSING' && (
          <div className="flex items-center gap-1.5 mb-1.5 ml-1">
            <span className="text-xs">&#9203;</span>
            <span className="font-mono text-[10px] text-gold tracking-wider animate-pulse">Thinking...</span>
          </div>
        )}
        {vs === 'SPEAKING' && (
          <div className="flex items-center mb-1.5 mx-1">
            <span className="font-mono text-[10px] text-gold tracking-wider animate-pulse">
              &#128266; Speaking... <span className="text-text-muted">(say "stop" to interrupt)</span>
            </span>
          </div>
        )}
        {checkIn.active && (
          <div className="flex items-center gap-1.5 mb-1.5 ml-1">
            <span className="font-mono text-[10px] text-gold/60 tracking-wider">CHECK-IN: {checkIn.fieldIndex + 1} / {checkIn.totalFields}</span>
          </div>
        )}
      </div>

      {/* Image preview */}
      {pendingImage && (
        <div style={{ flexShrink: 0, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={pendingImage.thumbnail} alt="" style={{ maxHeight: 50, maxWidth: 100, borderRadius: 4, border: '1px solid #0d2137' }} />
          <button onClick={() => setPendingImage(null)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>Remove</button>
        </div>
      )}

      {/* Input bar */}
      <div className="flex gap-2 items-end" style={{ flexShrink: 0 }}>
        <div className="flex-1">
          <input ref={inputRef} type="text" value={input}
            onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={vs === 'LISTENING' ? (voice.isWaitMode ? 'Say "go" to send...' : 'Listening...') : vs === 'PROCESSING' ? 'Processing...' : `Message JARVIS (${mode.name})...`}
            disabled={isStreaming}
            className={`w-full bg-void border rounded-lg px-4 py-3 font-body text-sm text-text placeholder:text-text-muted focus:outline-none transition-all duration-200 disabled:opacity-50 ${
              vs === 'LISTENING' ? 'border-cyan shadow-[0_0_12px_rgba(0,180,216,0.3)]'
              : vs === 'SPEAKING' ? 'border-gold/40' : 'border-border focus:border-cyan'
            }`}
          />
        </div>

        {/* Image upload */}
        <label className="p-3 rounded-lg border border-border text-text-muted hover:border-cyan/40 hover:text-cyan cursor-pointer transition-all">
          <ImageIcon size={18} />
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
            const file = e.target.files?.[0]; if (!file || !file.type.startsWith('image/')) return
            const reader = new FileReader()
            reader.onload = () => setPendingImage({ base64: reader.result.split(',')[1], mediaType: file.type, thumbnail: reader.result })
            reader.readAsDataURL(file); e.target.value = ''
          }} />
        </label>

        {SpeechRecognition && (JSON.parse(localStorage.getItem('jos-settings') || '{}').voiceInput !== false) && (
          <button onClick={handleMicClick}
            className={`p-3 rounded-lg border transition-all duration-200 ${
              vs === 'LISTENING' ? 'bg-cyan/15 border-cyan text-cyan animate-pulse shadow-[0_0_12px_rgba(0,180,216,0.3)]'
              : vs === 'SPEAKING' ? 'bg-gold/10 border-gold/40 text-gold animate-pulse'
              : 'border-border text-text-muted hover:border-cyan/40 hover:text-cyan'
            }`}
            aria-label={vs === 'LISTENING' ? (voice.silenceCountdown ? 'Send now' : 'Stop') : vs === 'SPEAKING' ? 'Stop' : 'Speak'}>
            <Mic size={18} />
          </button>
        )}

        <button onClick={handleSend} disabled={!input.trim() || isStreaming}
          className={`p-3 rounded-lg border transition-all duration-200 ${
            input.trim() && !isStreaming ? 'bg-cyan/10 border-cyan/40 text-cyan hover:bg-cyan/20'
            : 'bg-card border-border text-text-muted cursor-not-allowed'
          }`} aria-label="Send message">
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}

// renderMd imported from src/utils/renderMd.js

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const isOpus = message.tier >= 2
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-cyan/10 border border-cyan/20 rounded-lg px-4 py-2.5">
          <p className="font-body text-sm text-text" dangerouslySetInnerHTML={{ __html: renderMd(message.content) }} />
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start">
      <div className={`max-w-[85%] rounded-lg px-4 py-2.5 border holo-response ${isOpus ? 'glass-card-gold' : 'glass-card'}`}>
        {message.autoUpgraded && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <Zap size={10} className="text-gold" />
            <span className="font-mono text-[9px] text-gold/70 tracking-wider">OPUS — {message.reason}</span>
          </div>
        )}
        <p className={`font-body text-sm leading-relaxed ${isOpus ? 'text-gold' : 'text-text'}`} dangerouslySetInnerHTML={{ __html: renderMd(message.content) }} />
        <span className="font-mono text-[9px] text-text-muted mt-1.5 block">
          {new Date(message.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}
