// greetingEngine.js — Crafts the first 10 words of every boot

export function generateGreeting() {
  try {
    const core = JSON.parse(localStorage.getItem('jos-core') || '{}')
    const apps = JSON.parse(localStorage.getItem('jos-applications') || '[]')
    const lastBoot = localStorage.getItem('jos-last-boot')
    const gap = lastBoot ? (Date.now() - new Date(lastBoot).getTime()) / 86400000 : 0
    const hour = new Date().getHours()
    const streak = core.streak || 0
    const energy = core.energy || 3

    const recentRejection = apps.find(a => a.status === 'rejected' && (Date.now() - new Date(a.date || a.updatedAt || 0).getTime()) / 86400000 < 2)
    if (recentRejection) return { lines: ['I saw the update.', "Whenever you're ready."], color: '#d0e8f8' }

    if (gap >= 3) return { lines: [`Sir. ${Math.round(gap)} days.`, 'I have observations.', 'Welcome back.'], color: '#d4a853' }

    const milestones = [90, 60, 30, 21, 14, 7]
    const hit = milestones.find(m => streak === m)
    if (hit) return { lines: [`Day ${hit}, Sir. ${hit} consecutive.`, "Most systems get abandoned by Day 5.", "You didn't."], color: '#d4a853' }

    if (hour >= 1 && hour < 5) return { lines: [`Sir. It's ${hour} AM.`, "I won't lecture."], color: '#d4a853' }

    const upcoming = apps.find(a => a.interviewDate && (new Date(a.interviewDate) - Date.now()) / 3600000 > 0 && (new Date(a.interviewDate) - Date.now()) / 3600000 < 24)
    if (upcoming) return { lines: ['Interview in less than 24 hours.', 'Mission mode.'], color: '#d4a853' }

    if (hour >= 5 && hour < 12) return { lines: ['Good morning, Sir.', `Energy at ${energy}. ${energy >= 4 ? 'Strong conditions.' : 'Steady start.'}`], color: '#00b4d8' }
    if (hour >= 12 && hour < 17) return { lines: ['Good afternoon, Sir.', `${(core.completedTasks || []).length} tasks on the board.`], color: '#00b4d8' }
    if (hour >= 17 && hour < 21) return { lines: ['Good evening, Sir.', streak > 0 ? `Streak: ${streak} days.` : 'Ready when you are.'], color: '#00b4d8' }
    return { lines: ['Rather late, Sir.', "But I'm here."], color: '#48cae4' }
  } catch { return { lines: ['Good day, Sir.'], color: '#00b4d8' } }
}
