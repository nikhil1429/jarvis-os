// Boot.jsx — Cinematic JARVIS Boot Sequence (Full-Screen Immersive)
// WHY: First impressions define the entire experience. This boot sequence transforms
// opening the app from "loading a website" into "powering up an AI system."
// Phase 6 upgrade: After transition ritual, makes a REAL Sonnet API call for
// morning briefing with avoidance detection + time-aware behavior. Briefing types
// character by character and browser TTS reads it simultaneously.

import { useState, useEffect, useRef, useCallback } from 'react'
import useStorage from '../hooks/useStorage.js'
import { getDayNumber, getWeekNumber, getTimeOfDay } from '../utils/dateUtils.js'
import { speakElevenLabs } from '../utils/elevenLabsSpeak.js'
import BootReactor from './BootReactor.jsx'
import TASKS from '../data/tasks.js'

// Three.js reactor components below are DEPRECATED — replaced by BootReactor.jsx (Canvas 2D)
// Kept as dead code; tree-shaking removes them from bundle.

function ReactorRing({ radius, tubeRadius, color, emissiveColor, speed, axis, emissiveIntensity = 0.7, opacity = 0.8 }) {
  const ref = useRef()
  const initialRotation = useMemo(() => {
    if (axis === 'x') return [Math.PI / 6, 0, 0]
    if (axis === 'z') return [0, 0, Math.PI / 5]
    return [0, 0, 0]
  }, [axis])

  useFrame((_, delta) => {
    if (!ref.current) return
    if (axis === 'y') ref.current.rotation.y += delta * speed
    else if (axis === 'x') ref.current.rotation.x += delta * speed
    else ref.current.rotation.z += delta * speed
  })

  return (
    <mesh ref={ref} rotation={initialRotation}>
      <torusGeometry args={[radius, tubeRadius, 24, 100]} />
      <meshStandardMaterial
        color={color}
        emissive={emissiveColor || color}
        emissiveIntensity={emissiveIntensity}
        transparent
        opacity={opacity}
        toneMapped={false}
      />
    </mesh>
  )
}

function ReactorCore() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const s = 1 + Math.sin(clock.elapsedTime * 2) * 0.1
    ref.current.scale.set(s, s, s)
  })

  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffd080"
          emissiveIntensity={4}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial
          color="#00b4d8"
          emissive="#00b4d8"
          emissiveIntensity={1.5}
          transparent
          opacity={0.15}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

function ShockwaveRing({ delay }) {
  const ref = useRef()
  const matRef = useRef()
  const startTime = useRef(null)

  useFrame(({ clock }) => {
    if (!ref.current || !matRef.current) return
    if (startTime.current === null) startTime.current = clock.elapsedTime

    const t = clock.elapsedTime - startTime.current - delay
    if (t < 0) { matRef.current.opacity = 0; return }
    if (t > 2.0) { matRef.current.opacity = 0; return }

    const progress = t / 2.0
    const scale = 0.5 + progress * 5
    ref.current.scale.set(scale, scale, scale)
    matRef.current.opacity = (1 - progress) * 0.5
  })

  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.9, 1.05, 64]} />
      <meshBasicMaterial ref={matRef} color="#00f0ff" transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  )
}

function OrbitalParticles({ count = 170, mousePos }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => {
      const radius = 0.8 + Math.random() * 3.0
      return {
        radius,
        speed: (0.3 + Math.random() * 0.9) * (2.5 / (radius + 0.5)),
        phase: Math.random() * Math.PI * 2,
        eccentricity: 0.6 + Math.random() * 0.4,
        tiltX: (Math.random() - 0.5) * 1.2,
        tiltZ: (Math.random() - 0.5) * 0.8,
        yAmplitude: 0.3 + Math.random() * 1.2,
        yFreq: 0.5 + Math.random() * 1.5,
        size: 0.012 + Math.random() * 0.028,
      }
    })
  }, [count])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.elapsedTime

    particles.forEach((p, i) => {
      const angle = t * p.speed + p.phase
      let x = Math.cos(angle) * p.radius
      let z = Math.sin(angle) * p.radius * p.eccentricity
      let y = Math.sin(angle * p.yFreq) * p.yAmplitude

      const tiltedY = y * Math.cos(p.tiltX) - z * Math.sin(p.tiltX)
      const tiltedZ = y * Math.sin(p.tiltX) + z * Math.cos(p.tiltX)

      let fx = x
      let fy = tiltedY
      let fz = tiltedZ

      if (mousePos) {
        const dx = fx - mousePos.x * 4
        const dy = fy - mousePos.y * 4
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 2.5 && dist > 0.01) {
          const push = (2.5 - dist) * 0.2
          fx += (dx / dist) * push
          fy += (dy / dist) * push
        }
      }

      dummy.position.set(fx, fy, fz)
      dummy.scale.setScalar(p.size * (1 + Math.sin(t * 3 + p.phase) * 0.4))
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#00d4ff" transparent opacity={0.85} toneMapped={false} />
    </instancedMesh>
  )
}

function GoldParticles({ count = 40, mousePos }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => {
      const radius = 0.5 + Math.random() * 1.5
      return {
        radius,
        speed: (0.2 + Math.random() * 0.5) * (2.0 / (radius + 0.5)),
        phase: Math.random() * Math.PI * 2,
        eccentricity: 0.7 + Math.random() * 0.3,
        tiltX: (Math.random() - 0.5) * 0.6,
        yAmplitude: 0.2 + Math.random() * 0.8,
        yFreq: 0.3 + Math.random() * 1.0,
        size: 0.015 + Math.random() * 0.035,
      }
    })
  }, [count])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.elapsedTime
    particles.forEach((p, i) => {
      const angle = t * p.speed + p.phase
      let x = Math.cos(angle) * p.radius
      let z = Math.sin(angle) * p.radius * p.eccentricity
      let y = Math.sin(angle * p.yFreq) * p.yAmplitude

      const tiltedY = y * Math.cos(p.tiltX) - z * Math.sin(p.tiltX)
      const tiltedZ = y * Math.sin(p.tiltX) + z * Math.cos(p.tiltX)

      let fx = x, fy = tiltedY, fz = tiltedZ

      if (mousePos) {
        const dx = fx - mousePos.x * 4
        const dy = fy - mousePos.y * 4
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 2.5 && dist > 0.01) {
          const push = (2.5 - dist) * 0.15
          fx += (dx / dist) * push
          fy += (dy / dist) * push
        }
      }

      dummy.position.set(fx, fy, fz)
      dummy.scale.setScalar(p.size * (1 + Math.sin(t * 4 + p.phase) * 0.5))
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#ffc85a" transparent opacity={0.9} toneMapped={false} />
    </instancedMesh>
  )
}

function ArcReactor({ mousePos, visible }) {
  return (
    <group visible={visible}>
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 0, 2]} intensity={3} color="#00b4d8" distance={15} />
      <pointLight position={[0, 0, -2]} intensity={1.5} color="#00b4d8" distance={10} />

      <ReactorCore />

      <ReactorRing radius={1.0} tubeRadius={0.04} color="#00d4ff" emissiveColor="#00b4d8"
        speed={0.8} axis="y" emissiveIntensity={0.8} opacity={0.9} />
      <ReactorRing radius={1.5} tubeRadius={0.03} color="#00f0ff" emissiveColor="#00f0ff"
        speed={-0.5} axis="x" emissiveIntensity={0.6} opacity={0.7} />
      <ReactorRing radius={2.0} tubeRadius={0.025} color="#0090b0" emissiveColor="#00b4d8"
        speed={0.3} axis="z" emissiveIntensity={0.5} opacity={0.5} />

      <ShockwaveRing delay={0} />
      <ShockwaveRing delay={0.2} />
      <ShockwaveRing delay={0.4} />
      <ShockwaveRing delay={0.6} />

      <OrbitalParticles count={170} mousePos={mousePos} />
      <GoldParticles count={40} mousePos={mousePos} />

      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.4}
          radius={0.8}
          mipmapBlur
        />
      </EffectComposer>
    </group>
  )
}

// ============================================================
// BOOT TEXT DATA
// ============================================================
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

// ============================================================
// MORNING BRIEFING BUILDER — Constructs the prompt for Sonnet
// ============================================================
function buildBriefingPrompt(core, get) {
  const startDate = core.startDate || new Date().toISOString()
  const dayNumber = getDayNumber(startDate)
  const weekNumber = getWeekNumber(startDate)
  const streak = core.streak || 0
  const energy = core.lastEnergy || core.energy || 3
  const timeOfDay = getTimeOfDay()
  const hour = new Date().getHours()
  const dayName = new Date().toLocaleDateString('en-IN', { weekday: 'long' })

  // Pending tasks
  const completedTasks = core.completedTasks || []
  const totalTasks = TASKS.length
  const pendingCount = totalTasks - completedTasks.length
  const completionPct = Math.round((completedTasks.length / totalTasks) * 100)

  // Overdue concepts
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
  } catch { /* ignore */ }

  // Yesterday's build log
  let yesterdayBuild = ''
  try {
    const builds = get('daily-build') || []
    if (builds.length > 0) {
      const last = builds[builds.length - 1]
      yesterdayBuild = last.summary || ''
    }
  } catch { /* ignore */ }

  // Avoidance detection — modes not used in 5+ days
  const avoidedModes = []
  try {
    const allModes = ['chat', 'quiz', 'presser', 'timed', 'speed', 'battle', 'teach',
      'body-double', 'alter-ego', 'recruiter-ghost', 'forensics', 'akshay-qs',
      'time-machine', 'code-autopsy', 'scenario-bomb', 'interview-sim',
      'impostor-killer', 'weakness-radar']
    const fiveDaysAgo = Date.now() - (5 * 24 * 60 * 60 * 1000)
    allModes.forEach(mode => {
      const msgs = get(`msgs-${mode}`) || []
      if (msgs.length === 0) return // Never used — skip, not avoidance
      const lastMsg = msgs[msgs.length - 1]
      if (lastMsg?.timestamp && new Date(lastMsg.timestamp).getTime() < fiveDaysAgo) {
        avoidedModes.push(mode)
      }
    })
  } catch { /* ignore */ }

  // Time-aware behavior context
  let timeContext = ''
  if (timeOfDay === 'morning') {
    timeContext = 'Morning session. Energy recommendations: tackle hardest tasks first while cortisol peaks.'
  } else if (dayName === 'Friday' && timeOfDay === 'evening') {
    timeContext = 'Friday evening. Weekly wrap-up time. Summarize wins, set Monday priorities.'
  } else if (dayName === 'Sunday') {
    timeContext = 'Sunday. Weekly prep day. Review upcoming tasks, concept reviews, set the week.'
  } else if (hour >= 23 || hour < 4) {
    timeContext = 'LATE NIGHT WARNING. Code written after midnight has a 60% higher bug rate. Recommend sleep, Sir.'
  } else if (timeOfDay === 'afternoon') {
    timeContext = 'Afternoon session. Post-lunch energy dip likely. Consider a Body Double session or lighter mode.'
  }

  const prompt = `Generate a morning briefing for Nikhil Panwar. Context:
- Day ${dayNumber}, Week ${weekNumber}, ${dayName}, ${timeOfDay}
- Current hour: ${hour}:00
- Streak: ${streak} days
- Energy level: ${energy}/5
- Tasks: ${completedTasks.length}/${totalTasks} complete (${completionPct}%), ${pendingCount} pending
- Rank: ${core.rank || 'Recruit'}
${overdueCount > 0 ? `- Overdue concepts (below 60%): ${overdueConcepts.slice(0, 5).join(', ')}` : '- All concepts on track'}
${yesterdayBuild ? `- Yesterday's build: ${yesterdayBuild.slice(0, 200)}` : '- No build log from yesterday'}
${avoidedModes.length > 0 ? `- AVOIDANCE DETECTED: These modes haven't been used in 5+ days: ${avoidedModes.join(', ')}` : '- No mode avoidance detected'}
${timeContext ? `- TIME CONTEXT: ${timeContext}` : ''}

Write a 3-5 sentence briefing in JARVIS voice (formal British, call him "Sir"). Include:
1. Greeting appropriate to time of day
2. Key stats (day, streak, completion)
3. One specific recommendation based on the data
4. If avoidance detected, call it out directly
5. If late night, warn about sleep
Keep it under 100 words. No markdown. Plain text only.`

  return prompt
}

// ============================================================
// MAIN BOOT COMPONENT
// ============================================================
export default function Boot({ onComplete }) {
  const { get, update } = useStorage()
  // tts removed — speakElevenLabs imported directly

  const [phase, setPhase] = useState(1)
  const [reactorVisible, setReactorVisible] = useState(false)
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
  const [inputStep, setInputStep] = useState(0)

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
          model: 'claude-sonnet-4-20250514',
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

  // Phase 1 → 2: darkness → reactor ignites
  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase(2)
      setReactorVisible(true)
    }, isReturning.current ? 200 : 600)
    return () => clearTimeout(t1)
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

      // → Phase 4: transition inputs
      setTimeout(() => {
        setPhase(4)
        setShowInputs(true)
        setInputStep(1)
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

    // WHY: Fetch real AI briefing from Sonnet. If it fails, use a static fallback.
    // We start the fetch immediately and type the response character by character.
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

    const fallbackText = `${greetings[timeOfDay]}, Sir. Day ${dayNumber}, Week ${weekNumber}. Streak: ${core.streak || 0} days. Energy at ${energy}/5. All systems initialized. Shall we begin?`
    const finalText = aiBriefing || fallbackText

    // Reset briefing flag for this boot
    window._briefingStopped = false

    // Typewriter effect for briefing
    let i = 0
    const charDelay = isReturning.current ? 8 : 18
    const interval = setInterval(() => {
      if (window._briefingStopped) {
        clearInterval(interval)
        console.log('BRIEFING: typewriter stopped by _briefingStopped flag')
        return
      }
      if (i < finalText.length) {
        // Text decode: settled chars + scrambling frontier
        const settled = finalText.slice(0, Math.max(0, i - 2))
        const frontier = Array.from({length: Math.min(3, i + 1)}, () =>
          'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%'[Math.floor(Math.random() * 40)]
        ).join('')
        setBriefingText(settled + frontier)
        i++
      } else {
        clearInterval(interval)
        setTimeout(() => { setPhase(6); setShowEnterBtn(true) }, 500)
      }
    }, charDelay)

    // Speak the briefing — ElevenLabs only, browser TTS as fallback
    if (!window._briefingStopped) {
      const settings = JSON.parse(localStorage.getItem('jos-settings') || '{}')
      if (settings.voice !== false) {
        speakElevenLabs(finalText).then(success => {
          if (!success && !window._briefingStopped) {
            // Fallback to browser TTS
            const synth = window.speechSynthesis
            if (synth) {
              const u = new SpeechSynthesisUtterance(finalText)
              const voices = synth.getVoices()
              const v = voices.find(x => x.lang === 'en-GB') || voices[0]
              if (v) u.voice = v
              synth.speak(u)
            }
          }
        })
      }
    }

  }, [energy, focus, blockers, morningBet, update, fetchBriefing, get])

  const handleEnter = useCallback(() => {
    // BRUTE FORCE: Set flag FIRST — blocks any queued/in-flight briefing speech
    window._briefingStopped = true

    // Kill browser TTS
    window.speechSynthesis.cancel()

    // Kill ElevenLabs audio
    if (window._jarvisAudio) {
      window._jarvisAudio.pause()
      window._jarvisAudio.currentTime = 0
      window._jarvisAudio = null
    }

    // Kill ALL audio elements on page
    document.querySelectorAll('audio').forEach(a => { a.pause(); a.currentTime = 0 })

    // Kill thinking ticks
    if (window._thinkingStop) { window._thinkingStop(); window._thinkingStop = null }

    // Kill again after 50ms (catches anything that re-queues)
    setTimeout(() => {
      window.speechSynthesis.cancel()
      document.querySelectorAll('audio').forEach(a => { a.pause(); a.currentTime = 0 })
      if (window._jarvisAudio) { window._jarvisAudio.pause(); window._jarvisAudio = null }
    }, 50)

    console.log('BOOT: stopped all audio on ENTER click (_briefingStopped = true)')

    // Chrome audio unlock — use AudioContext only, do NOT speak another utterance
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      ctx.resume()
      console.log('BOOT: audio unlocked')
    } catch (e) {
      console.warn('AUDIO: unlock failed:', e)
    }

    setIsExiting(true)
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
          height: '55vh',
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isExiting ? 0 : (reactorVisible ? 1 : 0),
          transition: isExiting ? 'opacity 0.6s ease-out' : 'opacity 1.2s ease-in',
        }}
      >
        <BootReactor visible={reactorVisible} />
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

          {/* Completed boot lines */}
          {bootLines.map((line, i) => (
            <div key={i} className="font-mono text-xs leading-relaxed flex items-center gap-2" style={{ marginBottom: '2px', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              <span style={{ color: '#00b4d8' }}>{line.text}</span>
              {line.status && (
                <span style={{ color: '#22c55e', fontWeight: 700 }}>{line.status}</span>
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

          {/* Phase 4: Transition Ritual Inputs */}
          {showInputs && (
            <div className="animate-fade-in" style={{ marginTop: '20px' }}>

              {inputStep >= 1 && (
                <div style={{ marginBottom: '16px' }}>
                  <p className="font-mono text-xs" style={{ color: '#00b4d8', marginBottom: '8px' }}>
                    {'>'} Energy level, Sir?
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => { setEnergy(n); if (inputStep === 1) setInputStep(2) }}
                        className="font-display font-bold"
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          border: `2px solid ${energy === n ? '#00f0ff' : '#0d2137'}`,
                          background: energy === n ? 'rgba(0, 180, 216, 0.15)' : 'transparent',
                          color: energy === n ? '#00f0ff' : '#5a7a94',
                          fontSize: '14px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: energy === n ? '0 0 12px rgba(0, 240, 255, 0.3)' : 'none',
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {inputStep >= 2 && (
                <div style={{ marginBottom: '16px' }}>
                  <p className="font-mono text-xs" style={{ color: '#00b4d8', marginBottom: '6px' }}>
                    {'>'} Primary focus today?
                  </p>
                  <input
                    type="text"
                    value={focus}
                    onChange={(e) => setFocus(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && inputStep === 2 && setInputStep(3)}
                    placeholder="What's the main objective..."
                    autoFocus
                    className="font-mono text-xs"
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: '1px solid #0d2137',
                      borderRadius: '4px',
                      padding: '8px 12px',
                      color: '#d0e8f8',
                      outline: 'none',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#00b4d8'}
                    onBlur={(e) => e.target.style.borderColor = '#0d2137'}
                  />
                </div>
              )}

              {inputStep >= 3 && (
                <div style={{ marginBottom: '16px' }}>
                  <p className="font-mono text-xs" style={{ color: '#00b4d8', marginBottom: '6px' }}>
                    {'>'} Any blockers?
                  </p>
                  <input
                    type="text"
                    value={blockers}
                    onChange={(e) => setBlockers(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && inputStep === 3 && setInputStep(4)}
                    placeholder="Anything in the way..."
                    autoFocus
                    className="font-mono text-xs"
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: '1px solid #0d2137',
                      borderRadius: '4px',
                      padding: '8px 12px',
                      color: '#d0e8f8',
                      outline: 'none',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#00b4d8'}
                    onBlur={(e) => e.target.style.borderColor = '#0d2137'}
                  />
                </div>
              )}

              {inputStep >= 4 && (
                <div style={{ marginBottom: '12px' }}>
                  <p className="font-mono text-xs" style={{ color: '#d4a853', marginBottom: '6px' }}>
                    {'>'} Morning Bet: What will you accomplish today?
                  </p>
                  <input
                    type="text"
                    value={morningBet}
                    onChange={(e) => setMorningBet(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleInputsComplete()}
                    placeholder="I will..."
                    autoFocus
                    className="font-mono text-xs"
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: '1px solid rgba(212, 168, 83, 0.3)',
                      borderRadius: '4px',
                      padding: '8px 12px',
                      color: '#d0e8f8',
                      outline: 'none',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#d4a853'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(212, 168, 83, 0.3)'}
                  />
                  <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <button
                      onClick={handleInputsComplete}
                      className="font-mono text-xs"
                      style={{
                        padding: '6px 16px',
                        color: '#00b4d8',
                        border: '1px solid rgba(0, 180, 216, 0.3)',
                        borderRadius: '4px',
                        background: 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(0, 180, 216, 0.08)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      CONFIRM ▸
                    </button>
                  </div>
                </div>
              )}
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

          {/* Phase 6: ENTER JARVIS */}
          {showEnterBtn && (
            <div style={{ textAlign: 'center', marginTop: '28px' }}>
              <button
                onClick={handleEnter}
                className="font-display animate-glow-pulse"
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  letterSpacing: '0.25em',
                  padding: '14px 44px',
                  color: '#00f0ff',
                  border: '2px solid #00f0ff',
                  borderRadius: '8px',
                  background: 'transparent',
                  cursor: 'pointer',
                  textShadow: '0 0 12px rgba(0,240,255,0.6), 0 0 30px rgba(0,240,255,0.3)',
                  boxShadow: '0 0 20px rgba(0,240,255,0.15), inset 0 0 20px rgba(0,240,255,0.05)',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(0, 180, 216, 0.08)'
                  e.target.style.color = '#00f0ff'
                  e.target.style.borderColor = '#00f0ff'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                  e.target.style.color = '#00b4d8'
                  e.target.style.borderColor = '#00b4d8'
                }}
              >
                ENTER JARVIS
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
