const essays = [
  {
    href:    'https://medium.com/@shresprbn/people-always-forget-that-icarus-also-flew-4c5abf9cb7f5',
    bg:      '#ffd23f', textColor: 'inherit', labelColor: '#7a5c00', quoteColor: '#6b5200',
    label:   'JUL 2025 · ESSAY',
    title:   'People always forget that Icarus also flew',
    quote:   '"We were running, scared of the light — as if we\'d burn out and cease to exist."',
  },
  {
    href:    'https://medium.com/@shresprbn/defining-myself-through-art-c19caea0f457',
    bg:      '#ff6b9d', textColor: '#3d0d22', labelColor: 'rgba(61,13,34,.75)', quoteColor: 'rgba(61,13,34,.85)',
    label:   'OCT 2024 · ESSAY',
    title:   'Defining Myself through Art',
    quote:   '"For weeks I\'ve had this urge to write about something I can\'t quite name."',
  },
  {
    href:    'https://medium.com/@shresprbn/about-memory-of-things-d860ffefa6ce',
    bg:      '#4ecdc4', textColor: '#0d2e2b', labelColor: 'rgba(13,46,43,.7)', quoteColor: 'rgba(13,46,43,.85)',
    label:   'AUG 2024 · ESSAY',
    title:   'About Memory of Things',
    quote:   '"Can we throw anything away, or are we doomed to keep collecting?"',
  },
  {
    href:    'https://medium.com/@shresprbn/pale-blue-eyes-the-velvet-underground-80b83ad56fad',
    bg:      '#141414', textColor: '#fff', labelColor: '#4ecdc4', quoteColor: '#bdbdbd',
    label:   'JUN 2024 · ON MUSIC',
    title:   'Pale Blue Eyes — The Velvet Underground',
    quote:   '"The band and I have a really weird, ongoing relationship."',
  },
  {
    href:    'https://medium.com/@shresprbn/about-those-self-portraits-e16d43bfe357',
    bg:      '#fff', textColor: 'inherit', labelColor: '#8a8a8a', quoteColor: '#666',
    border:  '1px solid #ece8df',
    label:   'JUN 2024 · ESSAY',
    title:   'About Those Self Portraits',
    quote:   '"Have you ever thought about people who paint themselves?"',
    white:   true,
  },
  {
    href:    'https://medium.com/@shresprbn/about-those-feelings-d8f75b025c85',
    bg:      '#fff', textColor: 'inherit', labelColor: '#8a8a8a', quoteColor: '#666',
    border:  '1px solid #ece8df',
    label:   'JUN 2024 · ESSAY',
    title:   'About those Feelings',
    quote:   '"I feel kind of trapped, because I can\'t describe how I\'m feeling."',
    white:   true,
  },
]

export default function WritingGrid() {
  return (
    <section id="writing" style={{ paddingTop: 88, paddingBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 34, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 42, letterSpacing: '-0.025em' }}>Recent writing</h2>
        <a href="https://medium.com/@shresprbn" target="_blank" rel="noreferrer"
           style={{ textDecoration: 'none', fontFamily: "'Space Mono', monospace", fontSize: 13, color: '#8a8a8a', transition: 'color .15s ease' }}
           className="nav-link">all on medium →</a>
      </div>
      <div className="writing-grid">
        {essays.map((e) => (
          <a
            key={e.href}
            href={e.href}
            target="_blank"
            rel="noreferrer"
            className={`essay-card${e.white ? ' white' : ''}`}
            style={{ background: e.bg, color: e.textColor, border: e.border }}
          >
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.1em', color: e.labelColor }}>{e.label}</div>
            <div className="essay-title" style={{ color: e.textColor }}>{e.title}</div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: e.quoteColor, marginTop: 11 }}>{e.quote}</div>
          </a>
        ))}
      </div>
    </section>
  )
}
