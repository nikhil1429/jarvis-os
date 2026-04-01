// StatsTab.jsx — Analytics Bay (Tab 5) with report triggers

import { useState } from 'react'
import { FileText, Shield, Star } from 'lucide-react'
import ReadinessScore from './ReadinessScore.jsx'
import NikhilScore from './NikhilScore.jsx'
import PowerRanking from './PowerRanking.jsx'
import SkillHeatMap from './SkillHeatMap.jsx'
import ConfidenceCalib from './ConfidenceCalib.jsx'
import IntelligenceDash from './IntelligenceDash.jsx'
import PortfolioNarrator from './PortfolioNarrator.jsx'
import QuarterlyReport from '../reports/QuarterlyReport.jsx'
import InterviewBrief from '../reports/InterviewBrief.jsx'
import ReplayTheater from '../reports/ReplayTheater.jsx'

export default function StatsTab() {
  const [showReport, setShowReport] = useState(false)
  const [showBrief, setShowBrief] = useState(false)
  const [showReplay, setShowReplay] = useState(false)

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <ReadinessScore />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NikhilScore />
        <PowerRanking />
      </div>
      <SkillHeatMap />
      <ConfidenceCalib />
      <IntelligenceDash />
      <PortfolioNarrator />

      {/* Report triggers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        <button onClick={() => setShowReport(true)}
          className="glass-card p-4 text-center hover:border-gold/30 transition-all group">
          <FileText size={20} className="text-gold mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-display text-xs font-bold text-gold tracking-wider gold-heading">QUARTERLY REPORT</p>
          <p className="font-mono text-[8px] text-text-muted mt-1">Opus deep analysis</p>
        </button>
        <button onClick={() => setShowBrief(true)}
          className="glass-card p-4 text-center hover:border-cyan/30 transition-all group">
          <Shield size={20} className="text-cyan mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-display text-xs font-bold text-cyan tracking-wider neon-heading">INTERVIEW BRIEF</p>
          <p className="font-mono text-[8px] text-text-muted mt-1">Pre-interview intel</p>
        </button>
        <button onClick={() => setShowReplay(true)}
          className="glass-card p-4 text-center hover:border-gold/30 transition-all group">
          <Star size={20} className="text-gold mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-display text-xs font-bold text-gold tracking-wider gold-heading">BEST MOMENTS</p>
          <p className="font-mono text-[8px] text-text-muted mt-1">Top quiz replays</p>
        </button>
      </div>

      {/* Overlays */}
      {showReport && <QuarterlyReport onClose={() => setShowReport(false)} />}
      {showBrief && <InterviewBrief onClose={() => setShowBrief(false)} />}
      {showReplay && <ReplayTheater onClose={() => setShowReplay(false)} />}
    </div>
  )
}
