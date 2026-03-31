// priors.js — ADHD Research Priors (Default Intelligence Layer)
// WHY: Before JARVIS knows anything about Nikhil specifically, it needs sensible defaults
// based on ADHD research. These priors let JARVIS give useful advice from Day 1 instead
// of saying "I don't have enough data yet." As real user data accumulates, these priors
// get gradually overridden by personalized intelligence (see useIntelligence.js).

const priors = {
  energyCycles: {
    description: 'Typical ADHD energy patterns throughout the day',
    data: {
      peakHours: { start: 10, end: 13, label: '10am–1pm', note: 'Highest focus window — schedule deep work here' },
      crashHours: { start: 14, end: 16, label: '2–4pm', note: 'Post-lunch dip — schedule admin/light tasks' },
      secondWind: { start: 21, end: 23, label: '9–11pm', note: 'Common second wind — good for creative work, bad for sleep hygiene' },
    },
    source: 'ADHD circadian research, Barkley (2015)',
  },

  caffeine: {
    description: 'Caffeine impact patterns for ADHD individuals',
    data: {
      maxCups: 3,
      anxietyThreshold: '>3 cups significantly increases anxiety and restlessness',
      cutoffTime: '2:00 PM',
      cutoffReason: 'Caffeine half-life ~5hrs — after 2pm it disrupts sleep onset',
      note: 'ADHD brains often self-medicate with caffeine — track correlation with focus scores',
    },
    source: 'Sleep Foundation, Adler (2017)',
  },

  estimationBias: {
    description: 'Time estimation patterns in ADHD',
    data: {
      underestimationRange: { min: 30, max: 50, unit: 'percent' },
      note: 'ADHD consistently underestimates task duration by 30–50%. Apply 1.5x multiplier to all estimates.',
      strategy: 'Break tasks into subtasks, estimate each, then add 50% buffer to total',
    },
    source: 'Barkley & Fischer (2019)',
  },

  burnoutIndicators: {
    description: 'Six leading signals of approaching burnout',
    data: [
      { signal: 'Declining check-in scores', description: 'Energy/mood trending down over 5+ days', weight: 0.2 },
      { signal: 'Skipped routines', description: 'Missing morning bets or journal entries', weight: 0.2 },
      { signal: 'Increased irritability', description: 'Self-reported frustration or snapping in journal', weight: 0.15 },
      { signal: 'Sleep disruption', description: '<6hrs or inconsistent sleep/wake times', weight: 0.15 },
      { signal: 'Avoidance behavior', description: 'Delaying or skipping planned deep work sessions', weight: 0.15 },
      { signal: 'Physical symptoms', description: 'Headaches, jaw tension, stomach issues reported in check-ins', weight: 0.15 },
    ],
    source: 'Maslach Burnout Inventory adapted for ADHD, Surman (2013)',
  },

  medication: {
    description: 'Typical stimulant medication patterns',
    data: {
      onsetMinutes: { min: 30, max: 45 },
      durationHours: { min: 4, max: 8 },
      crashPattern: 'Focus and mood dip 30–60min after wearing off',
      note: 'Track medication timing against focus scores to find personal optimal window',
    },
    source: 'Faraone & Glatt (2010)',
  },

  focus: {
    description: 'Deep work capacity research',
    data: {
      maxDeepWorkMinutes: { min: 90, max: 120 },
      qualityDropNote: 'After 90–120min of sustained focus, error rate increases and creativity drops',
      strategy: 'Use Pomodoro-style breaks or switch task types after 90min blocks',
    },
    source: 'Newport (2016), adapted for ADHD attention spans',
  },

  sleep: {
    description: 'Sleep-productivity correlation',
    data: {
      criticalThresholdHours: 6,
      productivityDropPercent: 40,
      note: '<6hrs sleep correlates with ~40% productivity drop next day',
      adhDSpecific: 'ADHD individuals are 2–3x more likely to have sleep onset issues',
    },
    source: 'Walker (2017), Hvolby (2015)',
  },
}

export default priors
