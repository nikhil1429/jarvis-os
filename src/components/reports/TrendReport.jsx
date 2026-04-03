// TrendReport.jsx — Displays 3-Day Trend or Weekly Review AI report
import { X } from 'lucide-react'
import renderMd from '../../utils/renderMd.js'

export default function TrendReport({ report, onClose }) {
  if (!report?.text) return null
  const isWeekly = report.type === 'weekly'
  return (
    <div className="glass-card card-enter" style={{ padding: 14, borderTop: `3px solid ${isWeekly ? '#d4a853' : '#00b4d8'}`, marginBottom: 12 }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`font-display text-xs font-bold tracking-wider ${isWeekly ? 'gold-heading' : 'neon-heading'}`}
            style={{ color: isWeekly ? '#d4a853' : '#00b4d8' }}>
            {isWeekly ? `WEEKLY REVIEW${report.weekNumber ? ` — WEEK ${report.weekNumber}` : ''}` : '3-DAY TREND'}
          </span>
        </div>
        {onClose && <button onClick={onClose} className="text-text-muted hover:text-text"><X size={14} /></button>}
      </div>
      <div className="font-body text-xs text-text leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMd(report.text) }} />
      {report.generatedAt && (
        <p className="font-mono text-[8px] text-text-muted mt-2">
          Generated {new Date(report.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} {new Date(report.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  )
}
