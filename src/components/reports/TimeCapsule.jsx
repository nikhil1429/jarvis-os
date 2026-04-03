// TimeCapsule.jsx — Letters to future-you, sealed for 14 days
// WHY: Bible Section 10.8. JARVIS writes based on current data, sealed until reveal day.

import { useState, useMemo } from 'react'
import { Lock, Unlock, Plus } from 'lucide-react'
import useAI from '../../hooks/useAI.js'
import useStorage from '../../hooks/useStorage.js'
import { compileSummary } from '../../utils/strategicCompiler.js'
import { speakWithFallback } from '../../utils/elevenLabsSpeak.js'
import { getDayNumber } from '../../utils/dateUtils.js'

export default function TimeCapsule() {
  const { sendMessage } = useAI()
  const { get, update } = useStorage()
  const [creating, setCreating] = useState(false)

  const core = get('core') || {}
  const capsules = get('time-capsules') || []
  const dayNum = getDayNumber(core.startDate)
  const now = Date.now()

  // Check for capsules that should be opened
  const processedCapsules = useMemo(() => {
    return capsules.map(c => ({
      ...c,
      canOpen: !c.opened && new Date(c.opensAt).getTime() <= now,
      daysUntil: Math.max(0, Math.ceil((new Date(c.opensAt).getTime() - now) / (1000 * 60 * 60 * 24))),
    }))
  }, [capsules, now])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const summary = compileSummary()
      const prompt = `Write a letter from JARVIS to Nikhil's future self (14 days from now).
Current data: ${summary}
Current day: Day ${dayNum}

The letter should:
- Reference specific current stats (streak, concepts, confidence)
- Make 2-3 predictions about what will change
- Include one challenge for future-Nikhil
- End with encouragement

Warm JARVIS voice, like a mentor. Under 150 words. No markdown.`

      const result = await sendMessage(prompt, 'chat', {})
      if (result?.text) {
        const opensAt = new Date()
        opensAt.setDate(opensAt.getDate() + 14)
        update('time-capsules', prev => [
          ...(prev || []),
          { createdAt: new Date().toISOString(), opensAt: opensAt.toISOString(), content: result.text, opened: false, createdDay: dayNum }
        ])
      }
    } catch (err) { console.error('[TimeCapsule]', err) }
    setCreating(false)
  }

  const handleOpen = (idx) => {
    update('time-capsules', prev => {
      const updated = [...(prev || [])]
      updated[idx] = { ...updated[idx], opened: true, openedAt: new Date().toISOString() }
      return updated
    })
    // Speak the letter
    const capsule = capsules[idx]
    if (capsule?.content) speakWithFallback(capsule.content)
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm font-bold text-gold tracking-wider uppercase gold-heading">Time Capsule</h3>
        <button onClick={handleCreate} disabled={creating}
          className="font-mono text-[10px] text-gold border border-gold/30 px-2 py-1 rounded hover:bg-gold/10 transition-all disabled:opacity-30">
          <Plus size={10} className="inline mr-1" />{creating ? 'CREATING...' : 'CREATE'}
        </button>
      </div>

      {processedCapsules.length === 0 ? (
        <div className="glass-card p-4 text-center">
          <Lock size={20} className="text-gold/40 mx-auto mb-2" />
          <p className="font-body text-xs text-text-dim">No capsules yet. Create one — JARVIS will write a letter to your future self.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {processedCapsules.map((c, i) => (
            <div key={i} className={`glass-card p-3 border-l-2 ${c.opened ? 'border-l-cyan' : 'border-l-gold'}`}>
              {c.opened ? (
                <>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Unlock size={12} className="text-cyan" />
                    <span className="font-mono text-[9px] text-cyan">Day {c.createdDay} → Opened</span>
                  </div>
                  <p className="font-body text-xs text-text leading-relaxed">{c.content}</p>
                </>
              ) : c.canOpen ? (
                <button onClick={() => handleOpen(i)} className="w-full text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Lock size={12} className="text-gold animate-pulse" />
                      <span className="font-mono text-[9px] text-gold">Day {c.createdDay} — READY TO OPEN</span>
                    </div>
                    <span className="font-mono text-[9px] text-gold">TAP TO REVEAL</span>
                  </div>
                </button>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lock size={12} className="text-text-muted" />
                    <span className="font-mono text-[9px] text-text-muted">Day {c.createdDay} — SEALED</span>
                  </div>
                  <span className="font-mono text-[9px] text-text-muted">Opens in {c.daysUntil}d</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
