// VoiceDebrief.jsx — Voice-first check-in: talk, extract, confirm, save
// WHY: Talking is faster than tapping 14 fields. JARVIS extracts structured data from speech.

import { useState, useCallback } from 'react'
import { Mic, Check, RotateCcw } from 'lucide-react'
import useAI from '../../hooks/useAI.js'
import useStorage from '../../hooks/useStorage.js'
import useSound from '../../hooks/useSound.js'
import useEventBus from '../../hooks/useEventBus.js'
import useJarvisVoice from '../../hooks/useJarvisVoice.js'
// Voice removed — Gemini Live handles speech
import { getDaySummary } from '../../hooks/useAutoCapture.js'
import { saveConcern, savePromise } from '../../utils/emotionalMemory.js'
import { bridgeCheckinToBiometrics } from '../../utils/gadgetSchemas.js'

const MOOD_EMOJIS = [
  { emoji: '😫', label: 'Rough', value: 1 },
  { emoji: '😕', label: 'Low', value: 2 },
  { emoji: '😐', label: 'Okay', value: 3 },
  { emoji: '🙂', label: 'Good', value: 4 },
  { emoji: '😎', label: 'Great', value: 5 },
]

function buildGreeting() {
  const summary = getDaySummary()
  if (!summary) return 'Sir. Tell me — how was today?'
  const parts = []
  if (summary.sessionHours > 0) parts.push(`${summary.sessionHours}h active today`)
  if (summary.tasksCompleted > 0) parts.push(`${summary.tasksCompleted} task${summary.tasksCompleted > 1 ? 's' : ''} completed`)
  if (summary.modesUsed.length > 0) parts.push(`${summary.modesUsed.join(', ')} mode${summary.modesUsed.length > 1 ? 's' : ''}`)
  return parts.length > 0
    ? `Sir. ${parts.join('. ')}. Tell me — how was today?`
    : 'Sir. Tell me — how was today?'
}

export default function VoiceDebrief({ onComplete }) {
  const { sendMessage } = useAI()
  const { update } = useStorage()
  const { play } = useSound()
  const eventBus = useEventBus()
  const voice = useJarvisVoice()

  const [phase, setPhase] = useState('ready') // ready | recording | extracting | confirm | saved
  const [transcript, setTranscript] = useState('')
  const [extracted, setExtracted] = useState(null)
  const [quickEnergy, setQuickEnergy] = useState(3)

  const today = new Date().toISOString().split('T')[0]
  const greeting = buildGreeting()

  // Start voice recording via Web Speech API
  const handleStartRecording = useCallback(() => {
    setPhase('recording')
    voice.startListening()

    const onSend = (e) => {
      const text = e.detail.text
      setTranscript(text)
      setPhase('extracting')
      window.removeEventListener('jarvis-voice-send', onSend)
      extractFromTranscript(text)
    }
    window.addEventListener('jarvis-voice-send', onSend)
  }, [voice])

  const extractFromTranscript = useCallback(async (text) => {
    try {
      const result = await sendMessage(
        `Extract from this voice journal. The person speaks Hinglish (Hindi+English mix).
Extract these fields as JSON:
{
  "confidence": 1-5, "focus": 1-5, "motivation": 1-5, "energy": 1-5,
  "sleep": 1-5 or null, "mood": "single word",
  "wins": ["list"], "struggles": ["list"], "learned": "string or null",
  "coffee": number or 0, "medication": true/false/null, "lunch": true/false/null,
  "concerns": ["worries"], "promises": ["commitments"],
  "insights": "string or null", "nextDay": "string or null"
}
Only include fields clearly mentioned or strongly implied. Use null for anything not mentioned.
Return ONLY valid JSON, nothing else.

Transcript: "${text}"`,
        'chat', {}
      )

      if (result?.text) {
        try {
          const jsonMatch = result.text.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0])
            setExtracted(data)
            setPhase('confirm')
            return
          }
        } catch { /* parse failed */ }
      }
      // Fallback — couldn't extract
      setExtracted({ confidence: 3, mood: 'unknown', _extractionFailed: true })
      setPhase('confirm')
    } catch {
      setExtracted({ confidence: 3, mood: 'unknown', _extractionFailed: true })
      setPhase('confirm')
    }
  }, [sendMessage])

  // Quick Tap — minimal input for zero-energy days
  const handleQuickTap = useCallback((moodValue) => {
    const entry = {
      confidence: moodValue,
      energy: quickEnergy,
      mood: MOOD_EMOJIS.find(e => e.value === moodValue)?.label || 'unknown',
      date: today,
      timestamp: new Date().toISOString(),
      source: 'quick-tap',
    }
    update('feelings', prev => [...(prev || []).filter(f => f.date !== today), entry])
    eventBus.emit('checkin:submit', entry)
    bridgeCheckinToBiometrics(entry)
    play('check')
    setPhase('saved')
    window.dispatchEvent(new CustomEvent('jarvis-speak', { detail: { text: 'Logged, Sir.' } }))
    setTimeout(() => onComplete?.(), 1500)
  }, [quickEnergy, today, update, eventBus, play, onComplete])

  // Adjust extracted value
  const adjustValue = (key, value) => {
    setExtracted(prev => ({ ...prev, [key]: value }))
  }

  // Save confirmed extraction
  const handleSave = useCallback(() => {
    if (!extracted) return
    const entry = {
      confidence: extracted.confidence || 3,
      focus: extracted.focus || null,
      motivation: extracted.motivation || null,
      energy: extracted.energy || quickEnergy,
      sleep: extracted.sleep || null,
      mood: extracted.mood || '',
      coffee: extracted.coffee || 0,
      meds: extracted.medication,
      lunch: extracted.lunch,
      learned: extracted.learned || '',
      struggled: (extracted.struggles || []).join(', '),
      excited: (extracted.wins || []).join(', '),
      journal: transcript,
      date: today,
      timestamp: new Date().toISOString(),
      source: 'voice-debrief',
    }

    update('feelings', prev => [...(prev || []).filter(f => f.date !== today), entry])
    update('core', prev => ({
      ...prev,
      totalCheckIns: (prev?.totalCheckIns || 0) + 1,
      consecutiveSkips: 0,
      consecutiveCompletions: (prev?.consecutiveCompletions || 0) + 1,
    }))

    // Save concerns and promises to emotional memory
    if (extracted.concerns) extracted.concerns.forEach(c => saveConcern(c))
    if (extracted.promises) extracted.promises.forEach(p => savePromise(p))

    eventBus.emit('checkin:submit', entry)
    bridgeCheckinToBiometrics(entry)
    play('check')
    setPhase('saved')

    const observation = extracted.mood ? `Mood: ${extracted.mood}.` : ''
    window.dispatchEvent(new CustomEvent('jarvis-speak', { detail: { text: `Logged, Sir. ${observation}` } }))
    setTimeout(() => onComplete?.(), 2000)
  }, [extracted, quickEnergy, transcript, today, update, eventBus, play, onComplete])

  // --- RENDER ---
  return (
    <div className="glass-card p-4">
      <div className="hud-panel-inner">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg font-bold text-cyan tracking-wider uppercase neon-heading">
            Evening Debrief
          </h3>
          <span className="font-mono text-[10px] text-text-muted">
            {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Greeting */}
        {phase === 'ready' && (
          <>
            <p className="font-body text-sm text-text leading-relaxed mb-4">{greeting}</p>

            {/* Mic button */}
            <div className="flex flex-col items-center gap-4 mb-6">
              <button onClick={handleStartRecording}
                className="w-20 h-20 rounded-full border-2 border-cyan flex items-center justify-center
                  bg-cyan/10 hover:bg-cyan/20 transition-all shadow-[0_0_20px_rgba(0,180,216,0.2)]
                  hover:shadow-[0_0_30px_rgba(0,180,216,0.4)]">
                <Mic size={32} className="text-cyan" />
              </button>
              <p className="font-mono text-[10px] text-text-muted tracking-wider">TAP TO TALK</p>
            </div>

            {/* Quick Tap fallback */}
            <div className="border-t border-border pt-3">
              <p className="font-mono text-[9px] text-text-muted tracking-wider text-center mb-2">OR QUICK TAP</p>
              <div className="flex justify-center gap-2 mb-2">
                {MOOD_EMOJIS.map(m => (
                  <button key={m.value} onClick={() => handleQuickTap(m.value)}
                    className="text-2xl hover:scale-125 transition-transform" title={m.label}>
                    {m.emoji}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 justify-center">
                <span className="font-mono text-[9px] text-text-muted">Energy</span>
                <input type="range" min={1} max={5} step={1} value={quickEnergy}
                  onChange={e => setQuickEnergy(parseInt(e.target.value))}
                  className="w-32 accent-cyan h-1" />
                <span className="font-mono text-[10px] text-cyan">{quickEnergy}/5</span>
              </div>
            </div>
          </>
        )}

        {/* Recording */}
        {phase === 'recording' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full border-2 border-cyan bg-cyan/15 animate-pulse mx-auto mb-3
              flex items-center justify-center shadow-[0_0_25px_rgba(0,180,216,0.3)]">
              <Mic size={28} className="text-cyan" />
            </div>
            <p className="font-mono text-xs text-cyan tracking-wider animate-pulse">LISTENING...</p>
            {voice.silenceCountdown && (
              <p className="font-mono text-[10px] text-text-muted mt-2">{voice.silenceCountdown}</p>
            )}
          </div>
        )}

        {/* Extracting */}
        {phase === 'extracting' && (
          <div className="text-center py-6">
            <div className="flex gap-1 justify-center mb-3">
              <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="font-mono text-[10px] text-gold tracking-wider">EXTRACTING DATA FROM SPEECH...</p>
            {transcript && (
              <p className="font-body text-xs text-text-dim mt-3 max-w-sm mx-auto leading-relaxed">
                "{transcript.slice(0, 150)}{transcript.length > 150 ? '...' : ''}"
              </p>
            )}
          </div>
        )}

        {/* Confirmation cards */}
        {phase === 'confirm' && extracted && (
          <>
            <p className="font-mono text-[10px] text-text-muted tracking-wider mb-3">EXTRACTED — TAP TO ADJUST</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { key: 'confidence', label: 'Confidence' },
                { key: 'focus', label: 'Focus' },
                { key: 'energy', label: 'Energy' },
                { key: 'motivation', label: 'Motivation' },
                { key: 'sleep', label: 'Sleep' },
              ].map(({ key, label }) => {
                const val = extracted[key]
                if (val === null || val === undefined) return null
                return (
                  <div key={key} className="glass-card p-2 text-center cursor-pointer hover:border-cyan/40 transition-all"
                    onClick={() => adjustValue(key, val >= 5 ? 1 : (val || 0) + 1)}>
                    <p className="font-mono text-[8px] text-text-muted">{label}</p>
                    <p className="font-display text-lg font-bold text-cyan">{val}</p>
                  </div>
                )
              })}
              {extracted.mood && (
                <div className="glass-card p-2 text-center">
                  <p className="font-mono text-[8px] text-text-muted">Mood</p>
                  <p className="font-display text-sm font-bold text-text">{extracted.mood}</p>
                </div>
              )}
            </div>

            {/* Wins & struggles */}
            {extracted.wins?.length > 0 && (
              <div className="mb-2">
                {extracted.wins.map((w, i) => (
                  <p key={i} className="font-body text-xs text-text-dim"><span className="text-green-400">✅</span> {w}</p>
                ))}
              </div>
            )}
            {extracted.concerns?.length > 0 && (
              <div className="mb-2">
                {extracted.concerns.map((c, i) => (
                  <p key={i} className="font-body text-xs text-text-dim"><span className="text-amber-400">⚠️</span> {c}</p>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={handleSave}
                className="flex-1 py-2 rounded border border-cyan/40 text-cyan font-display text-sm font-bold
                  tracking-wider hover:bg-cyan/10 transition-all flex items-center justify-center gap-2">
                <Check size={16} /> SAVE DEBRIEF
              </button>
              <button onClick={() => { setPhase('ready'); setTranscript(''); setExtracted(null) }}
                className="px-3 py-2 rounded border border-border text-text-muted hover:border-cyan/30 transition-all">
                <RotateCcw size={16} />
              </button>
            </div>
          </>
        )}

        {/* Saved */}
        {phase === 'saved' && (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full border-2 border-green-400 bg-green-400/15 mx-auto mb-3
              flex items-center justify-center">
              <Check size={24} className="text-green-400" />
            </div>
            <p className="font-display text-sm font-bold text-green-400 tracking-wider">DEBRIEF LOGGED</p>
          </div>
        )}
      </div>
    </div>
  )
}
