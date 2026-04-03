// StatsTab.jsx — Analytics Bay (Tab 5) with report triggers

import { useState, useEffect } from 'react'
import { FileText, Shield, Star, TrendingUp, Newspaper, AlertTriangle } from 'lucide-react'
import useReportGenerator from '../../hooks/useReportGenerator.js'
import useStorage from '../../hooks/useStorage.js'
import useAI from '../../hooks/useAI.js'
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
import TrendReport from '../reports/TrendReport.jsx'

export default function StatsTab() {
  const [showReport, setShowReport] = useState(false)
  const [showBrief, setShowBrief] = useState(false)
  const [showReplay, setShowReplay] = useState(false)
  const [whyNotHired, setWhyNotHired] = useState(null)
  const [activeReport, setActiveReport] = useState(null)
  const reportGen = useReportGenerator()
  const { get } = useStorage()
  const { sendMessage, isStreaming } = useAI()
  const apps = get('applications') || []

  const runWhyNotHired = async () => {
    setWhyNotHired('generating')
    try {
      const result = await sendMessage(
        `Nikhil has applied to ${apps.length} companies. Application data: ${JSON.stringify(apps.slice(-20))}. Analyze patterns: 1) Rejection clusters by type/level/industry? 2) Resume keyword gaps? 3) Skill gaps vs concept strengths? 4) Interview performance bottleneck or application quality? 5) One specific actionable change for next week. Be brutally honest. Data over feelings.`,
        'weakness-radar', {}
      )
      setWhyNotHired(result?.text || 'No analysis generated.')
    } catch { setWhyNotHired('Analysis failed. Try again.') }
  }
  let isShowMode = false
  try { isShowMode = JSON.parse(localStorage.getItem('jos-settings') || '{}').showMode || false } catch { /* ok */ }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <ReadinessScore />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NikhilScore />
        <PowerRanking />
      </div>
      <SkillHeatMap />
      {!isShowMode && <ConfidenceCalib />}
      <IntelligenceDash />
      <PortfolioNarrator />

      {/* Why Not Hired Diagnostic */}
      {apps.length >= 10 && (
        <div className="glass-card p-4 mt-4">
          <button onClick={runWhyNotHired} disabled={whyNotHired === 'generating' || isStreaming}
            className="w-full text-left disabled:opacity-40">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={14} style={{ color: '#ef4444' }} />
              <span className="font-mono text-[11px] tracking-wider" style={{ color: '#ef4444' }}>"WHY NOT HIRED?" DIAGNOSTIC</span>
            </div>
            <p className="font-mono text-[10px] text-text-muted">{apps.length} applications logged · Opus deep analysis</p>
          </button>
          {whyNotHired && whyNotHired !== 'generating' && (
            <p className="font-body text-xs text-text leading-relaxed mt-3 whitespace-pre-wrap">{whyNotHired}</p>
          )}
          {whyNotHired === 'generating' && (
            <p className="font-mono text-[10px] text-gold/60 tracking-wider mt-3 animate-pulse">ANALYSING APPLICATION PATTERNS...</p>
          )}
        </div>
      )}

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

      {/* AI Report Generation */}
      <div className="flex gap-2 mt-3">
        <button onClick={async () => {
          const report = await reportGen.generate3DayTrend()
          if (report) setActiveReport(report)
        }} disabled={!!reportGen.generating}
          className="flex-1 glass-card py-2 text-center hover:border-cyan/30 transition-all disabled:opacity-30">
          <TrendingUp size={14} className="text-cyan mx-auto mb-1" />
          <p className="font-mono text-[8px] text-cyan tracking-wider">{reportGen.generating === 'trend-3d' ? 'GENERATING...' : '3-DAY TREND'}</p>
        </button>
        <button onClick={async () => {
          const report = await reportGen.generateWeeklyReview()
          if (report) setActiveReport(report)
        }} disabled={!!reportGen.generating}
          className="flex-1 glass-card py-2 text-center hover:border-gold/30 transition-all disabled:opacity-30">
          <FileText size={14} className="text-gold mx-auto mb-1" />
          <p className="font-mono text-[8px] text-gold tracking-wider">{reportGen.generating === 'weekly' ? 'GENERATING...' : 'WEEKLY REVIEW'}</p>
        </button>
        <button onClick={async () => {
          const report = await reportGen.generateNewsletter()
          if (report) setActiveReport({ type: 'newsletter', ...report })
        }} disabled={!!reportGen.generating}
          className="flex-1 glass-card py-2 text-center hover:border-gold/30 transition-all disabled:opacity-30">
          <Newspaper size={14} className="text-gold mx-auto mb-1" />
          <p className="font-mono text-[8px] text-gold tracking-wider">{reportGen.generating === 'newsletter' ? 'GENERATING...' : 'NEWSLETTER'}</p>
        </button>
      </div>

      {activeReport && <TrendReport report={activeReport} onClose={() => setActiveReport(null)} />}

      {showReport && <QuarterlyReport onClose={() => setShowReport(false)} />}
      {showBrief && <InterviewBrief onClose={() => setShowBrief(false)} />}
      {showReplay && <ReplayTheater onClose={() => setShowReplay(false)} />}
    </div>
  )
}
