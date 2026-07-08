const langs = [
  { label: 'Nepali',     bg: null,      color: '#141414', border: '2px solid #141414' },
  { label: 'English',    bg: '#ff6b9d', color: '#3d0d22', border: null },
  { label: 'Hindi',      bg: '#4ecdc4', color: '#0d2e2b', border: null },
  { label: 'JavaScript', bg: null,      color: '#141414', border: '2px solid #141414' },
  { label: 'C++',        bg: '#ffd23f', color: '#7a5c00', border: null },
  { label: 'Python',     bg: null,      color: '#141414', border: '2px solid #141414' },
]

export default function Languages() {
  return (
    <div style={{ padding: '80px 0' }}>
      <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 36, letterSpacing: '-0.025em' }}>Languages I speak</h2>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: '#8a8a8a', margin: '8px 0 26px' }}>human + machine</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {langs.map((l) => (
          <span key={l.label} style={{ background: l.bg || 'transparent', color: l.color, border: l.border || 'none', borderRadius: 40, padding: '11px 22px', fontWeight: 600, fontSize: 15 }}>
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}
