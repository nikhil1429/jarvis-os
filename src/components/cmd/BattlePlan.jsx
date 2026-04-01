// BattlePlan.jsx — AI-generated daily battle plan mapped to energy windows
// WHY: Uses energy level, overdue concepts, pending tasks to create a prioritized
// plan. Hardest work during peak cortisol, lighter work post-lunch.

import { useState } from 'react'
import { Shield, RefreshCw, Check } from 'lucide-react'
import useAI from '../../hooks/useAI.js'
import useStorage from '../../hooks/useStorage.js'
import TASKS from '../../data/tasks.js'
import CONCEPTS from '../../data/concepts.js'
import { getReviewSchedule } from '../../utils/spacedRepetition.js'
import { getTimeOfDay } from '../../utils/dateUtils.js'

export default function BattlePlan() {
  const { sendMessage, isStreaming } = useAI()
  const { get, update } = useStorage()
  const [generating, setGenerating] = useState(false)

  const core = get('core') || {}
  const feelings = get('feelings') || []
  const today = new Date().toISOString().split('T')[0]
  const plan = get('battle-plan')
  const todayPlan = plan?.date === today ? plan : null

  // Check if check-in done today
  const hasCheckin = feelings.some(f => (f.date || f.timestamp?.split('T')[0]) === today)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const completed = core.completedTasks || []
      const pending = TASKS.filter(t => !completed.includes(t.id)).slice(0, 5).map(t => t.name)
      const savedConcepts = get('concepts') || []
      const overdue = CONCEPTS.map(c => {
        const s = savedConcepts.find(x => x.id === c.id) || {}
        const sched = getReviewSchedule(s)
        return sched.isOverdue ? c.name : null
      }).filter(Boolean).slice(0, 3)

      let medTime = 'unknown'
      try {
        const ob = JSON.parse(localStorage.getItem('jos-onboarding') || '{}')
        medTime = ob.adhd?.medicationTime || 'unknown'
      } catch { /* ok */ }

      const prompt = `Generate a daily battle plan for Nikhil. Context:
- Energy: ${core.energy || 3}/5
- Pending tasks: ${pending.join(', ') || 'none'}
- Overdue concepts: ${overdue.join(', ') || 'none'}
- Medication timing: ${medTime}
- Time of day: ${getTimeOfDay()}

Create a 4-6 item plan mapped to energy windows:
- Morning (peak cortisol): hardest tasks/concepts
- Post-lunch: lighter work, body double sessions
- Evening: review, check-in, journal

Format EACH item as: [TIME] — [TASK] — [WHY]
Keep it under 150 words. No markdown. JARVIS voice.`

      const result = await sendMessage(prompt, 'chat', {})
      if (result?.text) {
        const items = result.text.split('\n').filter(l => l.trim())
        update('battle-plan', () => ({
          date: today,
          items,
          rawText: result.text,
          accepted: false,
          generatedAt: new Date().toISOString(),
        }))
      }
    } catch (err) {
      console.error('[BattlePlan] generation failed:', err)
    }
    setGenerating(false)
  }

  const handleAccept = () => {
    update('battle-plan', prev => ({ ...prev, accepted: true }))
  }

  // Locked state
  if (!hasCheckin && !todayPlan) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={18} className="text-gold" />
          <h3 className="font-display text-lg font-bold text-gold tracking-wider uppercase gold-heading">Battle Plan</h3>
        </div>
        <div className="text-center py-6">
          <Shield size={24} className="text-text-muted mx-auto mb-2" />
          <p className="font-body text-sm text-text-dim">Complete morning check-in to unlock</p>
          <p className="font-mono text-[10px] text-text-muted mt-1 tracking-wider">OR</p>
          <button onClick={handleGenerate} disabled={generating || isStreaming}
            className="mt-2 font-mono text-[10px] text-cyan border border-cyan/30 px-3 py-1 rounded hover:bg-cyan/10 transition-all disabled:opacity-30">
            {generating ? 'GENERATING...' : 'GENERATE ANYWAY'}
          </button>
        </div>
      </div>
    )
  }

  // Show plan
  return (
    <div className="glass-card p-4">
      <div className="shimmer-inner" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-gold" />
            <h3 className="font-display text-lg font-bold text-gold tracking-wider uppercase gold-heading">Battle Plan</h3>
          </div>
          <div className="flex gap-2">
            {todayPlan && !todayPlan.accepted && (
              <button onClick={handleAccept}
                className="font-mono text-[10px] px-2 py-1 rounded border border-gold/40 text-gold hover:bg-gold/10 transition-all">
                <Check size={10} className="inline mr-1" />ACCEPT
              </button>
            )}
            <button onClick={handleGenerate} disabled={generating || isStreaming}
              className="font-mono text-[10px] px-2 py-1 rounded border border-cyan/30 text-cyan hover:bg-cyan/10 transition-all disabled:opacity-30">
              <RefreshCw size={10} className={`inline mr-1 ${generating ? 'animate-spin' : ''}`} />{generating ? '...' : 'REGEN'}
            </button>
          </div>
        </div>

        {todayPlan ? (
          <div className="space-y-2">
            {todayPlan.items.map((item, i) => (
              <div key={i} className="glass-card px-3 py-2 card-enter" style={{ animationDelay: `${i * 60}ms` }}>
                <p className="font-body text-xs text-text leading-relaxed">{item}</p>
              </div>
            ))}
            {todayPlan.accepted && (
              <p className="font-mono text-[9px] text-gold/50 text-center mt-2 tracking-wider">PLAN ACCEPTED</p>
            )}
          </div>
        ) : (
          <button onClick={handleGenerate} disabled={generating || isStreaming}
            className="w-full glass-card py-3 text-center font-mono text-xs text-cyan hover:bg-cyan/10 transition-all disabled:opacity-30">
            {generating ? 'GENERATING BATTLE PLAN...' : 'GENERATE BATTLE PLAN'}
          </button>
        )}
      </div>
    </div>
  )
}
