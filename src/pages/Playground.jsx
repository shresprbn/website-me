import { Link } from 'react-router-dom'
import Nav from '../components/Nav'
import { PLAYGROUND_ITEMS as ITEMS } from '../lib/playgroundItems'

export default function Playground() {
  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />
      <div className="container playground-hub-page">
        <div className="playground-header">
          <div className="playground-eyebrow">// PLAYGROUND</div>
          <h1 className="playground-title">A pile of little toys.</h1>
          <p className="playground-lede">
            Things I built because the blog needed to be more fun than an essay. Pick one.
          </p>
        </div>

        <div className="playground-hub-grid">
          {ITEMS.map((item) => (
            <Link key={item.to} to={item.to} className="playground-hub-card">
              <span className="playground-hub-glyph" style={{ color: item.color }}>
                {item.glyph}
              </span>
              <span className="playground-hub-title">{item.title}</span>
              <span className="playground-hub-blurb">{item.blurb}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
