// VizBlocker.jsx — Root cause concept blocking another
import VizConceptRing from './VizConceptRing.jsx'
export default function VizBlocker({ blocked, blocker, blockedStrength, blockerStrength }) {
  return (
    <div className="glass-card" style={{ padding: 8, borderLeft: '2px solid #ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
      <VizConceptRing name={blocker} strength={blockerStrength} size={36} />
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#ef4444', letterSpacing: '0.1em' }}>ROOT CAUSE</p>
        <p style={{ fontFamily: 'Exo 2', fontSize: 10, color: '#d0e8f8' }}>{blocker} at {blockerStrength}% is blocking {blocked}</p>
      </div>
      <VizConceptRing name={blocked} strength={blockedStrength} size={36} />
    </div>
  )
}
