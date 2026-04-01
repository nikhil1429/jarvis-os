// StatsTab.jsx — Analytics Bay (Tab 5) with report triggers

import { useState } from 'react'
import { FileText, Shield, Star, TrendingUp, Newspaper } from 'lucide-react'
import useReportGenerator from '../../hooks/useReportGenerator.js'
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
  const reportGen = useReportGenerator()

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
      {/* AI Report Generation */}
      <div className="flex gap-2 mt-3">
        <button onClick={() => reportGen.generate3DayTrend()} disabled={!!reportGen.generating}
          className="flex-1 glass-card py-2 text-center hover:border-cyan/30 transition-all disabled:opacity-30">
          <TrendingUp size={14} className="text-cyan mx-auto mb-1" />
          <p className="font-mono text-[8px] text-cyan tracking-wider">{reportGen.generating === 'trend-3d' ? 'GENERATING...' : '3-DAY TREND'}</p>
        </button>
        <button onClick={() => reportGen.generateWeeklyReview()} disabled={!!reportGen.generating}
          className="flex-1 glass-card py-2 text-center hover:border-gold/30 transition-all disabled:opacity-30">
          <FileText size={14} className="text-gold mx-auto mb-1" />
          <p className="font-mono text-[8px] text-gold tracking-wider">{reportGen.generating === 'weekly' ? 'GENERATING...' : 'WEEKLY REVIEW'}</p>
        </button>
        <button onClick={() => reportGen.generateNewsletter()} disabled={!!reportGen.generating}
          className="flex-1 glass-card py-2 text-center hover:border-gold/30 transition-all disabled:opacity-30">
          <Newspaper size={14} className="text-gold mx-auto mb-1" />
          <p className="font-mono text-[8px] text-gold tracking-wider">{reportGen.generating === 'newsletter' ? 'GENERATING...' : 'NEWSLETTER'}</p>
        </button>
      </div>

      {showReport && <QuarterlyReport onClose={() => setShowReport(false)} />}
      {showBrief && <InterviewBrief onClose={() => setShowBrief(false)} />}
      {showReplay && <ReplayTheater onClose={() => setShowReplay(false)} />}
    </div>
  )
}
