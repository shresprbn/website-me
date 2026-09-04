import { useEffect, useRef, useState } from 'react'
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

export default function Euphoria() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('refined')
  const { nodeId, title, shownBeats, isTyping, showingChoices, choices, advance, choose, restart } = useAdventure(
    STORY,
    START_NODE,
  )
  const screenRef = useRef(null)
  const accent = accentFor(nodeId)
  const lastIndex = shownBeats.length - 1

  const pick = (to) => {
    if (to === 'exit') {
      navigate('/playground')
      return
    }
    choose(to)
  }

  useEffect(() => {
    if (mode === 'terminal') screenRef.current?.focus()
  }, [mode, nodeId])

  const onKeyDown = (e) => {
    if (showingChoices) {
      const n = Number(e.key)
      if (Number.isInteger(n)) {
        const idx = n === 0 ? choices.findIndex((c) => c.label.toLowerCase().includes('menu')) : n - 1
        const target = choices[idx]
        if (target) pick(target.to)
      }
      return
    }
    advance()
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

        <div className="adventure-mode-toggle">
          <button
            type="button"
            className={mode === 'refined' ? 'active' : ''}
            onClick={() => setMode('refined')}
          >
            refined
          </button>
          <button
            type="button"
            className={mode === 'terminal' ? 'active' : ''}
            onClick={() => setMode('terminal')}
          >
            terminal
          </button>
        </div>

        {mode === 'refined' ? (
          <div className="adventure-card" style={{ borderColor: accent }}>
            {title && (
              <div className="adventure-card-title" style={{ color: accent }}>
                {title}
              </div>
            )}
            <div className="adventure-card-body">
              {shownBeats.map((beat, i) => (
                <p key={i} className="adventure-card-text">
                  {beat}
                  {isTyping && i === lastIndex && <span className="adventure-cursor" style={{ background: accent }} />}
                </p>
              ))}
            </div>
            {!showingChoices && (
              <button
                type="button"
                className="btn-pill dark adventure-continue"
                style={{ border: 'none', background: accent, color: '#141414' }}
                onClick={advance}
              >
                Continue →
              </button>
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
        ) : (
          <div
            className="terminal-screen"
            tabIndex={0}
            ref={screenRef}
            onKeyDown={onKeyDown}
            onClick={() => {
              if (!showingChoices) advance()
            }}
          >
            {title && <div className="terminal-title">{title}</div>}
            {shownBeats.map((beat, i) => (
              <p key={i} className="terminal-text">
                {beat}
                {isTyping && i === lastIndex && <span className="terminal-cursor" />}
              </p>
            ))}
            {!showingChoices && !isTyping && <p className="terminal-hint">— press any key to continue —</p>}
            {showingChoices && (
              <div className="terminal-choices">
                {choices.map((c, i) => (
                  <button key={c.to + c.label} type="button" className="terminal-choice" onClick={() => pick(c.to)}>
                    {i + 1}. {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="terminal-footer">
          <button type="button" className="terminal-restart" onClick={restart}>
            ↻ restart
          </button>
        </div>
      </div>
    </div>
  )
}
