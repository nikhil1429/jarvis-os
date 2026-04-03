// jarvisConvictions.js — JARVIS's positions and when to refuse

export function checkConviction(context) {
  const { mode, hour, energy, medState } = context
  const hardModes = ['scenario-bomb', 'code-autopsy', 'forensics', 'battle', 'presser', 'alter-ego', 'recruiter-ghost']

  if (hardModes.includes(mode) && (hour >= 23 || hour <= 5) && energy <= 2) {
    return {
      type: 'refuse',
      message: `Sir, I'd advise against ${mode.replace(/-/g, ' ')} right now. Energy at ${energy}, late hour. The expected value is negative.`,
      suggestion: 'Body Double or sleep',
      allowOverride: true,
    }
  }

  if (hardModes.includes(mode) && medState === 'off' && energy <= 3) {
    return {
      type: 'caution',
      message: `Medication has worn off and energy is at ${energy}. Hard modes will feel significantly more difficult.`,
      suggestion: 'Quiz or Teach mode',
      allowOverride: true,
    }
  }

  return null
}
