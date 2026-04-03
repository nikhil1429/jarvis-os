// voiceCommands.js — Instant voice commands that bypass API calls
// WHY: "capture", "status", "streak", "stop" don't need AI — they read localStorage
// directly and return instant responses. Saves API cost and feels snappier.

import { getDayNumber, getWeekNumber } from './dateUtils.js'

// Mode aliases for voice switching
const MODE_MAP = {
  'chat': 'chat',
  'quiz': 'quiz', 'quiz me': 'quiz', 'quiz mode': 'quiz',
  'presser': 'presser', 'press conference': 'presser',
  'battle': 'battle', 'debate': 'battle', 'battle mode': 'battle',
  'teach': 'teach', 'explain': 'teach', 'teach mode': 'teach',
  'body double': 'body-double', 'focus mode': 'body-double', 'focus': 'body-double',
  'interview': 'interview-sim', 'interview sim': 'interview-sim', 'interview mode': 'interview-sim',
  'timed': 'timed', 'speed': 'speed', 'alter ego': 'alter-ego',
  'forensics': 'forensics', 'code autopsy': 'code-autopsy',
  'scenario bomb': 'scenario-bomb', 'impostor killer': 'impostor-killer',
  'weakness radar': 'weakness-radar', 'time machine': 'time-machine',
}

/**
 * processVoiceCommand — checks if transcript is a local command
 * @param {string} transcript — raw speech text
 * @returns {{ type: string, response: string, mode?: string } | null}
 *   type: 'speak' (speak response), 'stop' (stop listening), 'mode' (switch mode), 'checkin' (start check-in)
 *   Returns null if not a command → send to API as normal
 */
export function processVoiceCommand(transcript) {
  const lower = transcript.toLowerCase().trim()

  // Stop commands
  if (lower === 'stop' || lower === 'jarvis stop' || lower === 'shut up' || lower === 'silence') {
    console.log('VOICE CMD: stop')
    return { type: 'stop', response: 'Going silent, Sir.' }
  }

  // Shutdown
  if (lower === 'shutdown' || lower === 'jarvis shutdown' || lower.startsWith('goodnight') || lower === 'shut down') {
    console.log('VOICE CMD: shutdown')
    return { type: 'shutdown', response: 'Initiating shutdown sequence, Sir.' }
  }

  // Check-in
  if (lower.startsWith('check in') || lower.startsWith('checkin') || lower.startsWith('daily check') || lower === 'daily') {
    console.log('VOICE CMD: check-in')
    return { type: 'checkin', response: 'Commencing daily debrief, Sir. Confidence level, 1 to 5?' }
  }

  // Working Thread
  if (lower.startsWith('thread') || lower.startsWith('note for today')) {
    const text = transcript.replace(/^(thread|note for today)\s*/i, '').trim()
    if (text) {
      try {
        const today = new Date().toISOString().split('T')[0]
        const data = JSON.parse(localStorage.getItem('jos-thread') || '{}')
        const items = data.date === today ? (data.items || []) : []
        items.push({ text, addedAt: new Date().toISOString() })
        localStorage.setItem('jos-thread', JSON.stringify({ date: today, items: items.slice(-10) }))
        window.dispatchEvent(new Event('jarvis-thread-updated'))
      } catch { /* ok */ }
      return { type: 'speak', response: `Thread noted, Sir. "${text.substring(0, 40)}"` }
    }
  }

  // Quick Capture
  if (lower.startsWith('capture') || lower.startsWith('remember') || lower.startsWith('note')) {
    const text = transcript.replace(/^(capture|remember|note)\s*/i, '').trim()
    if (text) {
      try {
        const captures = JSON.parse(localStorage.getItem('jos-quick-capture') || '[]')
        captures.push({ timestamp: new Date().toISOString(), text, category: 'voice', processed: false })
        localStorage.setItem('jos-quick-capture', JSON.stringify(captures))
      } catch { /* ok */ }
      console.log('VOICE CMD: capture -', text.substring(0, 30))
      return { type: 'speak', response: `Quick capture saved, Sir. "${text.substring(0, 40)}"` }
    }
  }

  // Status report
  if (lower.startsWith('status') || lower === 'report' || lower === 'how am i doing') {
    console.log('VOICE CMD: status')
    try {
      const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
      const feelings = JSON.parse(localStorage.getItem('jos-feelings') || '[]')
      const concepts = JSON.parse(localStorage.getItem('jos-concepts') || '[]')
      const day = getDayNumber(core.startDate)
      const week = getWeekNumber(core.startDate)
      const mastered = concepts.filter(c => (c.strength || 0) >= 60).length
      const tasks = (core.completedTasks || []).length
      return {
        type: 'speak',
        response: `Day ${day}, Week ${week}. Streak: ${core.streak || 0} days. Energy: ${core.energy || 3} out of 5. Tasks completed: ${tasks}. Concepts mastered: ${mastered} of ${concepts.length}. Check-ins: ${feelings.length}.`
      }
    } catch {
      return { type: 'speak', response: 'Unable to read status data, Sir.' }
    }
  }

  // Streak
  if (lower.startsWith('streak') || lower === 'how long') {
    console.log('VOICE CMD: streak')
    try {
      const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
      return {
        type: 'speak',
        response: `Current streak: ${core.streak || 0} days, Sir. Your longest was ${core.longestStreak || core.streak || 0} days.`
      }
    } catch {
      return { type: 'speak', response: 'Unable to read streak data, Sir.' }
    }
  }

  // Battle plan
  if (lower.startsWith('battle plan') || lower === 'plan' || lower.startsWith('what should i do')) {
    console.log('VOICE CMD: battle plan')
    try {
      const plan = JSON.parse(localStorage.getItem('jos-battle-plan') || 'null')
      const today = new Date().toISOString().split('T')[0]
      if (plan && plan.date === today && plan.items) {
        return { type: 'speak', response: "Today's battle plan: " + plan.items.join('. ') + '.' }
      }
      return { type: 'speak', response: 'No battle plan generated yet today, Sir. Complete the transition ritual to generate one.' }
    } catch {
      return { type: 'speak', response: 'No battle plan found, Sir.' }
    }
  }

  // Mode switching — check all aliases
  for (const [phrase, modeId] of Object.entries(MODE_MAP)) {
    if (lower.includes('switch to ' + phrase) || lower === phrase + ' mode' || lower === phrase) {
      // Don't match single common words that might be speech fragments
      if (['chat', 'focus', 'teach', 'explain', 'timed', 'speed'].includes(phrase) && lower === phrase) {
        continue // Only match "switch to X" or "X mode" for ambiguous words
      }
      console.log('VOICE CMD: mode switch to', modeId)
      return { type: 'mode', mode: modeId, response: `Switching to ${modeId.replace('-', ' ')} mode, Sir.` }
    }
  }

  // Explicit "switch to X" for any remaining
  const switchMatch = lower.match(/switch to (.+)/)
  if (switchMatch) {
    const target = switchMatch[1].trim()
    for (const [phrase, modeId] of Object.entries(MODE_MAP)) {
      if (target.includes(phrase)) {
        console.log('VOICE CMD: mode switch to', modeId)
        return { type: 'mode', mode: modeId, response: `Switching to ${modeId.replace('-', ' ')} mode, Sir.` }
      }
    }
  }

  // Task completion by voice: "task 5 done" / "complete task 5" / "mark task 5"
  const taskMatch = lower.match(/(?:task|complete task|mark task)\s*(\d+)\s*(?:done|complete|finished)?/)
  if (taskMatch) {
    const taskNum = parseInt(taskMatch[1], 10)
    console.log('VOICE CMD: task', taskNum)
    try {
      const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
      const completed = core.completedTasks || []
      const tasks = JSON.parse(localStorage.getItem('jos-tasks-cache') || 'null')
      const isDone = completed.includes(taskNum)

      if (isDone) {
        core.completedTasks = completed.filter(id => id !== taskNum)
        localStorage.setItem('jos-core', JSON.stringify(core))
        window.dispatchEvent(new CustomEvent('jarvis-task-toggled', { detail: { taskId: taskNum } }))
        return { type: 'speak', response: `Task ${taskNum} unmarked, Sir.` }
      } else {
        core.completedTasks = [...completed, taskNum]
        localStorage.setItem('jos-core', JSON.stringify(core))
        window.dispatchEvent(new CustomEvent('jarvis-task-toggled', { detail: { taskId: taskNum } }))
        return { type: 'task', taskId: taskNum, response: `Task ${taskNum} marked complete, Sir.` }
      }
    } catch {
      return { type: 'speak', response: `Unable to update task ${taskNum}, Sir.` }
    }
  }

  // Daily build log by voice: "built X today" / "today I built X" / "build log X"
  const buildMatch = lower.match(/(?:built|today i built|build log)\s+(.+?)(?:\s+today)?$/)
  if (buildMatch) {
    const text = buildMatch[1].trim()
    if (text) {
      console.log('VOICE CMD: build log -', text.substring(0, 30))
      try {
        const logs = JSON.parse(localStorage.getItem('jos-daily-build') || '[]')
        logs.push({ date: new Date().toISOString().split('T')[0], text, timestamp: new Date().toISOString() })
        localStorage.setItem('jos-daily-build', JSON.stringify(logs))
        window.dispatchEvent(new CustomEvent('jarvis-buildlog-updated'))
        return { type: 'speak', response: 'Build log updated, Sir.' }
      } catch {
        return { type: 'speak', response: 'Unable to save build log, Sir.' }
      }
    }
  }

  return null // Not a command — send to API
}
