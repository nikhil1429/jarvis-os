// LogTab.jsx — Captain's Log (Tab 3) main layout
// WHY: The LOG tab is the daily debrief hub. Check-in form at top (the daily ritual),
// then data visualizations below. Layout: check-in → charts row → stat cards row.
// Everything pulls from jos-feelings, making the check-in the data source for all analytics.

import CheckInForm from './CheckInForm.jsx'
import ConfidenceChart from './ConfidenceChart.jsx'
import WeeklyChart from './WeeklyChart.jsx'
import ImpostorKiller from './ImpostorKiller.jsx'
import NikhilVsNikhil from './NikhilVsNikhil.jsx'
import SessionStats from './SessionStats.jsx'
import MoodOracle from './MoodOracle.jsx'

export default function LogTab({ elapsed }) {
  let isShowMode = false
  try { isShowMode = JSON.parse(localStorage.getItem('jos-settings') || '{}').showMode || false } catch { /* ok */ }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {!isShowMode && <CheckInForm />}

      {/* Charts row — hidden in Show Mode (contains mood/confidence data) */}
      {!isShowMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ConfidenceChart />
          <WeeklyChart />
        </div>
      )}

      {/* Stat cards row */}
      <div className={`grid grid-cols-1 ${isShowMode ? '' : 'md:grid-cols-3'} gap-4`}>
        {!isShowMode && <ImpostorKiller />}
        {!isShowMode && <NikhilVsNikhil />}
        <SessionStats elapsed={elapsed} />
      </div>

      {!isShowMode && <MoodOracle />}
    </div>
  )
}
