// ConfidenceCalib.jsx — Self-rating vs actual quiz performance
// WHY: Impostor syndrome works both ways — sometimes you OVERRATE your knowledge.
// This card compares self-assessed confidence (from check-ins) with actual quiz
// performance. A positive gap means overconfident, negative means underconfident.
// Helps Nikhil calibrate his self-perception with reality.

import useStorage from '../../hooks/useStorage.js'

export default function ConfidenceCalib() {
  const { get } = useStorage()

  const feelings = get('feelings') || []
  const quizMsgs = get('msgs-quiz') || []

  // Average self-rated confidence (1-5 → normalized to 0-100)
  const confValues = feelings.filter(f => f.confidence).map(f => f.confidence)
  const selfRating = confValues.length > 0
    ? Math.round((confValues.reduce((s, v) => s + v, 0) / confValues.length / 5) * 100)
    : null

  // Actual quiz performance estimate (messages as proxy — will be refined with real scoring)
  const quizUserMsgs = quizMsgs.filter(m => m.role === 'user').length
  const quizAssistantMsgs = quizMsgs.filter(m => m.role === 'assistant').length
  const actualPerformance = quizAssistantMsgs > 0
    ? Math.min(100, Math.round((quizUserMsgs / Math.max(quizAssistantMsgs, 1)) * 50 + 20))
    : null

  const hasData = selfRating !== null && actualPerformance !== null
  const gap = hasData ? selfRating - actualPerformance : 0
  const gapLabel = gap > 0 ? 'OVERCONFIDENT' : gap < 0 ? 'UNDERCONFIDENT' : 'CALIBRATED'
  const gapColor = gap > 10 ? '#ef4444' : gap < -10 ? '#eab308' : '#22c55e'

  return (
    <div className="glass-card p-4">
      <div className="hud-panel-inner">
        <h3 className="font-display text-sm font-bold text-cyan tracking-wider uppercase mb-3">
          Confidence Calibration
        </h3>

        {!hasData ? (
          <div className="text-center py-6">
            <p className="font-mono text-[10px] text-text-muted tracking-wider">
              NEED CHECK-INS + QUIZ DATA TO CALIBRATE
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Self-rating bar */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-mono text-[9px] text-text-dim tracking-wider">SELF-RATING</span>
                <span className="font-mono text-[9px] text-cyan">{selfRating}%</span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan transition-all duration-500"
                  style={{ width: `${selfRating}%` }}
                />
              </div>
            </div>

            {/* Actual performance bar */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-mono text-[9px] text-text-dim tracking-wider">ACTUAL QUIZ</span>
                <span className="font-mono text-[9px] text-gold">{actualPerformance}%</span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gold transition-all duration-500"
                  style={{ width: `${actualPerformance}%` }}
                />
              </div>
            </div>

            {/* Gap indicator */}
            <div className="text-center pt-2 border-t border-border">
              <span className="font-mono text-[10px] tracking-wider" style={{ color: gapColor }}>
                {gapLabel}: {Math.abs(gap)}% GAP
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
