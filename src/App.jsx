// App.jsx — JARVIS OS Root Component & State Router
// WHY: This is the orchestrator. It manages the top-level app state:
// 'boot' → cinematic boot sequence plays
// 'main' → header + tab content + bottom nav (the actual app)
// Phase 6: Milestone cinematics (25/50/75/100%), rank-up system,
// 4-hour pulse passthrough to CmdTab.

import { useState, useEffect, useCallback, useRef } from 'react'
import useStorage from './hooks/useStorage.js'
import useSessionTimer from './hooks/useSessionTimer.js'
import useSound from './hooks/useSound.js'
import useEventBus from './hooks/useEventBus.js'
import useStreak from './hooks/useStreak.js'
import useAchievements from './hooks/useAchievements.js'
import useReportScheduler from './hooks/useReportScheduler.js'
import useNotifications from './hooks/useNotifications.js'
import useAutoBackup from './hooks/useAutoBackup.js'
import useContextSave from './hooks/useContextSave.js'
import Boot from './components/Boot.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { runSystemDiagnostics } from './utils/dataIntegrity.js'
import Header from './components/Header.jsx'
import BottomNav from './components/BottomNav.jsx'
import CmdTab from './components/cmd/CmdTab.jsx'
import TrainTab from './components/train/TrainTab.jsx'
import LogTab from './components/log/LogTab.jsx'
import DnaTab from './components/dna/DnaTab.jsx'
import StatsTab from './components/stats/StatsTab.jsx'
import WinsTab from './components/wins/WinsTab.jsx'
import Settings from './components/settings/Settings.jsx'
import QuickCapture from './components/QuickCapture.jsx'
import BackgroundCanvas from './components/BackgroundCanvas.jsx'
import GlobalMic from './components/GlobalMic.jsx'
import VoiceMode from './components/VoiceMode.jsx'
// QuickVoiceOverlay deleted — replaced by full-screen VoiceMode
import Onboarding from './components/Onboarding.jsx'
import ShutdownSequence from './components/ShutdownSequence.jsx'
import CommandLine from './components/CommandLine.jsx'
import useComeback from './hooks/useComeback.js'
import useAutoCapture from './hooks/useAutoCapture.js'
import { initGadgetSchemas } from './utils/gadgetSchemas.js'
import { runOvernightProcessing } from './utils/overnightProcessor.js'
import AmbientMode from './components/AmbientMode.jsx'
import FocusMode from './components/FocusMode.jsx'
import ShutdownCeremony from './components/ShutdownCeremony.jsx'
import { syncOnBoot } from './utils/supabaseSync.js'
import { isSupabaseConfigured } from './utils/supabase.js'
import useVizEngine from './hooks/useVizEngine.js'
import useWeaknessDetector from './hooks/useWeaknessDetector.js'
import useReportGenerator from './hooks/useReportGenerator.js'
import DashboardOverlay from './components/viz/DashboardOverlay.jsx'
import VizDependencyTree from './components/viz/VizDependencyTree.jsx'
import { getDayNumber, getWeekNumber } from './utils/dateUtils.js'
import { jarvisSpeak, jarvisStop, preCacheCommonPhrases, preWarmServer } from './utils/jarvisSpeaker.js'
import useSessionContinuity from './hooks/useSessionContinuity.js'
import { speakTheatrical, SPEECHES, getSpeechText } from './utils/theatricalSpeech.js'
import TASKS from './data/tasks.js'
import GeminiVoiceButton from './components/GeminiVoiceButton.jsx'

const DEFAULT_KEYS = {
  core: { startDate: new Date().toISOString(), totalCheckIns: 0, streak: 0, rank: 'Recruit', completedTasks: [], energy: 3 },
  feelings: [],
  concepts: [],
  msgs: {},
  achievements: [],
  journal: [],
  'api-logs': [],
  settings: { animations: true, sound: true, showMode: false, demoMode: false },
  weekly: {},
  interviews: [],
  commitments: [],
  'morning-bets': [],
  'session-timer': null,
  'quick-capture': [],
  'daily-build': [],
  backup: null,
  knowledge: [],
  decisions: [],
  applications: [],
  'battle-plan': null,
  onboarding: null,
}

// WHY: Rank thresholds based on weekNumber from Bible Section 12
function calculateRank(weekNumber) {
  if (weekNumber >= 7) return 'Architect'
  if (weekNumber >= 5) return 'Commander'
  if (weekNumber >= 3) return 'Operative'
  return 'Recruit'
}

// WHY: Milestone thresholds — each fires ONCE at these completion percentages
const MILESTONES = [
  { pct: 25, speech: '25% complete, Sir. A solid foundation.' },
  { pct: 50, speech: 'Halfway there, Sir. Impressive consistency.' },
  { pct: 75, speech: '75% complete, Sir. Remarkable progress.' },
  { pct: 100, speech: 'All tasks complete, Sir. You have exceeded expectations. It has been an honour.' },
]

function App() {
  const { get, set, update } = useStorage()
  const { play } = useSound()
  const eventBus = useEventBus()
  const { captureTab } = useAutoCapture()
  useSessionContinuity() // Auto-saves session state for inter-session memory

  const [appState, setAppState] = useState(() => {
    if (!localStorage.getItem('jos-onboarding')) return 'onboarding'
    // Boot only once per day — skip to main on refresh
    try {
      const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
      const today = new Date().toISOString().split('T')[0]
      if (core.lastBootDate === today) return 'main'
    } catch { /* boot normally */ }
    return 'boot'
  })
  const [activeTab, setActiveTab] = useState('cmd')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showScanSweep, setShowScanSweep] = useState(false)
  const [showShutdown, setShowShutdown] = useState(false)
  const [showCommandLine, setShowCommandLine] = useState(false)
  const contentRef = useRef(null)
  const { elapsed } = useSessionTimer()

  // Milestone cinematic state
  const [milestoneOverlay, setMilestoneOverlay] = useState(null)
  // Rank-up overlay state
  const [rankUpOverlay, setRankUpOverlay] = useState(null)
  // Pulse notification dot for CMD tab
  const [hasPulse, setHasPulse] = useState(false)
  // Voice mode state
  const [voiceModeOpen, setVoiceModeOpen] = useState(false)
  // quickVoiceOpen removed — VoiceMode is the one voice interface
  const [requestedMode, setRequestedMode] = useState(null)
  const [globalVoiceState, setGlobalVoiceState] = useState('IDLE')
  const [isAmbient, setIsAmbient] = useState(false)
  const [focusMode, setFocusMode] = useState(null)
  const [showCeremony, setShowCeremony] = useState(false)
  const idleTimerRef = useRef(null)

  // Initialize gadget schemas + run overnight processing
  useEffect(() => { initGadgetSchemas(); runOvernightProcessing() }, [])

  // Auto-ambient after 10 minutes of no interaction
  useEffect(() => {
    const resetIdle = () => {
      clearTimeout(idleTimerRef.current)
      if (isAmbient) setIsAmbient(false)
      idleTimerRef.current = setTimeout(() => setIsAmbient(true), 10 * 60 * 1000)
    }
    window.addEventListener('click', resetIdle)
    window.addEventListener('keydown', resetIdle)
    window.addEventListener('touchstart', resetIdle)
    resetIdle()
    return () => {
      window.removeEventListener('click', resetIdle)
      window.removeEventListener('keydown', resetIdle)
      window.removeEventListener('touchstart', resetIdle)
      clearTimeout(idleTimerRef.current)
    }
  }, [isAmbient])

  // One-time task migration for Session 58 — old JARVIS-build tasks → FinOps tasks
  useEffect(() => {
    try {
      const migrated = localStorage.getItem('jos-tasks-v2-migrated')
      if (!migrated) {
        const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
        if (core.completedTasks && core.completedTasks.length > 0) {
          localStorage.setItem('jos-old-completed-tasks', JSON.stringify(core.completedTasks))
          core.completedTasks = []
          localStorage.setItem('jos-core', JSON.stringify(core))
        }
        localStorage.setItem('jos-tasks-v2-migrated', 'true')
      }
    } catch { /* ok */ }
  }, [])

  // Force re-render when voice commands change localStorage externally
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const h = () => forceUpdate(n => n + 1)
    window.addEventListener('jarvis-task-toggled', h)
    return () => window.removeEventListener('jarvis-task-toggled', h)
  }, [])

  const comebackState = useComeback()
  const { dashboard, showDashboard, closeDashboard } = useVizEngine(eventBus)
  const { weakness, dismissWeakness } = useWeaknessDetector(eventBus)
  const reportGen = useReportGenerator()
  const [showDepTree, setShowDepTree] = useState(false)
  useStreak(eventBus)
  useAchievements()
  useNotifications()
  useAutoBackup()
  useContextSave(activeTab, (tab) => setActiveTab(tab))
  const { pulse, dismissPulse } = useReportScheduler()

  // Track pulse for notification dot
  useEffect(() => {
    if (pulse && activeTab !== 'cmd') {
      setHasPulse(true)
    }
  }, [pulse, activeTab])

  // Initialize all localStorage keys on first mount
  useEffect(() => {
    Object.entries(DEFAULT_KEYS).forEach(([key, defaultValue]) => {
      const existing = get(key)
      if (existing === null) {
        set(key, defaultValue)
      }
    })
  }, [get, set])

  // Global Escape key → stop all JARVIS audio
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && window.jarvisStop) {
        window.jarvisStop()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Backtick toggles CommandLine
  useEffect(() => {
    const h = (e) => { if (e.key === '`' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setShowCommandLine(prev => !prev) } }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  // Shutdown listener (from Settings button + voice command)
  useEffect(() => {
    const h = () => setShowShutdown(true)
    window.addEventListener('jarvis-request-shutdown', h)
    return () => window.removeEventListener('jarvis-request-shutdown', h)
  }, [])

  // Supabase boot sync
  useEffect(() => {
    if (isSupabaseConfigured()) syncOnBoot()
  }, [])

  // Chrome voices load async — reset cache when they arrive
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window._jarvisVoice = null // Reset cache so next speak picks voice
        console.log('VOICES: loaded', window.speechSynthesis.getVoices().length, 'voices')
      }
    }
  }, [])

  const core = get('core') || DEFAULT_KEYS.core
  const dayNumber = getDayNumber(core.startDate)
  const weekNumber = getWeekNumber(core.startDate)
  const completedTasks = core.completedTasks || []

  // ============================================================
  // RANK-UP CHECK — runs on boot transition
  // ============================================================
  const rankChecked = useRef(false)
  useEffect(() => {
    if (appState !== 'main' || rankChecked.current) return
    rankChecked.current = true

    const currentRank = core.rank || 'Recruit'
    const newRank = calculateRank(weekNumber)

    if (newRank !== currentRank) {
      update('core', prev => ({ ...prev, rank: newRank }))

      // WHY: Show rank-up overlay with theatrical cinematic announcement
      setRankUpOverlay({ from: currentRank, to: newRank })
      play('milestone')

      // Theatrical speech: dramatic pauses between segments
      const segments = SPEECHES.rankUp(newRank)
      speakTheatrical(segments, jarvisSpeak)

      setTimeout(() => setRankUpOverlay(null), 7000)
    }
  }, [appState, core.rank, weekNumber, update, play])

  // ============================================================
  // MILESTONE CHECK — fires when tasks change
  // ============================================================
  const prevTaskCount = useRef(completedTasks.length)
  useEffect(() => {
    if (appState !== 'main') return
    if (completedTasks.length <= prevTaskCount.current) {
      prevTaskCount.current = completedTasks.length
      return
    }
    prevTaskCount.current = completedTasks.length

    const pct = Math.round((completedTasks.length / TASKS.length) * 100)
    const achievements = get('achievements') || []
    const firedMilestones = achievements.filter(a => a.id?.startsWith('milestone-')).map(a => a.id)

    for (const ms of MILESTONES) {
      const msId = `milestone-${ms.pct}`
      if (pct >= ms.pct && !firedMilestones.includes(msId)) {
        // Fire this milestone
        update('achievements', prev => [
          ...(prev || []),
          { id: msId, unlockedAt: new Date().toISOString() },
        ])

        // Cinematic! Theatrical speech with pauses for milestones
        setMilestoneOverlay(ms)
        play('milestone')

        const theatricalKey = `milestone${ms.pct}`
        const segments = SPEECHES[theatricalKey]
        if (segments) {
          speakTheatrical(segments, jarvisSpeak)
        } else {
          jarvisSpeak(ms.speech)
        }

        // Dismiss after longer duration for theatrical
        const duration = ms.pct === 100 ? 10000 : ms.pct >= 50 ? 5000 : 3500
        setTimeout(() => setMilestoneOverlay(null), duration)

        break // Only fire one milestone at a time
      }
    }
  }, [completedTasks.length, appState, get, update, play])

  const handleBootComplete = useCallback(() => {
    // Save boot date — prevents re-boot on same-day refresh
    try {
      const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
      core.lastBootDate = new Date().toISOString().split('T')[0]
      localStorage.setItem('jos-core', JSON.stringify(core))
    } catch { /* ok */ }
    setAppState('main')
    window._briefingStopped = false
    console.log('BOOT COMPLETE: voice server warming, phrase cache starting')
    // Pre-warm voice server + cache common phrases in background
    preWarmServer()
    setTimeout(() => preCacheCommonPhrases(), 2000) // after boot settles
    // Start ambient sound
    try { play('boot') } catch { /* ok */ }
    // Show boot briefing dashboard after 1s
    setTimeout(() => showDashboard('boot-briefing'), 1000)
    // JARVIS self-diagnostics — tests ALL systems on every boot
    runSystemDiagnostics().then(report => {
      if (report.status === 'CRITICAL') console.error('[JARVIS] CRITICAL: Multiple systems down')
      else if (report.status === 'DEGRADED') console.warn('[JARVIS] DEGRADED: Some systems have issues')
    })
  }, [play, showDashboard])

  const handleToggleTask = useCallback((taskId) => {
    const current = get('core') || DEFAULT_KEYS.core
    const done = current.completedTasks || []
    const isDone = done.includes(taskId)

    if (isDone) {
      update('core', prev => ({
        ...prev,
        completedTasks: (prev.completedTasks || []).filter(id => id !== taskId),
      }))
      play('click')
    } else {
      update('core', prev => ({
        ...prev,
        completedTasks: [...(prev.completedTasks || []), taskId],
        taskCompletionTimestamps: [
          ...(prev.taskCompletionTimestamps || []).slice(-20),
          new Date().toISOString(),
        ],
      }))
      play('check')
      eventBus.emit('task:complete', { taskId })
    }
  }, [get, update, play, eventBus])

  const handleEnergyChange = useCallback((level) => {
    update('core', prev => ({ ...prev, energy: level }))
    eventBus.emit('energy:change', { energy: level })
  }, [update, eventBus])

  const handleTabChange = useCallback((tab) => {
    if (window.jarvisStop) window.jarvisStop()
    // Glitch transition
    if (contentRef.current) {
      contentRef.current.classList.add('glitch-transition')
      setTimeout(() => contentRef.current?.classList.remove('glitch-transition'), 250)
    }
    setShowScanSweep(true)
    setTimeout(() => setShowScanSweep(false), 400)
    setActiveTab(tab)
    captureTab(tab)
    play('tab')
    if (tab === 'cmd') setHasPulse(false)
  }, [play, captureTab])

  // Global listener for jarvis-activate-mic — works from ANY tab (Bug 1 fix)
  useEffect(() => {
    const handler = () => setVoiceModeOpen(true)
    window.addEventListener('jarvis-activate-mic', handler)
    return () => window.removeEventListener('jarvis-activate-mic', handler)
  }, [])

  // GlobalMic tap: always open VoiceMode (full-screen exocortex)
  const handleGlobalMicTap = useCallback(() => {
    setVoiceModeOpen(true)
  }, [])

  // GlobalMic long press: open full-screen VoiceMode
  const handleGlobalMicLongPress = useCallback(() => {
    setVoiceModeOpen(true)
  }, [])

  const handleModeOpened = useCallback(() => {
    setRequestedMode(null)
  }, [])

  if (appState === 'onboarding') {
    return <Onboarding onComplete={() => setAppState('boot')} />
  }

  if (appState === 'boot') {
    return <Boot onComplete={handleBootComplete} />
  }

  const renderTab = () => {
    const content = (() => {
      switch (activeTab) {
        case 'cmd':
          return <CmdTab completedTasks={completedTasks} onToggleTask={handleToggleTask} pulse={pulse} onDismissPulse={dismissPulse} weakness={weakness} onWeaknessTap={() => setShowDepTree(true)} onWeaknessDismiss={dismissWeakness} />
        case 'train':
          return <TrainTab weekNumber={weekNumber} requestedMode={requestedMode} onModeOpened={handleModeOpened} />
        case 'log':
          return <LogTab elapsed={elapsed} />
        case 'dna':
          return <DnaTab />
        case 'stats':
          return <StatsTab />
        case 'wins':
          return <WinsTab />
        default:
          return null
      }
    })()
    return <ErrorBoundary>{content}</ErrorBoundary>
  }

  return (
    <div className="min-h-screen bg-void flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
      <BackgroundCanvas />
      <Header
        dayNumber={dayNumber}
        weekNumber={weekNumber}
        streak={core.streak}
        elapsed={elapsed}
        rank={core.rank}
        energy={core.energy}
        onEnergyChange={handleEnergyChange}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      {showScanSweep && <div className="scan-sweep-full" />}
      <main ref={contentRef} className="flex-1 pb-28 px-4 pt-4">
        {renderTab()}
      </main>

      <QuickCapture />
      <GlobalMic
        onTap={handleGlobalMicTap}
        onLongPress={handleGlobalMicLongPress}
        voiceState={globalVoiceState}
      />
      <GeminiVoiceButton />
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        hasPulse={hasPulse}
      />
      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Full-screen Voice Mode overlay */}
      {voiceModeOpen && (
        <VoiceMode
          onClose={() => setVoiceModeOpen(false)}
          initialMode="chat"
          weekNumber={weekNumber}
        />
      )}

      {/* QuickVoiceOverlay removed — VoiceMode is the voice interface */}

      {/* Command Line */}
      {showCommandLine && <CommandLine onClose={() => setShowCommandLine(false)} />}

      {/* Viz Dashboard Overlay */}
      {dashboard && <DashboardOverlay type={dashboard.type} onClose={closeDashboard} />}

      {/* Dependency Tree */}
      {showDepTree && weakness && (
        <VizDependencyTree rootConcept={weakness.concept} onQuizConcept={() => { setShowDepTree(false); setActiveTab('train') }} onClose={() => setShowDepTree(false)} />
      )}

      {/* Shutdown Ceremony (upgraded) */}
      {showShutdown && <ShutdownCeremony onComplete={() => setShowShutdown(false)} />}

      {/* Ambient Standby */}
      {isAmbient && <AmbientMode onWake={() => setIsAmbient(false)} />}

      {/* Focus Lock */}
      {focusMode && (
        <FocusMode target={focusMode.target} duration={focusMode.duration}
          completedTasks={(get('core') || {}).completedTasks || []}
          onToggleTask={handleToggleTask}
          onEnd={() => setFocusMode(null)} />
      )}

      {/* ============================================================ */}
      {/* MILESTONE CINEMATIC OVERLAY */}
      {/* ============================================================ */}
      {milestoneOverlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            backgroundColor: milestoneOverlay.pct === 100
              ? 'rgba(2, 10, 19, 0.95)'
              : 'rgba(2, 10, 19, 0.85)',
            animation: 'fade-in 0.5s ease-out',
          }}
          onClick={() => setMilestoneOverlay(null)}
        >
          <div className="text-center">
            {/* Gold flash for reactor */}
            <div
              className="w-16 h-16 mx-auto mb-6 rounded-full animate-pulse"
              style={{
                background: 'radial-gradient(circle, #d4a853 0%, rgba(212, 168, 83, 0.3) 50%, transparent 70%)',
                boxShadow: '0 0 40px rgba(212, 168, 83, 0.5), 0 0 80px rgba(212, 168, 83, 0.2)',
              }}
            />

            <p className="font-display text-4xl font-bold text-gold tracking-wider mb-4"
              style={{ textShadow: '0 0 20px rgba(212, 168, 83, 0.5)' }}>
              {milestoneOverlay.pct}%
            </p>

            <p className="font-body text-lg text-text max-w-sm mx-auto leading-relaxed">
              {milestoneOverlay.speech}
            </p>

            {milestoneOverlay.pct === 100 && (
              <div className="mt-6">
                <span className="font-mono text-[10px] text-gold/60 tracking-widest">
                  MISSION ACCOMPLISHED
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* RANK-UP OVERLAY */}
      {/* ============================================================ */}
      {rankUpOverlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(2, 10, 19, 0.9)',
            animation: 'fade-in 0.5s ease-out',
          }}
          onClick={() => setRankUpOverlay(null)}
        >
          <div className="text-center">
            <p className="font-mono text-xs text-text-muted tracking-widest mb-4">
              RANK PROMOTION
            </p>

            <div className="flex items-center justify-center gap-4 mb-6">
              <span className="font-display text-lg text-text-dim line-through">
                {rankUpOverlay.from}
              </span>
              <span className="font-mono text-gold text-xl">→</span>
              <span
                className="font-display text-3xl font-bold text-gold tracking-wider animate-pulse"
                style={{ textShadow: '0 0 20px rgba(212, 168, 83, 0.5)' }}
              >
                {rankUpOverlay.to}
              </span>
            </div>

            <p className="font-display text-lg text-gold">
              {rankUpOverlay.to} Panwar
            </p>

            <p className="font-body text-sm text-text-dim mt-4">
              Congratulations, Sir.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
