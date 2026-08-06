import { Link } from 'react-router-dom'
import Nav from '../components/Nav'

const ITEMS = [
  {
    to: '/bounce-lab',
    glyph: '⬤',
    color: '#5b8def',
    title: 'Bounce Lab',
    blurb: 'Drop stuff. Drag stuff. Watch it bounce.',
  },
  {
    to: '/pixel-maker',
    glyph: '✎',
    color: '#4ecdc4',
    title: 'Pixel Maker',
    blurb: 'Paint tiny things — a small grid editor.',
  },
  {
    to: '/beat-maker',
    glyph: '♪',
    color: '#ffb800',
    title: 'Beat Maker',
    blurb: 'Tap out a loop — drums and melody.',
  },
  {
    to: '/character-maker',
    glyph: '◐',
    color: '#57b894',
    title: 'Character Maker',
    blurb: 'Build a little guy.',
  },
  {
    to: '/reference-puller',
    glyph: '◈',
    color: '#7c6cf0',
    title: 'Reference Puller',
    blurb: 'Draw from the greats.',
  },
  {
    to: '/face-study',
    glyph: '◎',
    color: '#e07a5f',
    title: 'Face Study',
    blurb: 'Draw a stranger.',
  },
  {
    to: '/fortune-teller',
    glyph: '✦',
    color: '#9d4edd',
    title: 'Fortune Teller',
    blurb: 'Ask the crystal ball.',
  },
  {
    to: '/gallery',
    glyph: '▦',
    color: '#ff6b9d',
    title: 'Gallery',
    blurb: 'What people made.',
  },
]

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
