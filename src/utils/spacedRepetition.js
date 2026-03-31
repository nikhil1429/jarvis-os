// spacedRepetition.js — Forgetting Curve Engine for concept review scheduling
// WHY: Without spaced repetition, Nikhil reviews randomly and forgets systematically.
// This engine schedules reviews at expanding intervals: 1, 3, 7, 14, 30, 60, 120 days.
// Each interval roughly matches the point where memory decay hits ~50% recall.
// Overdue concepts sort to the top of the DNA tab with amber badges.

const INTERVALS = [1, 3, 7, 14, 30, 60, 120]

/**
 * getReviewSchedule — Given a concept's review history, returns next review info
 * @param {Object} concept — { lastReview, reviewCount, strength }
 * @returns {{ nextReview: string|null, isOverdue: boolean, daysOverdue: number, urgency: string, intervalDays: number }}
 */
export function getReviewSchedule(concept) {
  if (!concept.lastReview) {
    return {
      nextReview: null,
      isOverdue: true,
      daysOverdue: 0,
      urgency: 'medium',
      intervalDays: INTERVALS[0],
    }
  }

  const reviewCount = concept.reviewCount || 0
  const intervalIndex = Math.min(reviewCount, INTERVALS.length - 1)
  const intervalDays = INTERVALS[intervalIndex]

  const lastReviewDate = new Date(concept.lastReview)
  const nextReviewDate = new Date(lastReviewDate)
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays)

  const now = new Date()
  const diffMs = now - nextReviewDate
  const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const isOverdue = diffMs > 0

  let urgency = 'none'
  if (isOverdue) {
    if (daysOverdue > 7) urgency = 'critical'
    else if (daysOverdue > 3) urgency = 'high'
    else urgency = 'medium'
  }

  return {
    nextReview: nextReviewDate.toISOString(),
    isOverdue,
    daysOverdue: Math.max(0, daysOverdue),
    urgency,
    intervalDays,
  }
}

export { INTERVALS }
