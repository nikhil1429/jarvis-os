// CheckInForm.jsx — Daily check-in form with tap selectors + morning bet scoring
// WHY: Quick tap-tap-tap input, not endless scrolling. 1-5 selectors as horizontal
// button groups, Y/N as toggles. Saves to jos-feelings with ISO timestamp.
// Phase 6: After save, triggers daily debrief generation (Opus API call).
// Also shows Morning Bet Results section comparing predictions vs actual tasks done.

import { useState, useEffect, useCallback } from 'react'
import { Check, ClipboardCheck, Target } from 'lucide-react'
import useStorage from '../../hooks/useStorage.js'
import useSound from '../../hooks/useSound.js'
import useEventBus from '../../hooks/useEventBus.js'
import { compileSummary } from '../../utils/strategicCompiler.js'
import { bridgeCheckinToBiometrics } from '../../utils/gadgetSchemas.js'

// WHY: Reusable tap selector — renders N buttons in a row, highlights selected
function TapSelector({ label, value, onChange, max = 5, colors }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-xs text-text-dim tracking-wider w-24 flex-shrink-0">{label}</span>
      <div className="flex gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-8 h-8 rounded font-display text-sm font-bold transition-all duration-150 border
              ${value === n
                ? 'border-cyan text-cyan bg-cyan/15'
                : 'border-border text-text-muted hover:border-cyan/30 hover:text-text-dim'
              }`}
            style={value === n && colors ? {
              borderColor: colors[n] || '#00b4d8',
              color: colors[n] || '#00b4d8',
              backgroundColor: (colors[n] || '#00b4d8') + '20',
            } : undefined}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

function YNToggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-xs text-text-dim tracking-wider w-24 flex-shrink-0">{label}</span>
      <div className="flex gap-2">
        {['Y', 'N'].map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt === 'Y')}
            className={`px-4 py-1.5 rounded font-mono text-xs font-bold transition-all duration-150 border
              ${value === (opt === 'Y')
                ? opt === 'Y'
                  ? 'border-green-500 text-green-400 bg-green-500/15'
                  : 'border-red-500 text-red-400 bg-red-500/15'
                : 'border-border text-text-muted hover:border-cyan/30'
              }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function getFormLevel(core) {
  const consecutiveSkips = core?.consecutiveSkips || 0
  const consecutiveCompletions = core?.consecutiveCompletions || 0
  if (consecutiveCompletions >= 2) return 'full'
  if (consecutiveSkips >= 4) return 'minimal'
  if (consecutiveSkips >= 2) return 'simple'
  return 'full'
}

export default function CheckInForm() {
  const { get, update } = useStorage()
  const { play } = useSound()
  const eventBus = useEventBus()
  const [saved, setSaved] = useState(false)
  const [debriefing, setDebriefing] = useState(false)
  const [debrief, setDebrief] = useState(null)
  const [debriefExpanded, setDebriefExpanded] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const core = get('core') || {}
  const formLevel = getFormLevel(core)

  const [form, setForm] = useState({
    confidence: null,
    focus: null,
    motivation: null,
    social: null,
    sleep: null,
    meds: null,
    mood: '',
    coffee: 0,
    lunch: null,
    learned: '',
    struggled: '',
    excited: '',
    journal: '',
  })

  // Load today's check-in if exists

  // Load existing debrief for today
  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }
  // WHY: Generate daily debrief via Opus API after check-in save

  const generateDebrief = useCallback(async () => {
    setDebriefing(true)
    try {
      const summary = compileSummary()
      const feelings = get('feelings') || []
      const todayEntry = feelings.find(f => f.date === today)

      // Morning bet comparison
      const bets = get('morning-bets') || []
      const todayBet = bets.find(b => b.date === today)
      let betContext = ''
      if (todayBet) {
        const completedTasks = (get('core') || {}).completedTasks || []
        betContext = `Morning Bet: "${todayBet.bet}". Tasks completed today: ${completedTasks.length}.`
      }

      const prompt = `Generate daily debrief for Nikhil Panwar. Data:
${summary}
Today's check-in: confidence=${todayEntry?.confidence}, focus=${todayEntry?.focus}, motivation=${todayEntry?.motivation}, mood="${todayEntry?.mood}", learned="${todayEntry?.learned}", struggled="${todayEntry?.struggled}"
${betContext}

Include: tasks completed today, training modes used, mood/energy trends from check-in, morning bet accuracy (if applicable).
End with ONE specific recommendation for tomorrow.
Tone: JARVIS formal British, call him Sir. Keep under 150 words. No markdown.`

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 512,
          system: 'You are JARVIS OS. Speak like Paul Bettany\'s JARVIS: formal, British, precise. Call him "Sir". Generate a concise daily debrief.',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
      })

      if (!response.ok) throw new Error(`API ${response.status}`)
      const data = await response.json()
      const text = data.content?.[0]?.text || data.text || 'Debrief generation failed, Sir.'

      const debriefEntry = {
        date: today,
        type: 'daily-debrief',
        text,
        timestamp: new Date().toISOString(),
      }

      // Save to jos-weekly.debriefs array
      update('weekly', prev => {
        const existing = (typeof prev === 'object' && !Array.isArray(prev)) ? prev : {}
        const debriefs = existing.debriefs || []
        const filtered = debriefs.filter(w => !(w.date === today && w.type === 'daily-debrief'))
        return { ...existing, debriefs: [...filtered, debriefEntry] }
      })

      setDebrief(debriefEntry)
      setDebriefExpanded(true)
      // Voice-first: speak debrief through Gemini
      window.dispatchEvent(new CustomEvent('jarvis-speak', { detail: { text } }))

    } catch (err) {
      console.error('[CheckInForm] Debrief generation failed:', err)
    } finally {
      setDebriefing(false)
    }
  }, [get, update, today])

  useEffect(() => {
    const feelings = get('feelings') || []
    const todayEntry = feelings.find(f => f.date === today)
    if (todayEntry) {
      setForm(prev => ({ ...prev, ...todayEntry }))
    }
  }, [get, today])

  useEffect(() => {
    const weekly = get('weekly') || {}
    const debriefs = weekly.debriefs || []
    const todayDebrief = debriefs.find(w => w.date === today && w.type === 'daily-debrief')
    if (todayDebrief) setDebrief(todayDebrief)
  }, [get, today])


  const handleSave = () => {
    const entry = {
      ...form,
      date: today,
      timestamp: new Date().toISOString(),
      formLevel,
    }

    update('feelings', prev => {
      const existing = prev || []
      const filtered = existing.filter(f => f.date !== today)
      return [...filtered, entry]
    })

    update('core', prev => ({
      ...prev,
      totalCheckIns: (prev?.totalCheckIns || 0) + (form._counted ? 0 : 1),
      consecutiveSkips: 0,
      consecutiveCompletions: (prev?.consecutiveCompletions || 0) + 1,
    }))

    setForm(prev => ({ ...prev, _counted: true }))

    eventBus.emit('checkin:submit', entry)
    bridgeCheckinToBiometrics(entry)
    import('../../utils/supabaseSync.js').then(m => m.logCheckinToCloud(entry)).catch(() => {})
    play('check')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)

    // WHY: Trigger daily debrief after check-in save (Bible Section 20: Tier 2)
    generateDebrief()
  }

  // Morning Bet Results
  const morningBets = get('morning-bets') || []
  const todayBet = morningBets.find(b => b.date === today)
  const completedTaskCount = (core.completedTasks || []).length

  const hasToday = (get('feelings') || []).some(f => f.date === today)
  const filledCount = [
    form.confidence,
    form.focus,
    form.motivation,
    form.sleep,
    form.mood,
    form.learned,
    form.struggles,
  ].filter(v => v !== undefined && v !== null && v !== '' && v !== 0).length
  const isMinFilled = filledCount >= 3

  return (
    <div className="space-y-4">
      {/* Morning Bet Results */}
      {todayBet && (
        <div className="glass-card p-4 border-l-2 border-l-gold">
          <div className="hud-panel-inner">
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-gold" />
              <h4 className="font-display text-sm font-bold text-gold tracking-wider uppercase gold-heading">
                Morning Bet Results
              </h4>
            </div>
            <p className="font-body text-xs text-text-dim mb-1">
              <span className="text-text">Prediction:</span> {todayBet.bet}
            </p>
            <p className="font-body text-xs text-text-dim">
              <span className="text-text">Tasks completed:</span>{' '}
              <span className="text-cyan font-bold">{completedTaskCount}</span>
            </p>
            {todayBet.predictions && todayBet.predictions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {todayBet.predictions.map((p, i) => (
                  <span key={i} className="font-mono text-[10px] px-2 py-0.5 rounded border border-gold/30 text-gold/80 bg-gold/5">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Check-In Form */}
      <div className={`glass-card p-4 transition-all duration-300 ${
        !hasToday ? 'ring-1 ring-cyan/30 shadow-cyan-glow' : ''
      }`}>
        <div className="hud-panel-inner">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={18} className={hasToday ? 'text-green-400' : 'text-cyan'} />
              <h3 className="font-display text-lg font-bold text-cyan tracking-wider uppercase neon-heading">
                Daily Check-In
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {hasToday && (
                <span className="font-mono text-[10px] text-green-400 tracking-wider">DONE TODAY</span>
              )}
              {formLevel !== 'full' && (
                <span className="font-mono text-[10px] text-amber-400 tracking-wider">(SIMPLIFIED)</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <TapSelector label="CONFIDENCE" value={form.confidence} onChange={v => updateField('confidence', v)} />

            {formLevel !== 'minimal' && (
              <>
                <TapSelector label="FOCUS" value={form.focus} onChange={v => updateField('focus', v)} />
                <TapSelector label="MOTIVATION" value={form.motivation} onChange={v => updateField('motivation', v)} />
              </>
            )}

            {formLevel === 'full' && (
              <>
                <TapSelector label="SOCIAL" value={form.social} onChange={v => updateField('social', v)} max={3} />
                <TapSelector label="SLEEP" value={form.sleep} onChange={v => updateField('sleep', v)} />
              </>
            )}

            {formLevel === 'full' && (
              <div className="border-t border-border pt-3 space-y-3">
                <YNToggle label="MEDS" value={form.meds} onChange={v => updateField('meds', v)} />
                <YNToggle label="LUNCH" value={form.lunch} onChange={v => updateField('lunch', v)} />

                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-text-dim tracking-wider w-24">COFFEE</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateField('coffee', Math.max(0, (form.coffee || 0) - 1))}
                      className="w-8 h-8 rounded border border-border text-text-muted hover:border-cyan/30 font-bold"
                    >−</button>
                    <span className="font-mono text-sm text-text w-6 text-center">{form.coffee || 0}</span>
                    <button
                      onClick={() => updateField('coffee', (form.coffee || 0) + 1)}
                      className="w-8 h-8 rounded border border-border text-text-muted hover:border-cyan/30 font-bold"
                    >+</button>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-border pt-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-text-dim tracking-wider w-24 flex-shrink-0">MOOD</span>
                <input
                  type="text"
                  value={form.mood}
                  onChange={e => updateField('mood', e.target.value)}
                  placeholder="One word..."
                  className="flex-1 bg-void border border-border rounded px-3 py-1.5 font-body text-sm
                    text-text placeholder:text-text-muted focus:outline-none focus:border-cyan transition-colors"
                />
              </div>

              {formLevel !== 'minimal' && [
                { key: 'learned', placeholder: 'What I learned today...' },
                { key: 'struggled', placeholder: 'What I struggled with...' },
                { key: 'excited', placeholder: 'What excites me...' },
              ].map(({ key, placeholder }) => (
                <input
                  key={key}
                  type="text"
                  value={form[key]}
                  onChange={e => updateField(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-void border border-border rounded px-3 py-1.5 font-body text-sm
                    text-text placeholder:text-text-muted focus:outline-none focus:border-cyan transition-colors"
                />
              ))}

              <textarea
                value={form.journal}
                onChange={e => updateField('journal', e.target.value)}
                placeholder="Micro-journal (free thoughts)..."
                rows={3}
                className="w-full bg-void border border-border rounded px-3 py-2 font-body text-sm
                  text-text placeholder:text-text-muted focus:outline-none focus:border-cyan
                  transition-colors resize-none"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!isMinFilled}
              className={`w-full py-2.5 rounded font-display text-sm font-bold tracking-wider
                uppercase transition-all duration-200 border ${
                saved
                  ? 'bg-green-500/15 border-green-500 text-green-400'
                  : isMinFilled
                    ? 'bg-cyan/10 border-cyan/40 text-cyan hover:bg-cyan/20'
                    : 'bg-card border-border text-text-muted cursor-not-allowed'
              }`}
            >
              {saved ? (
                <span className="flex items-center justify-center gap-2">
                  <Check size={16} /> SAVED
                </span>
              ) : hasToday ? 'UPDATE CHECK-IN' : 'SAVE CHECK-IN'}
            </button>
          </div>
        </div>
      </div>

      {/* Daily Debrief Card */}
      {(debrief || debriefing) && (
        <div className="glass-card overflow-hidden border-t-2 border-t-gold">
          <div className="hud-panel-inner p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-display text-sm font-bold text-gold tracking-wider uppercase gold-heading">
                [ Daily Debrief ]
              </h4>
              {debrief && (
                <button
                  onClick={() => setDebriefExpanded(!debriefExpanded)}
                  className="font-mono text-[10px] text-text-muted hover:text-cyan transition-colors tracking-wider"
                >
                  {debriefExpanded ? 'COLLAPSE' : 'EXPAND'}
                </button>
              )}
            </div>

            {debriefing && !debrief && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="font-mono text-[10px] text-text-muted tracking-wider">
                  JARVIS IS COMPILING DEBRIEF...
                </span>
              </div>
            )}

            {debrief && debriefExpanded && (
              <p className="font-body text-sm text-text leading-relaxed">
                {debrief.text}
              </p>
            )}

            {debrief && !debriefExpanded && (
              <p className="font-body text-xs text-text-dim line-clamp-2">
                {debrief.text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
