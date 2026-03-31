// dateUtils.js — Date helper functions for JARVIS OS
// WHY: We track streaks, day numbers, week numbers, and time-of-day context throughout
// the app. These pure functions avoid repeating date math and keep it testable.
// Using vanilla JS instead of date-fns here because these operations are simple enough
// and we avoid importing a library for basic arithmetic.

/**
 * getDayNumber — How many days since a start date (Day 1, Day 2, etc.)
 * WHY: Used in briefings ("Day 47 of your JARVIS journey") and streak tracking.
 */
export function getDayNumber(startDate) {
  const start = new Date(startDate)
  const now = new Date()
  const diffMs = now - start
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1
}

/**
 * getWeekNumber — Which week since start (Week 1, Week 2, etc.)
 * WHY: Anti-crutch escalation is week-based (Week 1-2 full assist, Week 3-4 guided, Week 5+ tough love).
 */
export function getWeekNumber(startDate) {
  const dayNum = getDayNumber(startDate)
  return Math.ceil(dayNum / 7)
}

/**
 * formatDate — Human-readable date string
 * WHY: Used in journal entries, reports, and briefing headers.
 */
export function formatDate(date) {
  const d = date ? new Date(date) : new Date()
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * isToday — Check if an ISO date string is today
 * WHY: Used to check if daily tasks (morning bet, check-in) have been completed today.
 */
export function isToday(dateString) {
  if (!dateString) return false
  const inputDate = new Date(dateString).toDateString()
  return inputDate === new Date().toDateString()
}

/**
 * getTimeOfDay — Returns current period: morning/afternoon/evening/latenight
 * WHY: JARVIS adjusts greetings and energy advice based on time.
 * Also drives the energy cycle priors (peak at morning, crash at afternoon, etc.)
 */
export function getTimeOfDay() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'latenight'
}
