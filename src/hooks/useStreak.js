// useStreak.js — Daily streak tracking with auto-increment
// WHY: Streaks are the #1 consistency motivator for ADHD brains. This hook checks
// on every load: did Nikhil visit yesterday? If yes, streak continues. If he skipped
// a day, streak resets to 1 (today counts). The streak value is stored in jos-core
// and displayed in the header. Event bus fires streak:continue or streak:break.

import { useEffect, useCallback } from 'react'
import useStorage from './useStorage.js'
import useSound from './useSound.js'

export default function useStreak(eventBus) {
  const { get, update } = useStorage()
  const { play } = useSound()

  const checkStreak = useCallback(() => {
    const core = get('core')
    if (!core) return

    const today = new Date().toISOString().split('T')[0]
    const lastVisit = core.lastVisit

    // First ever visit — initialize
    if (!lastVisit) {
      update('core', prev => ({ ...prev, streak: 1, lastVisit: today }))
      eventBus?.emit('streak:continue', { streak: 1 })
      return
    }

    // Already visited today — do nothing
    if (lastVisit === today) return

    // Check if yesterday
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    if (lastVisit === yesterdayStr) {
      // Streak continues — play celebration sound
      const newStreak = (core.streak || 0) + 1
      update('core', prev => ({ ...prev, streak: newStreak, lastVisit: today }))
      play('streak')
      eventBus?.emit('streak:continue', { streak: newStreak })
    } else {
      // Streak broken — reset to 1 (today still counts as day 1)
      update('core', prev => ({ ...prev, streak: 1, lastVisit: today }))
      eventBus?.emit('streak:break', { previousStreak: core.streak })
    }
  }, [get, update, eventBus])

  // Run streak check once on mount
  useEffect(() => {
    checkStreak()
  }, [checkStreak])

  return { checkStreak }
}
