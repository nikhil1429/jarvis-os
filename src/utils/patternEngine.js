// patternEngine.js — Discovers correlations between lifestyle and performance
// WHY: JARVIS finds patterns you can't see. e.g., "Coffee after 4 PM → lower morning focus"

export function discoverPatterns() {
  const patterns = []

  try {
    const feelings = JSON.parse(localStorage.getItem('jos-feelings') || '[]')
    if (feelings.length < 14) return patterns

    // Pattern 1: Coffee timing vs next-day focus
    const coffeeVsFocus = []
    for (let i = 1; i < feelings.length; i++) {
      const yesterday = feelings[i - 1]
      const today = feelings[i]
      if (yesterday.coffee !== undefined && today.focus !== undefined) {
        const d1 = new Date(yesterday.date || yesterday.timestamp)
        const d2 = new Date(today.date || today.timestamp)
        if ((d2 - d1) / 86400000 > 0 && (d2 - d1) / 86400000 < 2) {
          coffeeVsFocus.push({ coffee: yesterday.coffee, nextFocus: today.focus })
        }
      }
    }

    if (coffeeVsFocus.length >= 7) {
      const withCoffee = coffeeVsFocus.filter(p => p.coffee >= 2)
      const withoutCoffee = coffeeVsFocus.filter(p => p.coffee <= 1)
      if (withCoffee.length >= 3 && withoutCoffee.length >= 3) {
        const avgWith = withCoffee.reduce((s, p) => s + p.nextFocus, 0) / withCoffee.length
        const avgWithout = withoutCoffee.reduce((s, p) => s + p.nextFocus, 0) / withoutCoffee.length
        const diff = avgWithout - avgWith
        if (Math.abs(diff) > 0.5) {
          patterns.push({
            id: 'coffee-focus',
            text: diff > 0
              ? `Days with 2+ coffees correlate with ${Math.round(diff / avgWithout * 100)}% lower next-morning focus (${coffeeVsFocus.length} data points).`
              : `Higher coffee intake correlates with better next-morning focus. Interesting.`,
            confidence: coffeeVsFocus.length > 20 ? 'high' : 'medium',
            dataPoints: coffeeVsFocus.length,
            discoveredAt: new Date().toISOString(),
          })
        }
      }
    }

    // Pattern 2: Sleep vs same-day performance
    const sleepVsPerf = feelings.filter(f => f.sleep && f.focus).map(f => ({ sleep: f.sleep, focus: f.focus }))
    if (sleepVsPerf.length >= 10) {
      const goodSleep = sleepVsPerf.filter(p => p.sleep >= 4)
      const badSleep = sleepVsPerf.filter(p => p.sleep <= 2)
      if (goodSleep.length >= 3 && badSleep.length >= 3) {
        const avgGood = goodSleep.reduce((s, p) => s + p.focus, 0) / goodSleep.length
        const avgBad = badSleep.reduce((s, p) => s + p.focus, 0) / badSleep.length
        const diff = avgGood - avgBad
        if (diff > 0.5) {
          patterns.push({
            id: 'sleep-focus',
            text: `Good sleep (4-5) shows ${Math.round(diff / avgBad * 100)}% higher focus than poor sleep (1-2). Sample: ${sleepVsPerf.length} days.`,
            confidence: sleepVsPerf.length > 30 ? 'high' : 'medium',
            dataPoints: sleepVsPerf.length,
            discoveredAt: new Date().toISOString(),
          })
        }
      }
    }

    localStorage.setItem('jos-patterns', JSON.stringify(patterns))
  } catch { /* ok */ }

  return patterns
}
