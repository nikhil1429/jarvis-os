// ReadinessScore.jsx — Interview Readiness circular gauge
// WHY: The single most important metric. Combines 5 weighted dimensions into one
// number that answers "Am I ready for interviews?" Color-coded so Nikhil can
// glance and know: red = not ready, yellow = getting there, green = ready, gold = elite.
// Formula: Build 30% + Conf 30% + Quiz 20% + Presser 10% + Answers 10%

import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'
import useStorage from '../../hooks/useStorage.js'
import TASKS from '../../data/tasks.js'

function getColor(score) {
  if (score < 40) return '#ef4444'
  if (score < 70) return '#eab308'
  if (score < 90) return '#22c55e'
  return '#d4a853'
}

export default function ReadinessScore() {
  const { get } = useStorage()

  const core = get('core') || {}
  const feelings = get('feelings') || []
  const quizMsgs = get('msgs-quiz') || []
  const presserMsgs = get('msgs-presser') || []
  const interviews = get('interviews') || []

  // Build: % of 82 tasks completed (0-100, weight 30%)
  const tasksCompleted = (core.completedTasks || []).length
  const buildScore = (tasksCompleted / TASKS.length) * 100

  // Confidence: average confidence from check-ins (1-5 → 0-100, weight 30%)
  const confValues = feelings.filter(f => f.confidence).map(f => f.confidence)
  const avgConf = confValues.length > 0
    ? confValues.reduce((s, v) => s + v, 0) / confValues.length
    : 0
  const confScore = (avgConf / 5) * 100

  // Quiz: average from quiz messages (look for score patterns, weight 20%)
  // Estimate based on quiz message count as proxy
  const quizScore = Math.min(100, (quizMsgs.filter(m => m.role === 'user').length / 50) * 100)

  // Presser: presser session count (weight 10%)
  const presserScore = Math.min(100, (presserMsgs.filter(m => m.role === 'user').length / 20) * 100)

  // Answers: interview prep count (weight 10%)
  const answersScore = Math.min(100, (interviews.length / 10) * 100)

  const totalScore = Math.round(
    buildScore * 0.30 +
    confScore * 0.30 +
    quizScore * 0.20 +
    presserScore * 0.10 +
    answersScore * 0.10
  )

  const color = getColor(totalScore)

  const dimensions = [
    { label: 'BUILD', score: Math.round(buildScore), weight: '30%' },
    { label: 'CONFIDENCE', score: Math.round(confScore), weight: '30%' },
    { label: 'QUIZ', score: Math.round(quizScore), weight: '20%' },
    { label: 'PRESSER', score: Math.round(presserScore), weight: '10%' },
    { label: 'ANSWERS', score: Math.round(answersScore), weight: '10%' },
  ]

  return (
    <div className="glass-card p-4">
      <div className="hud-panel-inner">
        <h3 className="font-display text-sm font-bold text-cyan tracking-wider uppercase mb-4">
          Interview Readiness
        </h3>

        <div className="flex items-center gap-6">
          {/* Circular gauge */}
          <div className="w-28 h-28 flex-shrink-0">
            <CircularProgressbar
              value={totalScore}
              text={`${totalScore}%`}
              styles={buildStyles({
                textSize: '22px',
                textColor: color,
                pathColor: color,
                trailColor: '#0d2137',
                pathTransitionDuration: 0.8,
              })}
            />
          </div>

          {/* Dimension breakdown */}
          <div className="flex-1 space-y-1.5">
            {dimensions.map(d => (
              <div key={d.label} className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-text-muted w-20 tracking-wider">{d.label}</span>
                <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${d.score}%`, backgroundColor: getColor(d.score) }}
                  />
                </div>
                <span className="font-mono text-[9px] text-text-dim w-8 text-right">{d.score}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
