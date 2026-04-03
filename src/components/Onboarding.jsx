// Onboarding.jsx — One-time voice interview before first boot
// WHY: Seeds the 3-source intelligence system (Bible Section 5). JARVIS asks 19
// questions across 5 sections, user answers via mic. One Opus call extracts
// structured data saved to jos-onboarding. Runs ONCE ever.

import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, SkipForward } from 'lucide-react'
import useJarvisVoice from '../hooks/useJarvisVoice.js'
import { speakWithFallback } from '../utils/elevenLabsSpeak.js'

const SECTIONS = [
  {
    name: 'Energy & Body', questions: [
      'What time do you typically feel most sharp and focused, Sir?',
      'And when does your energy tend to crash during the day?',
      'How many hours of sleep do you average?',
      'Caffeine intake — how many cups of chai or coffee per day?',
    ]
  },
  {
    name: 'Work Patterns', questions: [
      'Do you work better in long deep sessions or short intense sprints?',
      'What typically breaks your focus when you are working?',
      'When you are stuck on a problem, what do you usually do?',
      'Do you prefer background music, silence, or ambient noise while working?',
    ]
  },
  {
    name: 'Psychology', questions: [
      'What genuinely excites you about building AI products?',
      'What scares you most about this career transition?',
      'When you have quit something in the past, what was usually the trigger?',
      'Describe what success looks like for you 3 months from now.',
    ]
  },
  {
    name: 'ADHD Specific', questions: [
      'What time do you take your medication, and how long does it typically last?',
      'What does it feel like when your medication wears off?',
      'What types of tasks do you tend to avoid or procrastinate on?',
      'What triggers hyperfocus for you — when you cannot stop working?',
    ]
  },
  {
    name: 'Relationships', questions: [
      'Who in your life supports your career goals? Nidhi, friends, family?',
      'Do you work better completely alone, or with someone nearby?',
      'Who can you call when you are having a rough day?',
    ]
  },
]

const TOTAL_QUESTIONS = SECTIONS.reduce((sum, s) => sum + s.questions.length, 0)
const ACKS = ['Noted, Sir.', 'Understood.', 'Very good.', "That's helpful, Sir.", 'Acknowledged.']

function speakBrowserAck(text) {
  const synth = window.speechSynthesis
  if (!synth) return
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  let v = window._jarvisVoice
  if (!v) {
    const voices = synth.getVoices()
    v = voices.find(x => x.lang === 'en-GB') || voices.find(x => x.lang.startsWith('en')) || voices[0]
    window._jarvisVoice = v
  }
  if (v) u.voice = v
  u.rate = 1.1; u.pitch = 0.95
  synth.speak(u)
}

export default function Onboarding({ onComplete }) {
  const voice = useJarvisVoice()

  const [sectionIdx, setSectionIdx] = useState(0)
  const [questionIdx, setQuestionIdx] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [answers, setAnswers] = useState([]) // flat array of { section, question, answer }
  const [phase, setPhase] = useState('intro') // intro | asking | listening | processing | complete
  const [textInput, setTextInput] = useState('')
  const [showTextFallback, setShowTextFallback] = useState(false)
  const [sectionTransition, setSectionTransition] = useState(null)

  const lastAckIdx = useRef(-1)
  const typewriterRef = useRef(null)
  const fallbackTimerRef = useRef(null)
  const globalQuestionNum = useRef(0)

  // Cleanup

  // Listen for voice send events
  // Start intro after mount

  const typeText = useCallback((text, onDone) => {
    if (typewriterRef.current) clearInterval(typewriterRef.current)
    let i = 0
    setDisplayText('')
    typewriterRef.current = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1))
        i++
      } else {
        clearInterval(typewriterRef.current)
        typewriterRef.current = null
        onDone?.()
      }
    }, 12)
  }, [])

  const startIntro = useCallback(async () => {
    const intro = 'Good day, Sir. I am JARVIS. Before we begin, I need approximately 10 minutes to calibrate to your patterns. I will ask 19 questions across 5 sections. Speak naturally — there are no wrong answers.'
    typeText(intro, () => {
      setTimeout(() => showSectionTransition(0), 1000)
    })
    await speakWithFallback(intro)
  }, [typeText])

  const showSectionTransition = useCallback((idx) => {
    setSectionTransition(SECTIONS[idx].name)
    setTimeout(() => {
      setSectionTransition(null)
      setSectionIdx(idx)
      setQuestionIdx(0)
      askQuestion(idx, 0)
    }, 1500)
  }, [])

  const askQuestion = useCallback(async (secIdx, qIdx) => {
    const section = SECTIONS[secIdx]
    if (!section || qIdx >= section.questions.length) return

    globalQuestionNum.current++
    setPhase('asking')
    setShowTextFallback(false)
    const question = section.questions[qIdx]

    typeText(question, () => {
      // After typewriter + speech, activate mic
      setPhase('listening')
      setTimeout(() => voice.startListening(), 300)
      // 20s fallback timer — show text input if no speech
      fallbackTimerRef.current = setTimeout(() => {
        setShowTextFallback(true)
      }, 20000)
    })

    await speakWithFallback(question)
  }, [typeText, voice])

  const handleAnswer = useCallback((answerText) => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    setShowTextFallback(false)
    voice.stopListening()

    const section = SECTIONS[sectionIdx]
    const question = section.questions[questionIdx]

    setAnswers(prev => [...prev, {
      section: section.name,
      question,
      answer: answerText || null,
    }])

    // Brief acknowledgment (rotate, never repeat consecutively)
    let ackIdx = Math.floor(Math.random() * ACKS.length)
    while (ackIdx === lastAckIdx.current) ackIdx = Math.floor(Math.random() * ACKS.length)
    lastAckIdx.current = ackIdx
    speakBrowserAck(ACKS[ackIdx])

    // Next question after 500ms
    setTimeout(() => advanceToNext(), 800)
  }, [sectionIdx, questionIdx, voice])

  const handleSkip = useCallback(() => {
    handleAnswer(null)
  }, [handleAnswer])

  const handleTextSubmit = useCallback((e) => {
    e.preventDefault()
    const text = textInput.trim()
    if (text) {
      setTextInput('')
      handleAnswer(text)
    }
  }, [textInput, handleAnswer])

  const advanceToNext = useCallback(() => {
    const section = SECTIONS[sectionIdx]
    const nextQ = questionIdx + 1

    if (nextQ < section.questions.length) {
      setQuestionIdx(nextQ)
      askQuestion(sectionIdx, nextQ)
    } else {
      // Next section
      const nextS = sectionIdx + 1
      if (nextS < SECTIONS.length) {
        showSectionTransition(nextS)
      } else {
        // All done — process data
        processOnboardingData()
      }
    }
  }, [sectionIdx, questionIdx, askQuestion, showSectionTransition])

  const processOnboardingData = useCallback(async () => {
    setPhase('processing')
    setDisplayText('Processing your responses...')

    // Build Q&A list for Opus extraction
    const qaText = answers.map((a, i) =>
      `${i + 1}. Q: ${a.question}\n   A: ${a.answer || '(skipped)'}`
    ).join('\n')

    const extractionPrompt = `You are processing onboarding interview answers for JARVIS OS. Extract structured data from these raw answers. Return ONLY valid JSON, no markdown, no explanation.

Structure:
{
  "energy": { "peakHours": "time range", "crashHours": "time range", "sleepHours": number, "caffeinePerDay": number },
  "work": { "style": "deep-sessions"|"short-sprints"|"mixed", "focusBreakers": ["array"], "stuckBehavior": "description", "audioPreference": "music"|"silence"|"ambient"|"variable" },
  "psychology": { "excitements": ["array"], "fears": ["array"], "quitTriggers": ["array"], "threeMonthVision": "description" },
  "adhd": { "medicationTime": "time string", "medicationDuration": "X hours", "wornOffEffects": ["array"], "avoidedTasks": ["array"], "hyperfocusTriggers": ["array"] },
  "relationships": { "supportNetwork": ["names/roles"], "workPreference": "alone"|"nearby"|"variable", "supportContact": "name/description" },
  "completedAt": "${new Date().toISOString()}"
}`

    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: extractionPrompt,
          messages: [{ role: 'user', content: qaText }],
        }),
      })

      let structured = null
      if (response.ok) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullText = ''
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const data = trimmed.slice(5).trim()
            if (!data || data === '[DONE]') continue
            try {
              const event = JSON.parse(data)
              if (event.type === 'content_block_delta' && event.delta?.text) fullText += event.delta.text
            } catch { /* skip */ }
          }
        }

        // Parse JSON from response
        try {
          const jsonMatch = fullText.match(/\{[\s\S]*\}/)
          if (jsonMatch) structured = JSON.parse(jsonMatch[0])
        } catch { /* fallback below */ }
      }

      // Fallback: save raw answers if extraction fails
      if (!structured) {
        structured = {
          rawAnswers: answers,
          completedAt: new Date().toISOString(),
          extractionFailed: true,
        }
      }

      // Save to localStorage — PERMANENT
      localStorage.setItem('jos-onboarding', JSON.stringify(structured))
      console.log('ONBOARDING: saved to jos-onboarding')

      // Initialize jos-core with correct startDate so Day 1 is today
      try {
        const existing = JSON.parse(localStorage.getItem('jos-core') || '{}')
        if (!existing.startDate) {
          existing.startDate = new Date().toISOString()
          existing.totalCheckIns = 0
          existing.streak = 0
          existing.rank = 'Recruit'
          existing.completedTasks = []
          existing.energy = 3
          localStorage.setItem('jos-core', JSON.stringify(existing))
          console.log('ONBOARDING: initialized jos-core with startDate')
        }
      } catch { /* ok */ }

      // Completion cinematic
      showCompletion()
    } catch (err) {
      console.error('ONBOARDING: extraction failed:', err)
      // Save raw answers as fallback
      const fallback = { rawAnswers: answers, completedAt: new Date().toISOString(), extractionFailed: true }
      localStorage.setItem('jos-onboarding', JSON.stringify(fallback))
      // Initialize jos-core in fallback path too
      try {
        const existing = JSON.parse(localStorage.getItem('jos-core') || '{}')
        if (!existing.startDate) {
          existing.startDate = new Date().toISOString()
          existing.totalCheckIns = 0
          existing.streak = 0
          existing.rank = 'Recruit'
          existing.completedTasks = []
          existing.energy = 3
          localStorage.setItem('jos-core', JSON.stringify(existing))
        }
      } catch { /* ok */ }
      showCompletion()
    }
  }, [answers])

  const showCompletion = useCallback(async () => {
    setPhase('complete')
    const msg = 'Initial calibration complete, Sir. I now have a foundational understanding of your patterns, preferences, and objectives. Shall we begin?'
    typeText(msg)
    await speakWithFallback(msg)
    setTimeout(() => onComplete(), 3000)
  }, [onComplete, typeText])

  useEffect(() => {
    return () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current)
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
      voice.stopListening()
      voice.stopSpeaking()
    }
  }, [])

  useEffect(() => {
    const onSend = (e) => {
      if (phase === 'listening') handleAnswer(e.detail.text)
    }
    window.addEventListener('jarvis-voice-send', onSend)
    return () => window.removeEventListener('jarvis-voice-send', onSend)
  }, [phase, sectionIdx, questionIdx])

  useEffect(() => {
    const timer = setTimeout(() => startIntro(), 800)
    return () => clearTimeout(timer)
  }, [])


  // Calculate progress
  let questionsSoFar = 0
  for (let s = 0; s < sectionIdx; s++) questionsSoFar += SECTIONS[s].questions.length
  questionsSoFar += questionIdx + 1
  const currentSection = SECTIONS[sectionIdx]

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ backgroundColor: '#020a13' }}>

      {/* Title */}
      <div className="text-center mb-8" style={{ flexShrink: 0 }}>
        <h1 className="font-display text-2xl font-bold tracking-widest"
          style={{ color: '#00b4d8', textShadow: '0 0 20px rgba(0,180,216,0.3)' }}>
          JARVIS OS
        </h1>
        <p className="font-mono text-xs tracking-[0.3em] mt-1" style={{ color: '#5a7a94' }}>
          INITIAL CALIBRATION
        </p>
      </div>

      {/* Section transition */}
      {sectionTransition && (
        <div className="absolute inset-0 flex items-center justify-center z-10"
          style={{ backgroundColor: 'rgba(2,10,19,0.9)' }}>
          <div className="text-center">
            <div className="h-px w-48 mx-auto mb-4" style={{ background: 'linear-gradient(90deg, transparent, #00f0ff, transparent)' }} />
            <p className="font-display text-lg font-bold tracking-wider" style={{ color: '#d4a853' }}>
              {sectionTransition.toUpperCase()}
            </p>
            <div className="h-px w-48 mx-auto mt-4" style={{ background: 'linear-gradient(90deg, transparent, #00f0ff, transparent)' }} />
          </div>
        </div>
      )}

      {/* Question text */}
      <div className="max-w-lg px-6 text-center" style={{ minHeight: 80 }}>
        {phase === 'complete' ? (
          <p className="font-display text-xl font-bold tracking-wider" style={{ color: '#d4a853' }}>
            {displayText}
          </p>
        ) : (
          <p className="font-body text-lg leading-relaxed" style={{ color: '#d0e8f8' }}>
            {displayText}
            {(phase === 'asking' || phase === 'intro') && <span className="animate-pulse" style={{ color: '#00f0ff' }}>|</span>}
          </p>
        )}
      </div>

      {/* Progress */}
      {phase !== 'intro' && phase !== 'complete' && (
        <div className="mt-6">
          <p className="font-mono text-[10px] tracking-widest" style={{ color: '#5a7a94' }}>
            SECTION {sectionIdx + 1}/{SECTIONS.length} · QUESTION {questionIdx + 1}/{currentSection?.questions.length || 0}
          </p>
          <div className="w-48 h-1 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: '#0d2137' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(questionsSoFar / TOTAL_QUESTIONS) * 100}%`, backgroundColor: '#00b4d8' }} />
          </div>
        </div>
      )}

      {/* Processing */}
      {phase === 'processing' && (
        <div className="flex items-center gap-2 mt-6">
          <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}

      {/* Controls */}
      {phase === 'listening' && (
        <div className="flex flex-col items-center gap-4 mt-8">
          {/* Mic indicator */}
          <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all ${
            voice.voiceState === 'LISTENING'
              ? 'border-cyan bg-cyan/15 animate-pulse shadow-[0_0_20px_rgba(0,180,216,0.3)]'
              : 'border-border bg-void'
          }`}>
            <Mic size={24} className={voice.voiceState === 'LISTENING' ? 'text-cyan' : 'text-text-muted'} />
          </div>

          {voice.silenceCountdown && (
            <p className="font-mono text-[10px] text-text-muted">{voice.silenceCountdown}</p>
          )}

          {/* Text fallback */}
          {showTextFallback && (
            <form onSubmit={handleTextSubmit} className="flex gap-2 w-full max-w-sm">
              <input type="text" value={textInput} onChange={e => setTextInput(e.target.value)}
                placeholder="Type your answer..."
                className="flex-1 bg-void border border-border rounded-lg px-3 py-2 font-body text-sm text-text
                  placeholder:text-text-muted focus:outline-none focus:border-cyan"
                autoFocus />
              <button type="submit" disabled={!textInput.trim()}
                className="px-3 py-2 rounded-lg border border-cyan/40 text-cyan text-sm
                  hover:bg-cyan/10 disabled:opacity-30 disabled:cursor-not-allowed">
                Send
              </button>
            </form>
          )}

          {/* Skip */}
          <button onClick={handleSkip}
            className="font-mono text-[10px] tracking-wider text-text-muted hover:text-text-dim transition-colors">
            <SkipForward size={12} className="inline mr-1" />SKIP
          </button>
        </div>
      )}
    </div>
  )
}
