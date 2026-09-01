import { Link } from 'react-router-dom'
import { PLAYGROUND_ITEMS } from '../lib/playgroundItems'

const FEATURED = PLAYGROUND_ITEMS.slice(0, 6)

export default function PlaygroundGrid() {
  return (
    <section id="playground-teaser" style={{ paddingTop: 72, paddingBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 34, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 42, letterSpacing: '-0.025em' }}>
          The playground
        </h2>
        <Link
          to="/playground"
          className="nav-link"
          style={{ textDecoration: 'none', fontFamily: "'Space Mono', monospace", fontSize: 13, color: '#8a8a8a' }}
        >
          see all {PLAYGROUND_ITEMS.length} →
        </Link>
      </div>

      <p style={{ margin: '0 0 26px', fontSize: 15, lineHeight: 1.6, color: '#666', maxWidth: 560 }}>
        Little toys I built because a blog should be more fun than an essay. Draw, play, break things.
      </p>

      <div className="playground-hub-grid">
        {FEATURED.map((item) => (
          <Link key={item.to} to={item.to} className="playground-hub-card">
            <span className="playground-hub-glyph" style={{ color: item.color }}>
              {item.glyph}
            </span>
            <span className="playground-hub-title">{item.title}</span>
            <span className="playground-hub-blurb">{item.blurb}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
