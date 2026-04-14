// ChatView.jsx — Chat interface for training modes
// Text chat interface for training modes

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Send, Zap, Image as ImageIcon, Mic } from 'lucide-react'
import useAI from '../../hooks/useAI.js'
import useStorage from '../../hooks/useStorage.js'
import useSound from '../../hooks/useSound.js'
import useEventBus from '../../hooks/useEventBus.js'
import { processVoiceCommand } from '../../utils/voiceCommands.js'
import TASKS from '../../data/tasks.js'
import { extractQuizScores, stripQuizTags, updateConceptStrength } from '../../utils/quizScoring.js'
// stripEmotionTags inlined — jarvisVoice.js removed
const stripEmotionTags = (t) => t ? t.replace(/\[\s*(?:warm|clinical|cold|hot|proud|witty|concerned|gentle|urgent|whisper|neutral|serious|dramatic|commanding)\s*\]\s*/gi, '').replace(/\[\w+\]\s*/g, '').trim() : ''
import renderMd from '../../utils/renderMd.js'
import { shouldCompress, getCompressionPrompt, applyCompression } from '../../utils/conversationMemory.js'
import { analyzeSubtext, shouldAnalyze } from '../../utils/subtextAnalyzer.js'
import { getTemporalContext } from '../../utils/temporalAwareness.js'
import { detectPeopleMentions } from '../../utils/peopleMap.js'
import { detectInSessionCrash } from '../../utils/emotionalMemory.js'
import VizSmartCards from '../viz/VizSmartCards.jsx'
import { startAmbient as startOpusAmbient, stopAmbient as stopOpusAmbient } from '../../utils/ambientSound.js'
import { MILESTONE_SPEECHES } from '../../utils/jarvisBehavior.js'
import { classifyStyle, trackResponse } from '../../utils/communicationTracker.js'
import { recordQuizScore } from '../../utils/adaptiveDifficulty.js'
import { checkMicroCelebration, buildTaskContext, buildConceptContext } from '../../utils/microCelebrations.js'
import { recordActivity } from '../../utils/momentumTracker.js'
import { autoDetectDismissal } from '../../utils/selfLearning.js'
import { logInteraction } from '../../utils/auditTrail.js'

export default function ChatView({ mode, weekNumber, onBack, onModeSwitch }) {
  const { sendMessage, isStreaming, streamingText, error } = useAI()
  const { get } = useStorage()
  const { play, startThinking, stopThinking, startThinkingHum } = useSound()
  const eventBus = useEventBus()
  const modeEnterTime = useRef(Date.now())

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [pendingImages, setPendingImages] = useState([])
  const [lastTier, setLastTier] = useState(1)
  const [isThinking, setIsThinking] = useState(false)
  const [isListening, setIsListening] = useState(false)

  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)
  const lastJarvisStyleRef = useRef([])
  const sessionStartIndexRef = useRef(0)
  const recognitionRef = useRef(null)

  const handleSendDirect = useCallback(async (text) => {
    const trimmed = text?.trim() || ''
    if (!trimmed && pendingImages.length === 0) return
    setInput('')

    // Voice commands
    const cmd = processVoiceCommand(trimmed)
    if (cmd) {
      setMessages(prev => [...prev, { role: 'user', content: trimmed, timestamp: new Date().toISOString() }])
      if (cmd.type === 'stop') return
      if (cmd.type === 'shutdown') {
        setMessages(prev => [...prev, { role: 'assistant', content: cmd.response, timestamp: new Date().toISOString() }])
        setTimeout(() => window.dispatchEvent(new CustomEvent('jarvis-request-shutdown')), 2000)
        return
      }
      if (cmd.type === 'checkin') {
        setMessages(prev => [...prev, { role: 'assistant', content: cmd.response, timestamp: new Date().toISOString() }])
        return
      }
      if (cmd.type === 'task') {
        setMessages(prev => [...prev, { role: 'assistant', content: cmd.response, timestamp: new Date().toISOString() }])
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
        setTimeout(() => onModeSwitch(cmd.mode), 1500)
        return
      }
      setMessages(prev => [...prev, { role: 'assistant', content: cmd.response, timestamp: new Date().toISOString() }])
      return
    }

    // Normal API call
    setMessages(prev => [...prev, {
      role: 'user', content: trimmed || 'Sent images', timestamp: new Date().toISOString(),
      images: pendingImages.length > 0 ? pendingImages.map(img => img.thumbnail) : undefined
    }])
    play('send')
    recordActivity('message') // Momentum tracking
    autoDetectDismissal('message-sent', mode.id) // Self-learning: detect advice dismissal

    // Communication tracker: track user engagement with previous JARVIS style
    if (lastJarvisStyleRef.current.length > 0) {
      trackResponse(lastJarvisStyleRef.current, trimmed.length)
    }

    // DISABLED: subtext analyzer leaks raw JSON into chat via shared sendMessage
    // if (shouldAnalyze(trimmed, mode.id)) { ... }

    // Passive people map building
    detectPeopleMentions(trimmed)

    const stopTick = await startThinking()
    try {
      const result = await sendMessage(trimmed || 'Analyse these images.', mode.id, { weekNumber, images: pendingImages })
      setPendingImages([])
      stopTick(); stopThinking()
      if (result) {
        // Opus ambient for Opus-tier responses
        if (result.tier >= 2) startOpusAmbient('opus')

        // Strip quiz score tags + emotion tags for display, keep raw for voice
        const quizClean = stripQuizTags(result.text)
        const displayText = stripEmotionTags(quizClean)
        setMessages(prev => [...prev, {
          role: 'assistant', content: displayText, timestamp: new Date().toISOString(),
          model: result.model, tier: result.tier, autoUpgraded: result.autoUpgraded, reason: result.reason,
        }])
        setLastTier(result.tier)
        play('receive')
        // VOICE-FIRST: speak through Gemini Charon
        window.dispatchEvent(new CustomEvent('jarvis-speak', { detail: { text: displayText } }))
        // Communication tracker: classify JARVIS response style
        lastJarvisStyleRef.current = classifyStyle(displayText)

        // Audit trail: log JARVIS response
        logInteraction({ type: 'response', content: displayText.slice(0, 200), mode: mode.id })

        // Decision log — auto-capture decisions
        checkDecisionLog(trimmed, displayText)

        // Parse quiz scores and update concepts
        if (['quiz', 'presser', 'battle', 'forensics', 'code-autopsy', 'scenario-bomb'].includes(mode.id)) {
          const scores = extractQuizScores(result.text)
          scores.forEach(({ score, concept }) => {
            const change = updateConceptStrength(concept, score)
            if (change) {
              eventBus.emit('quiz:score', { concept, score, ...change })
              console.log(`QUIZ: ${concept} ${change.oldStrength}% → ${change.newStrength}% (score: ${score}/10)`)

              // Adaptive difficulty: record score for concept
              recordQuizScore(concept, score)
              recordActivity('concept')

              // Micro-celebration: concept strength milestones
              const celebration = checkMicroCelebration('concept:strength',
                buildConceptContext(concept, change.oldStrength, change.newStrength))
              if (celebration) {
                play(celebration.sound)
                logInteraction({ type: 'celebration', content: celebration.message, mode: mode.id })
              }

              // Micro-celebration: quiz score
              const quizCeleb = checkMicroCelebration('quiz:score', { score, improvement: score - (change.oldStrength > 60 ? 7 : 4) })
              if (quizCeleb && !celebration) {
                play(quizCeleb.sound)
              }
            }
          })
        }

        // RSD Shield — detect in-session emotional crash (current session only)
        const sessionMessages = messages.slice(sessionStartIndexRef.current)
        const crash = detectInSessionCrash(sessionMessages)
        if (crash) {
          setMessages(prev => [...prev, { role: 'assistant', content: crash.text, timestamp: new Date().toISOString(), isSupport: true }])
          window.dispatchEvent(new CustomEvent('jarvis-speak', { detail: { text: crash.text } }))
        }

        // Trigger conversation compression if needed (fire-and-forget)
        if (shouldCompress(mode.id)) {
          const compPrompt = getCompressionPrompt(mode.id)
          if (compPrompt) {
            sendMessage(compPrompt, 'chat', {}).then(r => {
              if (r?.text) applyCompression(mode.id, r.text)
            }).catch(() => {})
          }
        }
      }
    } catch (err) {
      console.error('[ChatView] Send failed:', err)
      stopTick(); stopThinking()
      // Reset voice state on API error — prevent stuck PROCESSING
      const errText = `Error. ${err.message || 'Request failed'}. Try again, Sir.`
      setMessages(prev => [...prev, { role: 'assistant', content: errText, timestamp: new Date().toISOString() }])
      window.dispatchEvent(new CustomEvent('jarvis-speak', { detail: { text: errText } }))
    }
  }, [sendMessage, mode.id, weekNumber, play, onModeSwitch, stopThinking, startThinking, pendingImages])

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
    if ((!text && pendingImages.length === 0) || isStreaming) return
    if (text) checkIdentityUpdate(text)
    setInput('')
    handleSendDirect(text)
  }, [input, isStreaming, handleSendDirect, pendingImages])


  useEffect(() => {
    setTimeout(() => {
      const c = messagesContainerRef.current
      if (c) c.scrollTop = c.scrollHeight
    }, 100)
  }, [messages, streamingText])

  useEffect(() => {
    const history = get(`msgs-${mode.id}`) || []
    setMessages(history)
    sessionStartIndexRef.current = history.length // Mark where current session starts
    modeEnterTime.current = Date.now()
    eventBus.emit('mode:enter', { mode: mode.id })
    return () => {
      const dur = Math.round((Date.now() - modeEnterTime.current) / 1000)
      eventBus.emit('mode:exit', { mode: mode.id, durationSeconds: dur })
    }
  }, [mode.id])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Web Speech API for voice input in training modes
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-IN'
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript
      setInput(text)
      setIsListening(false)
      handleSendDirectRef.current(text)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    return () => { try { recognition.abort() } catch {} }
  }, [])

  const toggleMic = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      recognitionRef.current?.start()
      setIsListening(true)
    }
  }, [isListening])

  // Layer 8: Voice activation/deactivation sounds + thinking pause hum
  // Layer 10: Stop opus ambient when JARVIS finishes speaking
  // Behavioral engine: ThinkingIndicator + milestone speeches
  useEffect(() => {
    let stopHum = null
    const onPlaySound = (e) => { play(e.detail?.sound) }
    const onThinkingPause = async (e) => {
      setIsThinking(true)
      if (startThinkingHum) {
        stopHum = await startThinkingHum()
        const dur = e.detail?.durationMs || 800
        setTimeout(() => {
          setIsThinking(false)
          if (stopHum) { stopHum(); stopHum = null }
        }, dur)
      }
    }
    window.addEventListener('jarvis-play-sound', onPlaySound)
    window.addEventListener('jarvis-thinking-pause', onThinkingPause)
    return () => {
      window.removeEventListener('jarvis-play-sound', onPlaySound)
      window.removeEventListener('jarvis-thinking-pause', onThinkingPause)
      if (stopHum) stopHum()
      stopOpusAmbient()
    }
  }, [play, startThinkingHum])

  // Milestone speech handler — triggered via event bus
  useEffect(() => {
    const handleMilestone = (data) => {
      const key = data?.milestoneKey
      const speech = key && MILESTONE_SPEECHES[key]
      if (!speech) return
      console.log('[MILESTONE] Playing speech:', key)
      // Display milestone text (stripped of tags) + speak with voice
      const displayText = stripEmotionTags(speech.text)
      setMessages(prev => [...prev, {
        role: 'assistant', content: displayText, timestamp: new Date().toISOString(),
        isMilestone: true
      }])
      // VOICE-FIRST: speak milestone through Gemini Charon
      window.dispatchEvent(new CustomEvent('jarvis-speak', { detail: { text: displayText } }))
    }
    const unsub = eventBus.subscribe('milestone:speech', handleMilestone)
    return () => unsub()
  }, [eventBus])


  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const isOpusTier = lastTier >= 2

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
              {stripEmotionTags(streamingText)}<span className="typewriter-cursor" />
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

      {/* Status area */}
      <div style={{ flexShrink: 0 }} />

      {/* Image previews */}
      {pendingImages.length > 0 && (
        <div style={{ flexShrink: 0, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {pendingImages.map((img, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img src={img.thumbnail} alt="" style={{ maxHeight: 50, maxWidth: 80, borderRadius: 4, border: '1px solid #0d2137' }} />
              <button onClick={() => setPendingImages(prev => prev.filter((_, j) => j !== i))}
                style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
          ))}
          <button onClick={() => setPendingImages([])} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, fontFamily: 'Share Tech Mono' }}>Clear all</button>
        </div>
      )}

      {/* Input bar */}
      <div className="flex gap-2 items-end" style={{ flexShrink: 0 }}>
        <div className="flex-1">
          <input ref={inputRef} type="text" value={input}
            onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={`Message JARVIS (${mode.name})...`}
            disabled={isStreaming}
            className="w-full bg-void border border-border rounded-lg px-4 py-3 font-body text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-cyan transition-all duration-200 disabled:opacity-50"
          />
        </div>

        {/* Image upload */}
        <label className="p-3 rounded-lg border border-border text-text-muted hover:border-cyan/40 hover:text-cyan cursor-pointer transition-all">
          <ImageIcon size={18} />
          <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => {
            const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'))
            if (files.length === 0) return
            files.forEach(file => {
              const reader = new FileReader()
              reader.onload = () => {
                setPendingImages(prev => [...prev, {
                  base64: reader.result.split(',')[1],
                  mediaType: file.type,
                  thumbnail: reader.result,
                  name: file.name
                }])
              }
              reader.readAsDataURL(file)
            })
            e.target.value = ''
          }} />
        </label>

        {/* Voice input */}
        <button onClick={toggleMic} disabled={isStreaming}
          className={`p-3 rounded-lg border transition-all duration-200 ${
            isListening ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
            : 'border-border text-text-muted hover:border-cyan/30 hover:text-cyan'
          }`} aria-label="Voice input">
          <Mic size={18} />
        </button>

        <button onClick={handleSend} disabled={(!input.trim() && pendingImages.length === 0) || isStreaming}
          className={`p-3 rounded-lg border transition-all duration-200 ${
            (input.trim() || pendingImages.length > 0) && !isStreaming ? 'bg-cyan/10 border-cyan/40 text-cyan hover:bg-cyan/20'
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
  const isMilestone = message.isMilestone
  // Safety strip: remove any emotion tags that leaked into stored content
  const displayContent = stripEmotionTags(message.content || '')
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-cyan/10 border border-cyan/20 rounded-lg px-4 py-2.5">
          <p className="font-body text-sm text-text" dangerouslySetInnerHTML={{ __html: renderMd(displayContent) }} />
          {message.images && (
            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
              {message.images.map((src, i) => (
                <img key={i} src={src} alt="" style={{ maxHeight: 60, maxWidth: 100, borderRadius: 4, border: '1px solid rgba(0,180,216,0.2)' }} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start">
      <div className={`max-w-[85%] rounded-lg px-4 py-2.5 border holo-response ${
        isMilestone ? 'glass-card-gold border-gold/30 bg-gold/5' : isOpus ? 'glass-card-gold' : 'glass-card'
      }`}>
        {message.autoUpgraded && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <Zap size={10} className="text-gold" />
            <span className="font-mono text-[9px] text-gold/70 tracking-wider">OPUS — {message.reason}</span>
          </div>
        )}
        {isMilestone && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-gold text-xs">&#9733;</span>
            <span className="font-mono text-[9px] text-gold tracking-wider">MILESTONE</span>
          </div>
        )}
        <p className={`font-body text-sm leading-relaxed ${isMilestone ? 'text-gold' : isOpus ? 'text-gold' : 'text-text'}`} dangerouslySetInnerHTML={{ __html: renderMd(displayContent) }} />
        <span className="font-mono text-[9px] text-text-muted mt-1.5 block">
          {new Date(message.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}
