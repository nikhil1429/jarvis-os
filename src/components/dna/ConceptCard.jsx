// ConceptCard.jsx — Expandable concept card for the DNA tab
// WHY: Each concept is a knowledge building block. The card shows strength at a glance
// (color-coded bar), category badge, and review status. Expanding reveals notes,
// strength slider, resources, and a "Mark Reviewed" button that feeds spaced repetition.

import { useState } from 'react'
import { ChevronDown, ChevronUp, Check, AlertTriangle } from 'lucide-react'
import { getReviewSchedule } from '../../utils/spacedRepetition.js'

// WHY: Color-coded categories so Nikhil can visually scan priority
const CATEGORY_STYLES = {
  Core:     { bg: 'bg-cyan/10', border: 'border-cyan/30', text: 'text-cyan' },
  Advanced: { bg: 'bg-gold/10', border: 'border-gold/30', text: 'text-gold' },
  Month2:   { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  Discuss:  { bg: 'bg-text-muted/10', border: 'border-text-muted/30', text: 'text-text-dim' },
}

// WHY: Strength colors — red=danger, yellow=working, green=solid, gold=mastered
function getStrengthColor(strength) {
  if (strength < 30) return '#ef4444'
  if (strength < 60) return '#eab308'
  if (strength < 80) return '#22c55e'
  return '#d4a853'
}

export default function ConceptCard({ concept, savedData, onUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(savedData?.notes || '')
  const [strength, setStrength] = useState(savedData?.strength || concept.strength || 0)

  const category = CATEGORY_STYLES[concept.category] || CATEGORY_STYLES.Core
  const strengthColor = getStrengthColor(strength)
  const review = getReviewSchedule(savedData || concept)

  const handleMarkReviewed = () => {
    const now = new Date().toISOString()
    onUpdate(concept.id, {
      strength,
      notes,
      lastReview: now,
      reviewCount: (savedData?.reviewCount || 0) + 1,
    })
  }

  const handleStrengthChange = (val) => {
    setStrength(val)
    onUpdate(concept.id, {
      ...savedData,
      strength: val,
      notes,
    })
  }

  return (
    <div className={`glass-card transition-all duration-200 ${
      review.isOverdue ? 'ring-1 ring-amber-500/30' : ''
    }`}>
      <div className="hud-panel-inner">
        {/* Collapsed header — always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-3 flex items-center gap-3 text-left"
        >
          {/* Strength bar (thin vertical) */}
          <div className="w-1 h-8 rounded-full bg-border overflow-hidden flex-shrink-0">
            <div
              className="w-full rounded-full transition-all duration-300"
              style={{
                height: `${strength}%`,
                backgroundColor: strengthColor,
                marginTop: `${100 - strength}%`,
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-body text-sm text-text truncate">{concept.name}</span>
              {review.isOverdue && (
                <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border
                ${category.bg} ${category.border} ${category.text}`}>
                {concept.category}
              </span>
              <span className="font-mono text-[9px] text-text-muted" style={{ color: strengthColor }}>
                {strength}%
              </span>
              {review.isOverdue && (
                <span className="font-mono text-[9px] text-amber-400">
                  REVIEW {review.urgency === 'critical' ? 'OVERDUE' : 'DUE'}
                </span>
              )}
            </div>
          </div>

          {/* Strength bar (horizontal mini) */}
          <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden flex-shrink-0">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${strength}%`, backgroundColor: strengthColor }}
            />
          </div>

          {expanded ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
            {/* Strength slider */}
            <div>
              <label className="font-mono text-[10px] text-text-dim tracking-wider block mb-1">
                STRENGTH: {strength}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={strength}
                onChange={e => handleStrengthChange(+e.target.value)}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${strengthColor} ${strength}%, #0d2137 ${strength}%)`,
                }}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="font-mono text-[10px] text-text-dim tracking-wider block mb-1">
                NOTES
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={() => onUpdate(concept.id, { ...savedData, strength, notes })}
                placeholder="Key points, connections, examples..."
                rows={3}
                className="w-full bg-void border border-border rounded px-3 py-2 font-body text-sm
                  text-text placeholder:text-text-muted focus:outline-none focus:border-cyan
                  transition-colors resize-none"
              />
            </div>

            {/* Review info */}
            <div className="flex items-center justify-between">
              <div className="font-mono text-[10px] text-text-muted">
                {savedData?.lastReview
                  ? `Last reviewed: ${new Date(savedData.lastReview).toLocaleDateString('en-IN')}`
                  : 'Never reviewed'}
                {savedData?.reviewCount ? ` (${savedData.reviewCount} times)` : ''}
              </div>

              <button
                onClick={handleMarkReviewed}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-cyan/40
                  text-cyan bg-cyan/10 hover:bg-cyan/20 transition-all duration-200
                  font-mono text-[10px] tracking-wider"
              >
                <Check size={12} /> MARK REVIEWED
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
