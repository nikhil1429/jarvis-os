// BodyDoubleTimer.jsx — 25/45 minute co-working timer
// WHY: Body doubling is an ADHD technique — having someone "present" while you work
// reduces task paralysis. This timer creates a structured work session where JARVIS
// is silently present. Color shifts create urgency: cyan (plenty of time) → gold
// (<5min remaining) → red (<1min). Session is logged to jos-session-timer.

import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, Clock } from 'lucide-react'
import useStorage from '../../hooks/useStorage.js'
import useSound from '../../hooks/useSound.js'

const PRESETS = [
  { label: '25 min', seconds: 25 * 60 },
  { label: '45 min', seconds: 45 * 60 },
]

export default function BodyDoubleTimer() {
  const { update } = useStorage()
  const { play } = useSound()
  const [duration, setDuration] = useState(null)
  const [remaining, setRemaining] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const intervalRef = useRef(null)
  const startTimeRef = useRef(null)

  // Timer tick
  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            setIsRunning(false)
            setIsComplete(true)
            play('milestone')
            logSession()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [isRunning]) // eslint-disable-line react-hooks/exhaustive-deps

  const logSession = useCallback(() => {
    update('session-timer', prev => {
      const today = new Date().toISOString().split('T')[0]
      const existing = prev || { date: today, sessions: [], totalMinutes: 0 }
      if (existing.date !== today) {
        existing.date = today
        existing.sessions = []
        existing.totalMinutes = 0
      }
      existing.sessions.push({
        type: 'body-double',
        duration: duration,
        start: startTimeRef.current,
        end: new Date().toISOString(),
      })
      existing.totalMinutes += Math.round((duration - remaining) / 60)
      return existing
    })
  }, [update, duration, remaining])

  const handleStart = (preset) => {
    setDuration(preset.seconds)
    setRemaining(preset.seconds)
    setIsRunning(true)
    setIsComplete(false)
    startTimeRef.current = new Date().toISOString()
    play('tab')
  }

  const togglePause = () => {
    setIsRunning(prev => !prev)
  }

  const handleReset = () => {
    clearInterval(intervalRef.current)
    setDuration(null)
    setRemaining(0)
    setIsRunning(false)
    setIsComplete(false)
  }

  // Format remaining time as MM:SS
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  // Color based on remaining time
  const getColor = () => {
    if (remaining <= 60) return '#ef4444'  // Red: < 1 min
    if (remaining <= 300) return '#d4a853' // Gold: < 5 min
    return '#00b4d8'                        // Cyan: plenty of time
  }

  // Progress percentage
  const progress = duration ? ((duration - remaining) / duration) * 100 : 0

  // Preset selection screen
  if (!duration) {
    return (
      <div className="glass-card p-6">
        <div className="hud-panel-inner">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} className="text-cyan" />
            <h3 className="font-display text-xl font-bold text-cyan tracking-wider uppercase">
              Body Double Timer
            </h3>
          </div>

          <p className="font-body text-sm text-text-dim mb-6">
            JARVIS will be silently present while you work. Choose your session length.
          </p>

          <div className="flex gap-3">
            {PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => handleStart(preset)}
                className="flex-1 glass-card p-4 text-center
                  hover:border-cyan/40 transition-all duration-200 group"
              >
                <div className="hud-panel-inner">
                  <span className="font-display text-2xl font-bold text-text
                    group-hover:text-cyan transition-colors">
                    {preset.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Active timer / completion screen
  const color = getColor()

  return (
    <div className="glass-card p-6">
      <div className="hud-panel-inner">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-lg font-bold tracking-wider uppercase"
            style={{ color }}>
            Body Double
          </h3>
          <span className="font-mono text-[10px] text-text-muted tracking-wider">
            {isComplete ? 'SESSION COMPLETE' : isRunning ? 'IN SESSION' : 'PAUSED'}
          </span>
        </div>

        {/* Timer display */}
        <div className="text-center mb-6">
          <span
            className="font-mono text-6xl font-bold tracking-widest"
            style={{ color, textShadow: `0 0 20px ${color}40` }}
          >
            {timeStr}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-border rounded-full mb-6 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${progress}%`,
              backgroundColor: color,
              boxShadow: `0 0 8px ${color}60`,
            }}
          />
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          {!isComplete && (
            <button
              onClick={togglePause}
              className="p-3 rounded-full border transition-all duration-200"
              style={{
                borderColor: color + '40',
                color,
                backgroundColor: color + '10',
              }}
            >
              {isRunning ? <Pause size={24} /> : <Play size={24} />}
            </button>
          )}

          <button
            onClick={handleReset}
            className="p-3 rounded-full border border-border text-text-dim
              hover:border-cyan/40 hover:text-cyan transition-all duration-200"
          >
            <RotateCcw size={24} />
          </button>
        </div>

        {/* Completion message */}
        {isComplete && (
          <div className="mt-6 text-center">
            <p className="font-display text-lg text-gold">Session Complete, Sir.</p>
            <p className="font-body text-sm text-text-dim mt-1">
              {Math.round(duration / 60)} minutes of focused work logged.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
