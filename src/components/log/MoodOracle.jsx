// MoodOracle.jsx — Weekly AI mood analysis using Opus
// WHY: Pattern detection across check-in data. JARVIS spots trends Nikhil can't see.
// Requires 3+ check-ins. User-triggered to save Opus credits.

import { useState, useMemo } from 'react'
import { Brain, ChevronDown, ChevronUp } from 'lucide-react'
import useAI from '../../hooks/useAI.js'
import useStorage from '../../hooks/useStorage.js'

export default function MoodOracle() {
  const { sendMessage, isStreaming } = useAI()
  const { get, update } = useStorage()
  const [expanded, setExpanded] = useState(false)
  const [generating, setGenerating] = useState(false)

  const feelings = get('feelings') || []
  const weekly = get('weekly') || {}

  // Last 7 days of check-ins
  const recentCheckins = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    return feelings.filter(f => new Date(f.timestamp || f.date) >= cutoff)
  }, [feelings])

  // Existing analysis for this week
  const weekKey = new Date().toISOString().split('T')[0].slice(0, 7) // YYYY-MM
  const existingAnalysis = weekly.moodOracle

  const handleGenerate = async () => {
    if (recentCheckins.length < 3) return
    setGenerating(true)

    try {
      const checkinSummary = recentCheckins.map((c, i) =>
        `Day ${i + 1}: Confidence ${c.confidence || '?'}/5, Focus ${c.focus || '?'}/5, Motivation ${c.motivation || '?'}/5, Sleep ${c.sleep || '?'}/5, Mood: ${c.mood || '?'}, Learned: ${c.learned || 'N/A'}, Struggles: ${c.struggles || 'N/A'}`
      ).join('\n')

      const result = await sendMessage(
        `Analyze these ${recentCheckins.length} daily check-ins from the last 7 days:\n\n${checkinSummary}\n\nGive me pattern insights, warnings, and one actionable recommendation.`,
        'mood-oracle',
        {}
      )

      if (result?.text) {
        update('weekly', prev => ({
          ...(prev || {}),
          moodOracle: {
            text: result.text,
            generatedAt: new Date().toISOString(),
            checkinCount: recentCheckins.length,
          }
        }))
      }
    } catch (err) {
      console.error('[MoodOracle] Generation failed:', err)
    }

    setGenerating(false)
  }

  // Not enough data
  if (recentCheckins.length < 3 && !existingAnalysis) {
    return (
      <div className="glass-card p-4 border border-border mt-4">
        <div className="flex items-center gap-2 mb-2">
          <Brain size={16} className="text-gold" />
          <span className="font-display text-sm font-bold text-gold tracking-wider">MOOD ORACLE</span>
        </div>
        <p className="font-body text-xs text-text-dim">
          Need at least 3 check-ins for mood analysis, Sir. ({recentCheckins.length}/3 this week)
        </p>
      </div>
    )
  }

  const analysis = existingAnalysis

  return (
    <div className="mt-4 rounded-lg border overflow-hidden"
      style={{ borderColor: '#d4a853', borderTopWidth: 3 }}>
      <div className="p-4 bg-card">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-gold" />
            <span className="font-display text-sm font-bold text-gold tracking-wider">MOOD ORACLE</span>
          </div>
          {analysis && (
            <button onClick={() => setExpanded(!expanded)}
              className="text-text-muted hover:text-text transition-colors">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>

        {analysis ? (
          <>
            <p className={`font-body text-xs text-text leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
              {analysis.text}
            </p>
            <p className="font-mono text-[9px] text-text-muted mt-2">
              Generated {new Date(analysis.generatedAt).toLocaleDateString()} · {analysis.checkinCount} check-ins analyzed
            </p>
          </>
        ) : (
          <button onClick={handleGenerate} disabled={generating || isStreaming}
            className={`font-mono text-xs tracking-wider px-3 py-1.5 rounded border transition-all ${
              generating ? 'border-gold/30 text-gold/50 cursor-wait'
              : 'border-gold/40 text-gold hover:bg-gold/10'
            }`}>
            {generating ? 'Analyzing...' : `Generate Analysis (${recentCheckins.length} check-ins)`}
          </button>
        )}
      </div>
    </div>
  )
}
