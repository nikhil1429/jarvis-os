// peopleMap.js — JARVIS builds a map of people in Nikhil's world

const KNOWN_PEOPLE = {
  'akshay': { name: 'Akshay', role: 'Friend · Blinkit · Domain Validator', honorific: 'Mr. Akshay' },
  'nidhi': { name: 'Nidhi', role: 'Wife · Career Ally', honorific: 'Mrs. Panwar' },
}

export function detectPeopleMentions(text) {
  const mentions = []
  const lower = text.toLowerCase()

  Object.entries(KNOWN_PEOPLE).forEach(([key, person]) => {
    if (lower.includes(key)) {
      mentions.push(person)
      try {
        const map = JSON.parse(localStorage.getItem('jos-people') || '{}')
        if (!map[key]) map[key] = { ...person, mentionCount: 0, contexts: [] }
        map[key].mentionCount++
        map[key].lastMentioned = new Date().toISOString()
        map[key].contexts.push(text.slice(0, 100))
        if (map[key].contexts.length > 20) map[key].contexts = map[key].contexts.slice(-20)
        localStorage.setItem('jos-people', JSON.stringify(map))
      } catch { /* ok */ }
    }
  })

  return mentions
}

export function getPeopleMap() {
  try { return JSON.parse(localStorage.getItem('jos-people') || '{}') } catch { return {} }
}
