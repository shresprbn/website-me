import { useNavigate, Link } from 'react-router-dom'
import Nav from '../components/Nav'
import { STORY, START_NODE } from '../lib/adventureStory'
import { useAdventure } from '../hooks/useAdventure'

function accentFor(nodeId) {
  if (nodeId === 'death') return '#c14953'
  if (nodeId === 'happy' || nodeId.startsWith('ending')) return '#ffb800'
  if (nodeId === 'menu' || nodeId === 'chapters') return '#ff6b9d'
  if (nodeId.startsWith('c1')) return '#5b8def'
  if (nodeId.startsWith('c2')) return '#57b894'
  if (nodeId.startsWith('c3')) return '#e07a5f'
  return '#7c6cf0'
}

export default function EuphoriaStory() {
  const navigate = useNavigate()
  const { nodeId, currentBeat, showingChoices, choices, title, advance, choose, restart } = useAdventure(
    STORY,
    START_NODE,
  )
  const accent = accentFor(nodeId)

  const pick = (to) => {
    if (to === 'exit') {
      navigate('/playground')
      return
    }
    choose(to)
  }

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />
      <div className="container adventure-page">
        <Link to="/playground" className="gallery-back-link">
          ← back to playground
        </Link>
        <div className="playground-header">
          <div className="playground-eyebrow">// EUPHORIA</div>
          <h1 className="playground-title">A choice, a cave, a long way home.</h1>
          <p className="playground-lede">
            Wake up in a cave with no memory of how you got there. Get home. Everything else is up to you.
          </p>
        </div>

        <div className="adventure-card" style={{ borderColor: accent }} key={nodeId}>
          {title && (
            <div className="adventure-card-title" style={{ color: accent }}>
              {title}
            </div>
          )}

          {!showingChoices && currentBeat && (
            <>
              <p className="adventure-card-text">{currentBeat}</p>
              <button
                type="button"
                className="btn-pill dark adventure-continue"
                style={{ border: 'none', background: accent, color: '#141414' }}
                onClick={advance}
              >
                Continue →
              </button>
            </>
          )}

          {showingChoices && (
            <div className="adventure-choices">
              {choices.map((c) => (
                <button
                  key={c.to + c.label}
                  type="button"
                  className="adventure-choice"
                  style={{ '--accent': accent }}
                  onClick={() => pick(c.to)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="terminal-footer">
          <button type="button" className="terminal-restart" onClick={restart}>
            ↻ restart
          </button>
          <Link to="/euphoria-terminal" className="terminal-restart">
            try the terminal version →
          </Link>
        </div>
      </div>
    </div>
  )
}
