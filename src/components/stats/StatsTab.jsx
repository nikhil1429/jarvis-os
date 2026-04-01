// StatsTab.jsx — Analytics Bay (Tab 5) main layout
// WHY: The STATS tab is the data cockpit. Interview Readiness gauge is prominent
// at top (the north star metric), then detailed breakdowns below. Layout gives
// Nikhil a complete picture of his progress in one scrollable view.

import ReadinessScore from './ReadinessScore.jsx'
import NikhilScore from './NikhilScore.jsx'
import PowerRanking from './PowerRanking.jsx'
import SkillHeatMap from './SkillHeatMap.jsx'
import ConfidenceCalib from './ConfidenceCalib.jsx'
import IntelligenceDash from './IntelligenceDash.jsx'
import PortfolioNarrator from './PortfolioNarrator.jsx'

export default function StatsTab() {
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* North star metric */}
      <ReadinessScore />

      {/* Score cards row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NikhilScore />
        <PowerRanking />
      </div>

      {/* Skill heat map — full width */}
      <SkillHeatMap />

      {/* Calibration */}
      <ConfidenceCalib />

      {/* Intelligence System */}
      <IntelligenceDash />

      {/* Portfolio Narrator */}
      <PortfolioNarrator />
    </div>
  )
}
