// temporalAwareness.js — JARVIS understands time in context
// WHY: Not just clock time — what that time MEANS for Nikhil.
// Medication windows, circadian patterns, calendar awareness.

export function getTemporalContext() {
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay()
  const context = { hour, dayOfWeek: day, timeLabel: '', medState: '', warnings: [], suggestions: [] }

  if (hour >= 5 && hour < 12) context.timeLabel = 'morning'
  else if (hour >= 12 && hour < 17) context.timeLabel = 'afternoon'
  else if (hour >= 17 && hour < 21) context.timeLabel = 'evening'
  else context.timeLabel = 'latenight'

  // Medication awareness from onboarding
  try {
    const onboarding = JSON.parse(localStorage.getItem('jos-onboarding') || '{}')
    const medTime = onboarding.adhd?.medicationTime
    const medOnset = medTime ? parseInt(medTime) : 10
    const medDuration = parseInt(onboarding.adhd?.medicationDuration) || 8
    const medWearOff = medOnset + medDuration

    if (hour >= medOnset && hour < medOnset + 1) {
      context.medState = 'kicking-in'
      context.suggestions.push('Medication ramping up. Light tasks for 30-60 minutes, then attack the hardest work.')
    } else if (hour >= medOnset + 1 && hour < medWearOff - 1) {
      context.medState = 'peak'
      context.suggestions.push('Peak medication window. This is when the hardest cognitive work should happen.')
    } else if (hour >= medWearOff - 1 && hour < medWearOff) {
      context.medState = 'wearing-off'
      context.warnings.push('Medication wearing off within the hour. Wrap up demanding tasks.')
    } else if (hour >= medWearOff) {
      context.medState = 'off'
      context.warnings.push('Post-medication window. Body Double or lighter modes recommended.')
    } else {
      context.medState = 'pre-medication'
    }
  } catch { context.medState = 'unknown' }

  if (hour >= 23 || hour < 4) {
    context.warnings.push("Past 11 PM. Every hour now trades tomorrow's peak performance for tonight's marginal gains.")
  }

  if (day === 0) context.suggestions.push('Sunday — War Council day. Weekly review + strategic planning.')
  else if (day === 5) context.suggestions.push('Friday — wrap-up day. Tie loose ends, prepare for weekend reflection.')

  // Interview proximity
  try {
    const apps = JSON.parse(localStorage.getItem('jos-applications') || '[]')
    const upcoming = apps.filter(a => {
      if (!a.interviewDate) return false
      const diff = (new Date(a.interviewDate) - now) / 3600000
      return diff > 0 && diff < 24
    })
    if (upcoming.length > 0) {
      context.warnings.push(`Interview with ${upcoming[0].company || 'a company'} within 24 hours. Mission mode.`)
      context.interviewImminent = true
    }
  } catch { /* ok */ }

  return context
}
