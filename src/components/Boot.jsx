// Boot.jsx — Cinematic JARVIS Boot Sequence (Full-Screen Immersive)
// WHY: First impressions define the entire experience. This boot sequence transforms
// opening the app from "loading a website" into "powering up an AI system."
// Phase 6 upgrade: After transition ritual, makes a REAL Sonnet API call for
// morning briefing with avoidance detection + time-aware behavior. Briefing types
// character by character and browser TTS reads it simultaneously.

import { useState, useEffect, useRef, useCallback } from 'react'
import useStorage from '../hooks/useStorage.js'
import { getDayNumber, getWeekNumber, getTimeOfDay } from '../utils/dateUtils.js'
import BootReactor from './BootReactor.jsx'
import TASKS from '../data/tasks.js'

// Dead Three.js code deleted in Session 48E

const BOOT_LINES = [
  { text: '> JARVIS OS v2050.2', status: null },
  { text: '> ▸ Neural interface..............', status: '[ ONLINE ]' },
  { text: '> ▸ Anti-crutch protocols.........', status: '[ CALIBRATED ]' },
  { text: '> ▸ Concept DNA [35 nodes]........', status: '[ SYNCED ]' },
  { text: '> ▸ Intelligence systems..........', status: '[ 43% ]' },
  { text: '> ▸ Build telemetry...............', status: '[ TRACKING ]' },
  { text: '> ▸ Voice synthesis...............', status: '[ ARMED ]' },
  { text: '> All systems nominal.', status: null },
]

function buildBriefingPrompt(core, get) {
  const startDate = core.startDate || new Date().toISOString()
  const dayNumber = getDayNumber(startDate)
  const weekNumber = getWeekNumber(startDate)
  const streak = core.streak || 0
  const energy = core.lastEnergy || core.energy || 3
  const timeOfDay = getTimeOfDay()
  const hour = new Date().getHours()
  const dayName = new Date().toLocaleDateString('en-IN', { weekday: 'long' })
  const completedTasks = core.completedTasks || []
  const totalTasks = TASKS.length
  const pendingCount = totalTasks - completedTasks.length
  const completionPct = Math.round((completedTasks.length / totalTasks) * 100)
  let overdueCount = 0
  let overdueConcepts = []
  try {
    const concepts = get('concepts') || []
    concepts.forEach(c => {
      if (c.strength != null && c.strength < 60) {
        overdueConcepts.push(`${c.name || c.id} (${c.strength}%)`)
        overdueCount++
      }
    })
  } catch {}
  let yesterdayBuild = ''
  try {
    const builds = get('daily-build') || []
    if (builds.length > 0) yesterdayBuild = builds[builds.length - 1].summary || ''
  } catch {}
  const avoidedModes = []
  try {
    const allModes = ['chat','quiz','presser','timed','speed','battle','teach','body-double','alter-ego','recruiter-ghost','forensics','akshay-qs','time-machine','code-autopsy','scenario-bomb','interview-sim','impostor-killer','weakness-radar']
    const fiveDaysAgo = Date.now() - (5*24*60*60*1000)
    allModes.forEach(mode => {
      const msgs = get(`msgs-${mode}`) || []
      if (msgs.length === 0) return
      const lastMsg = msgs[msgs.length - 1]
      if (lastMsg?.timestamp && new Date(lastMsg.timestamp).getTime() < fiveDaysAgo) avoidedModes.push(mode)
    })
  } catch {}
  let timeContext = ''
  if (timeOfDay === 'morning') timeContext = 'Morning session. Tackle hardest tasks first.'
  else if (dayName === 'Friday' && timeOfDay === 'evening') timeContext = 'Friday evening. Weekly wrap-up time.'
  else if (dayName === 'Sunday') timeContext = 'Sunday. Weekly prep day.'
  else if (hour >= 23 || hour < 4) timeContext = 'LATE NIGHT WARNING. Recommend sleep, Sir.'
  else if (timeOfDay === 'afternoon') timeContext = 'Afternoon. Post-lunch dip likely. Consider Body Double.'
  return `Generate a morning briefing for Nikhil Panwar. Context:
- Day ${dayNumber}, Week ${weekNumber}, ${dayName}, ${timeOfDay}
- Streak: ${streak} days, Energy: ${energy}/5
- Tasks: ${completedTasks.length}/${totalTasks} (${completionPct}%), ${pendingCount} pending
- Rank: ${core.rank || 'Recruit'}
${overdueCount > 0 ? `- Overdue concepts: ${overdueConcepts.slice(0,5).join(', ')}` : '- All concepts on track'}
${yesterdayBuild ? `- Yesterday: ${yesterdayBuild.slice(0,200)}` : ''}
${avoidedModes.length > 0 ? `- AVOIDANCE: ${avoidedModes.join(', ')} not used in 5+ days` : ''}
${timeContext ? `- ${timeContext}` : ''}
Write 3-5 sentence briefing in JARVIS voice (formal British, "Sir"). Under 100 words. No markdown.`
}

// MAIN BOOT COMPONENT
// ============================================================
export default function Boot({ onComplete }) {
  const { get, update } = useStorage()
  const [phase, setPhase] = useState(1)
  const [reactorVisible, setReactorVisible] = useState(false)
  const [reactorPhase, setReactorPhase] = useState('void') // void|ignition|running|ambient|briefing|exit
  const [bootLines, setBootLines] = useState([])
  const [currentLineText, setCurrentLineText] = useState('')
  const [currentLineStatus, setCurrentLineStatus] = useState(null)
  const [statusColor, setStatusColor] = useState(null)
  const [showInputs, setShowInputs] = useState(false)
  const [briefingText, setBriefingText] = useState('')
  const [showEnterBtn, setShowEnterBtn] = useState(false)
  const [mousePos, setMousePos] = useState(null)
  const [showCursor, setShowCursor] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  // Transition ritual inputs
  const [energy, setEnergy] = useState(0)
  const [focus, setFocus] = useState('')
  const [blockers, setBlockers] = useState('')
  const [morningBet, setMorningBet] = useState('')
  const [voiceStep, setVoiceStep] = useState(0)
  const [voiceQuestion, setVoiceQuestion] = useState('')
  const [isListeningBoot, setIsListeningBoot] = useState(false)

  const VOICE_QS = ['', 'Energy level, Sir?', 'Primary focus today?', 'Any blockers?', 'Morning bet — what will you accomplish today?']

  // Voice-first: all speech through Gemini Charon voice
  const speakJarvisEvent = useCallback((text, skipQueue) => {
    if (!text) return
    window.dispatchEvent(new CustomEvent('jarvis-speak', { detail: { text, skipQueue: !!skipQueue } }))
  }, [])

  // Check if returning user (compressed boot)
  const isReturning = useRef(false)
  useEffect(() => {
    const core = get('core')
    if (core && core.totalCheckIns > 0) {
      isReturning.current = true
    }
  }, [get])

  const handleMouseMove = useCallback((e) => {
    setMousePos({
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: -(e.clientY / window.innerHeight) * 2 + 1,
    })
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove])

  // ============================================================
  // TYPEWRITER ENGINE
  // ============================================================
  const typeText = useCallback((text, charDelay = 12) => {
    return new Promise((resolve) => {
      let i = 0
      setCurrentLineText('')
      const interval = setInterval(() => {
        if (i < text.length) {
          setCurrentLineText(text.slice(0, i + 1))
          i++
        } else {
          clearInterval(interval)
          resolve()
        }
      }, charDelay)
    })
  }, [])

  const flashStatus = useCallback((status) => {
    return new Promise((resolve) => {
      setCurrentLineStatus(status)
      setStatusColor('#ef4444')
      setTimeout(() => setStatusColor('#eab308'), 150)
      setTimeout(() => {
        setStatusColor('#22c55e')
        setTimeout(resolve, 200)
      }, 300)
    })
  }, [])

  // ============================================================
  // FETCH REAL AI BRIEFING
  // ============================================================
  const fetchBriefing = useCallback(async () => {
    const core = get('core') || {}
    const prompt = buildBriefingPrompt(core, get)

    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 256,
          system: `You are JARVIS OS — Nikhil Panwar's AI operating system. Speak like Paul Bettany's JARVIS: formal, British, precise, dry wit. Call him "Sir". Never use casual slang. Be concise and data-driven.`,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
      })

      if (!response.ok) throw new Error(`API ${response.status}`)

      const data = await response.json()
      // Handle both streaming and non-streaming response formats
      const text = data.content?.[0]?.text || data.text || ''
      return text
    } catch (err) {
      console.warn('[Boot] Briefing API failed, using fallback:', err)
      return null
    }
  }, [get])

  // ============================================================
  // PHASE ORCHESTRATION
  // ============================================================

  // Phase 1 → 2: void → ignition → reactor running
  useEffect(() => {
    if (isReturning.current) {
      // Returning user: skip void/ignition
      setReactorPhase('running')
      setReactorVisible(true)
      setTimeout(() => setPhase(2), 200)
    } else {
      // First boot: void phase (particles converge)
      setReactorPhase('void')
      setReactorVisible(true)
      // After 1.5s void → ignition
      setTimeout(() => setReactorPhase('ignition'), 1500)
      // After 3.5s → running + advance to phase 2
      setTimeout(() => {
        setReactorPhase('running')
        setPhase(2)
      }, 3500)
    }
  }, [])

  // Phase 2 → 3: reactor visible → boot text starts typing
  useEffect(() => {
    if (phase !== 2) return
    const delay = isReturning.current ? 800 : 1400

    const t2 = setTimeout(async () => {
      setPhase(3)
      setShowCursor(false)

      for (let i = 0; i < BOOT_LINES.length; i++) {
        const line = BOOT_LINES[i]
        await typeText(line.text, isReturning.current ? 4 : 12)
        if (line.status) await flashStatus(line.status)

        setBootLines(prev => [...prev, { text: line.text, status: line.status }])
        setCurrentLineText('')
        setCurrentLineStatus(null)
        setStatusColor(null)
      }

      // → Phase 4: transition inputs (reactor dims to ambient)
      setTimeout(() => {
        setPhase(4)
        setReactorPhase('running') // reactor stays full power during voice questions
        setShowInputs(true)
        // Start voice transition
        setVoiceStep(1)
        setVoiceQuestion(VOICE_QS[1])
        speakJarvisEvent(VOICE_QS[1], true)
      }, isReturning.current ? 200 : 400)
    }, delay)

    return () => clearTimeout(t2)
  }, [phase, typeText, flashStatus])

  // Save transition answers → AI briefing → enter button
  const handleInputsComplete = useCallback(async () => {
    update('core', (prev) => ({
      ...prev,
      lastEnergy: energy,
      lastFocus: focus,
      lastBlockers: blockers,
    }))

    if (morningBet) {
      update('morning-bets', (prev) => {
        const bets = Array.isArray(prev) ? prev : []
        return [...bets, {
          date: new Date().toISOString().split('T')[0],
          bet: morningBet,
          predictions: morningBet.split(',').map(s => s.trim()).filter(Boolean),
          completed: false,
        }]
      })
    }

    update('feelings', (prev) => {
      const feelings = Array.isArray(prev) ? prev : []
      return [...feelings, {
        date: new Date().toISOString().split('T')[0],
        energy,
        focus: focus || undefined,
        blockers: blockers || undefined,
        type: 'boot-checkin',
      }]
    })

    setShowInputs(false)
    setPhase(5)
    setReactorPhase('briefing')

    // WHY: Fetch real AI briefing from Sonnet. If it fails, use a static fallback.
    // We start the fetch immediately and type the response character by character.
    await new Promise(r => setTimeout(r, 2000))  // Let rate limit breathe
    const aiBriefing = await fetchBriefing()
    const core = get('core') || {}
    const dayNumber = getDayNumber(core.startDate || new Date().toISOString())
    const weekNumber = getWeekNumber(core.startDate || new Date().toISOString())
    const timeOfDay = getTimeOfDay()
    const greetings = {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
      latenight: 'Rather late',
    }

    const completed = (core.completedTasks || []).length
    const pct = Math.round((completed / 82) * 100)
    const concepts = get('concepts') || []
    const mastered = concepts.filter(c => (c.strength || 0) >= 60).length
    const fallbackText = `${greetings[timeOfDay]}, Sir. Day ${dayNumber}, Week ${weekNumber}. Streak: ${core.streak || 0} days. ${completed}/82 tasks complete (${pct}%). ${mastered} concepts mastered. Energy at ${energy}/5. ${energy >= 4 ? 'High energy — schedule the difficult modes.' : energy <= 2 ? 'Low energy detected. Consider Body Double or lighter training.' : 'Nominal conditions. Shall we begin?'}`
    const finalText = aiBriefing || fallbackText

    // Typewriter effect for briefing
    // Speak briefing via browser TTS simultaneously with typewriter
    speakJarvisEvent(finalText)
    let i = 0
    const charDelay = isReturning.current ? 8 : 18
    const interval = setInterval(() => {
      if (i <= finalText.length) {
        // Settled chars (real text) + 3 scrambling frontier chars
        const settled = finalText.slice(0, i)
        const frontierLen = Math.min(3, finalText.length - i)
        const frontier = frontierLen > 0
          ? Array.from({length: frontierLen}, () =>
              'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&!?'[Math.floor(Math.random() * 70)]
            ).join('')
          : ''
        setBriefingText(settled + frontier)
        i++
      } else {
        setBriefingText(finalText) // Clean final text, no frontier chars
        clearInterval(interval)
        // Save briefing for Briefing.jsx on CMD tab
        try {
          const weekly = JSON.parse(localStorage.getItem('jos-weekly') || '{}')
          weekly.briefing = { text: finalText, generatedAt: new Date().toISOString() }
          weekly.lastBriefing = weekly.briefing
          localStorage.setItem('jos-weekly', JSON.stringify(weekly))
        } catch (e) { console.error('[Boot] Failed to save briefing:', e) }
        // Show ENTER button — NO speech here (already started at typewriter begin)
        setTimeout(() => { setPhase(6); setShowEnterBtn(true) }, 500)
      }
    }, charDelay)

  }, [energy, focus, blockers, morningBet, update, fetchBriefing, get])

  const handleEnter = useCallback(() => {
    // BRUTE FORCE: Set flag FIRST — blocks any queued/in-flight briefing speech
    // Stop any Gemini audio that's playing
    window.dispatchEvent(new CustomEvent('jarvis-stop-audio'))
    // Kill any playing audio
    document.querySelectorAll('audio').forEach(a => { try { a.pause(); a.currentTime = 0 } catch {} })
    if (window._thinkingStop) { window._thinkingStop(); window._thinkingStop = null }

    // Chrome audio unlock — use AudioContext only, do NOT speak another utterance
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      ctx.resume()
      console.log('BOOT: audio unlocked')
    } catch (e) {
      console.warn('AUDIO: unlock failed:', e)
    }

    setIsExiting(true)
    setReactorPhase('exit')
    setTimeout(() => onComplete(), 800)
  }, [onComplete])

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      {/* LAYER 1: Canvas 2D Reactor */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isExiting ? 0 : (reactorVisible ? 1 : 0),
          transition: isExiting ? 'opacity 0.6s ease-out' : 'opacity 1.2s ease-in',
        }}
      >
        <BootReactor phase={reactorPhase} />
      </div>

      {/* LAYER 2: Vignette overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 41,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(2, 10, 19, 0.4) 60%, rgba(2, 10, 19, 0.85) 100%)',
        }}
      />

      {/* LAYER 3: HTML Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 42,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: '6vh',
          pointerEvents: 'none',
          opacity: isExiting ? 0 : 1,
          transition: 'opacity 0.5s ease-out',
        }}
      >
        {/* Phase 1: Blinking cursor */}
        {showCursor && phase === 1 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}>
            <span className="font-mono text-cyan-neon text-2xl animate-pulse">▊</span>
          </div>
        )}

        {/* Boot text + inputs + briefing + button */}
        <div style={{
          width: '100%', maxWidth: '600px', padding: '24px 32px', pointerEvents: 'auto',
          position: 'relative', zIndex: 10,
          background: 'linear-gradient(to top, rgba(2,10,19,0.92) 60%, rgba(2,10,19,0.7) 85%, transparent)',
          backdropFilter: 'blur(8px)', borderRadius: '8px',
        }}>

          {/* Completed boot lines — glass row per line */}
          {bootLines.map((line, i) => (
            <div key={i} className="glass-card px-3 py-1.5 flex items-center justify-between boot-line-enter"
              style={{ marginBottom: '3px', animationDelay: `${i * 50}ms` }}>
              <span className="font-mono text-xs" style={{ color: '#00b4d8', textShadow: '0 0 6px rgba(0,180,216,0.3)' }}>
                ▸ {line.text}
              </span>
              {line.status && (
                <span className="status-pop font-mono text-[10px] font-bold"
                  style={{ color: '#22c55e', textShadow: '0 0 8px rgba(34,197,94,0.5)' }}>{line.status}</span>
              )}
            </div>
          ))}

          {/* Currently typing line */}
          {currentLineText && (
            <div className="font-mono text-xs leading-relaxed flex items-center gap-2" style={{ marginBottom: '2px' }}>
              <span style={{ color: '#00b4d8' }}>{currentLineText}</span>
              {currentLineStatus ? (
                <span style={{ color: statusColor, fontWeight: 700, transition: 'color 0.1s' }}>
                  {currentLineStatus}
                </span>
              ) : (
                <span className="animate-pulse" style={{ color: '#00f0ff' }}>▊</span>
              )}
            </div>
          )}

          {/* Scan line separator */}
          {phase >= 3 && phase < 4 && (
            <div style={{
              height: '1px',
              marginTop: '8px',
              background: 'linear-gradient(90deg, transparent, #00f0ff, transparent)',
              opacity: 0.4,
            }} />
          )}

          {/* Phase 4: handled by voice overlay below */}

      {/* Phase 4: Voice Transition Overlay — fixed at bottom over full-screen reactor */}
      {showInputs && voiceStep > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 45, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '5vh', background: 'linear-gradient(to top, rgba(2,10,19,0.85) 0%, rgba(2,10,19,0.4) 60%, transparent 100%)', pointerEvents: 'auto' }}>
          <p className="animate-fade-in" style={{ fontFamily: 'Share Tech Mono', fontSize: 14, letterSpacing: '0.1em', color: voiceStep === 4 ? '#d4a853' : '#00b4d8', textShadow: `0 0 12px ${voiceStep === 4 ? 'rgba(212,168,83,0.4)' : 'rgba(0,180,216,0.4)'}`, marginBottom: 20, textAlign: 'center' }}>
            {voiceQuestion}
          </p>

          {voiceStep === 1 && (
            <div className="card-enter" style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 16 }}>
              {[1,2,3,4,5].map(n => {
                const active = energy === n
                const c = {1:'#ef4444',2:'#f97316',3:'#00b4d8',4:'#00f0ff',5:'#d4a853'}[n]
                return (
                  <button key={n} onClick={() => {
                    setEnergy(n)
                    setTimeout(() => {
                      setVoiceStep(2); setVoiceQuestion(VOICE_QS[2])
                      speakJarvisEvent(VOICE_QS[2], true)
                    }, 500)
                  }} className={active ? 'orb-ignite' : ''} style={{
                    width: 56, height: 56, borderRadius: '50%', border: `2px solid ${active ? c : 'rgba(13,33,55,0.5)'}`,
                    background: active ? `radial-gradient(circle at 40% 40%, ${c}50 0%, ${c}20 50%, transparent 70%)` : 'rgba(2,10,19,0.6)',
                    color: active ? c : '#2a4a60', fontSize: 18, fontFamily: 'Rajdhani', fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)', transform: active ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: active ? `0 0 24px ${c}50, 0 0 48px ${c}20, inset 0 0 16px ${c}25` : 'none',
                    backdropFilter: 'blur(4px)',
                  }}>{n}</button>
                )
              })}
            </div>
          )}

          {voiceStep >= 2 && voiceStep <= 4 && (
            <div className="card-enter" style={{ width: '90%', maxWidth: 500 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="text"
                  value={voiceStep === 2 ? focus : voiceStep === 3 ? blockers : morningBet}
                  onChange={e => { if (voiceStep === 2) setFocus(e.target.value); else if (voiceStep === 3) setBlockers(e.target.value); else setMorningBet(e.target.value) }}
                  onKeyDown={e => {
                    if (e.key !== 'Enter') return
                    if (voiceStep === 4) { handleInputsComplete(); return }
                    const next = voiceStep + 1
                    setTimeout(() => {
                      setVoiceStep(next); setVoiceQuestion(VOICE_QS[next])
                      speakJarvisEvent(VOICE_QS[next], true)
                    }, 300)
                  }}
                  placeholder={voiceStep === 2 ? 'Type or speak your focus...' : voiceStep === 3 ? 'Blockers...' : 'I will...'}
                  autoFocus
                  style={{ flex: 1, background: 'rgba(2,10,19,0.7)', backdropFilter: 'blur(8px)', border: `1px solid ${voiceStep === 4 ? 'rgba(212,168,83,0.3)' : 'rgba(0,180,216,0.2)'}`, borderRadius: 20, padding: '10px 16px', color: '#d0e8f8', fontFamily: 'Exo 2', fontSize: 13, outline: 'none', caretColor: voiceStep === 4 ? '#d4a853' : '#00f0ff' }}
                />
                <button onClick={() => {
                  if (voiceStep === 4) { handleInputsComplete(); return }
                  const next = voiceStep + 1
                  setTimeout(() => {
                    setVoiceStep(next); setVoiceQuestion(VOICE_QS[next])
                    speakJarvisEvent(VOICE_QS[next], true)
                  }, 300)
                }} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.3)', color: '#00f0ff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▸</button>
              </div>
              {isListeningBoot && <p className="animate-pulse" style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: '#00b4d8', textAlign: 'center', marginTop: 8, letterSpacing: '0.15em' }}>LISTENING...</p>}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {[1,2,3,4].map(s => (
              <div key={s} style={{ width: 6, height: 6, borderRadius: '50%', background: s < voiceStep ? '#00b4d8' : s === voiceStep ? '#00f0ff' : '#0d2137', boxShadow: s === voiceStep ? '0 0 8px rgba(0,240,255,0.5)' : 'none', transition: 'all 0.3s' }} />
            ))}
          </div>
        </div>
      )}

          {/* Phase 5: Briefing text */}
          {phase >= 5 && briefingText && (
            <div style={{
              marginTop: '20px',
              paddingTop: '14px',
              borderTop: '1px solid rgba(13, 33, 55, 0.5)',
            }}>
              <p className="font-body text-sm" style={{ color: '#d0e8f8', lineHeight: 1.7 }}>
                {briefingText}
                {phase === 5 && <span className="animate-pulse" style={{ color: '#00f0ff', marginLeft: '4px' }}>▊</span>}
              </p>
            </div>
          )}

          {/* Phase 6: ENTER JARVIS — THE MOMENT */}
          {showEnterBtn && (
            <div style={{ textAlign: 'center', marginTop: '32px' }} className="card-enter">
              <button onClick={handleEnter}
                className="font-display enter-pulse"
                style={{
                  fontSize: '22px', fontWeight: 700, letterSpacing: '0.3em',
                  padding: '16px 52px', color: '#00f0ff', border: '2px solid #00f0ff',
                  borderRadius: '8px', background: 'transparent', cursor: 'pointer',
                  textShadow: '0 0 15px rgba(0,240,255,0.7), 0 0 40px rgba(0,240,255,0.3)',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => { e.target.style.background = 'rgba(0,240,255,0.06)' }}
                onMouseLeave={(e) => { e.target.style.background = 'transparent' }}>
                ENTER JARVIS
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
