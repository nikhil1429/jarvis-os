// useIntelligence.js — 3-Source Intelligence System Hook
// WHY: JARVIS doesn't start dumb. It has 3 layers of knowledge:
//   1. Research priors (priors.js) — ADHD science, always available
//   2. Onboarding seed (jos-onboarding) — what Nikhil told us on Day 1
//   3. Accumulated data (jos-feelings, jos-core) — grows daily from check-ins, journals, etc.
//
// This hook merges all 3 sources and calculates a confidence level per feature.
// Components use this to decide HOW to phrase advice (cautious vs. confident)
// and WHAT data to include in API system prompts.

import { useMemo, useCallback } from 'react'
import useStorage from './useStorage.js'
import priors from '../data/priors.js'
import { getIntelligenceLevel } from '../utils/intelligenceLevel.js'

export default function useIntelligence() {
  const { get } = useStorage()

  // WHY useMemo: these reads are expensive (JSON.parse) — only re-parse when hook re-renders
  const onboarding = useMemo(() => get('onboarding') || {}, [get])
  const feelings = useMemo(() => get('feelings') || [], [get])
  const core = useMemo(() => get('core') || {}, [get])

  // WHY this mapping: each feature draws from different data sources.
  // The count determines confidence level via intelligenceLevel.js
  const getDataCount = useCallback((featureName) => {
    switch (featureName) {
      case 'energy':
        // Energy data comes from daily check-ins stored in feelings
        return Array.isArray(feelings) ? feelings.filter(f => f.energy !== undefined).length : 0
      case 'mood':
        return Array.isArray(feelings) ? feelings.filter(f => f.mood !== undefined).length : 0
      case 'focus':
        return Array.isArray(feelings) ? feelings.filter(f => f.focus !== undefined).length : 0
      case 'sleep':
        return Array.isArray(feelings) ? feelings.filter(f => f.sleep !== undefined).length : 0
      case 'streak':
        return core.totalCheckIns || 0
      default:
        return 0
    }
  }, [feelings, core])

  /**
   * getFeatureIntelligence — The main API for components
   * Returns everything a component or prompt needs to use this feature's intelligence:
   * - level: PRIORS_SEED | EMERGING | LEARNING | CALIBRATED | LOCKED_IN
   * - confidence: 0.40 - 0.95
   * - source: 'priors' or 'personal'
   * - languagePrefix: what to say before advice (e.g., "Based on ADHD research...")
   * - priorData: the research defaults for this feature (from priors.js)
   */
  const getFeatureIntelligence = useCallback((featureName) => {
    const dataCount = getDataCount(featureName)
    const levelInfo = getIntelligenceLevel(featureName, dataCount)
    const priorData = priors[featureName] || null

    return {
      ...levelInfo,
      priorData,
      dataCount,
      onboarding,
    }
  }, [getDataCount, onboarding])

  return { getFeatureIntelligence }
}
