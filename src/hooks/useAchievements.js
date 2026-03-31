// useAchievements.js — Achievement checking and unlocking system
// WHY: Achievements are dopamine hits tied to real progress. This hook subscribes
// to relevant events via the event bus and checks achievement conditions after
// each significant action. When unlocked: plays milestone sound, emits
// achievement:unlock event, saves to jos-achievements with timestamp.

import { useEffect, useCallback } from 'react'
import useStorage from './useStorage.js'
import useSound from './useSound.js'
import useEventBus from './useEventBus.js'
import ACHIEVEMENTS from '../data/achievements.js'
import TASKS from '../data/tasks.js'

export default function useAchievements() {
  const { get, update } = useStorage()
  const { play } = useSound()
  const eventBus = useEventBus()

  // Build the current state object that achievement checks need
  const buildState = useCallback(() => {
    const core = get('core') || {}
    const feelings = get('feelings') || []
    const concepts = get('concepts') || []

    const tasksCompleted = (core.completedTasks || []).length
    const streak = core.streak || 0
    const totalCheckIns = feelings.length

    // Check if any week is fully completed
    const completedSet = new Set(core.completedTasks || [])
    const weekFullyCompleted = [1, 2, 3, 4, 5, 6].some(w => {
      const weekTasks = TASKS.filter(t => t.week === w)
      return weekTasks.every(t => completedSet.has(t.id))
    })

    // Count total messages across all modes
    let totalMessages = 0
    let battleMessages = 0
    let codeAutopsySessions = 0
    let scenarioBombSessions = 0
    let timeCapsules = 0

    try {
      Object.keys(localStorage).filter(k => k.startsWith('jos-msgs-')).forEach(k => {
        const msgs = JSON.parse(localStorage.getItem(k)) || []
        const userMsgs = msgs.filter(m => m.role === 'user').length
        totalMessages += userMsgs

        if (k === 'jos-msgs-battle') battleMessages = userMsgs
        if (k === 'jos-msgs-code-autopsy') codeAutopsySessions = userMsgs
        if (k === 'jos-msgs-scenario-bomb') scenarioBombSessions = userMsgs
        if (k === 'jos-msgs-time-machine') timeCapsules = userMsgs
      })
    } catch { /* skip corrupted */ }

    const conceptsAbove60 = concepts.filter(c => (c.strength || 0) >= 60).length

    return {
      tasksCompleted,
      weekFullyCompleted,
      streak,
      totalMessages,
      conceptsAbove60,
      totalCheckIns,
      battleMessages,
      codeAutopsySessions,
      scenarioBombSessions,
      timeCapsules,
    }
  }, [get])

  // Check all achievements and unlock any newly qualified ones
  const checkAchievements = useCallback(() => {
    const state = buildState()
    const unlocked = get('achievements') || []
    const unlockedIds = new Set(unlocked.map(a => a.id))

    let newUnlocks = []

    ACHIEVEMENTS.forEach(achievement => {
      if (unlockedIds.has(achievement.id)) return // Already unlocked
      if (achievement.check(state)) {
        newUnlocks.push({
          id: achievement.id,
          unlockedAt: new Date().toISOString(),
        })
      }
    })

    if (newUnlocks.length > 0) {
      update('achievements', prev => [...(prev || []), ...newUnlocks])
      play('milestone')
      newUnlocks.forEach(nu => {
        eventBus.emit('achievement:unlock', {
          id: nu.id,
          name: ACHIEVEMENTS.find(a => a.id === nu.id)?.name,
        })
      })
    }
  }, [buildState, get, update, play, eventBus])

  // Subscribe to relevant events
  useEffect(() => {
    const events = [
      'task:complete',
      'checkin:submit',
      'streak:continue',
      'streak:break',
      'concept:review',
      'quiz:score',
      'mode:exit',
    ]

    const unsubs = events.map(event =>
      eventBus.subscribe(event, () => checkAchievements())
    )

    // Check on mount too (in case achievements were earned offline)
    checkAchievements()

    return () => unsubs.forEach(unsub => unsub())
  }, [eventBus, checkAchievements])

  return { checkAchievements }
}
