import { useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Nav from '../components/Nav'
import { STORY, START_NODE } from '../lib/adventureStory'
import { useAdventure } from '../hooks/useAdventure'

export default function EuphoriaTerminal() {
  const navigate = useNavigate()
  const { node, currentBeat, showingChoices, choices, title, advance, choose, restart } = useAdventure(
    STORY,
    START_NODE,
  )
  const screenRef = useRef(null)

  const pick = (to) => {
    if (to === 'exit') {
      navigate('/playground')
      return
    }
    choose(to)
  }

  useEffect(() => {
    screenRef.current?.focus()
  }, [node])

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
    if (currentBeat) advance()
  }

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />
      <div className="container adventure-page">
        <Link to="/playground" className="gallery-back-link">
          ← back to playground
        </Link>
        <div className="playground-header">
          <div className="playground-eyebrow">// EUPHORIA — TERMINAL</div>
          <h1 className="playground-title">A console adventure.</h1>
          <p className="playground-lede">
            Ported straight from the original C source. Press any key to continue, type a number to choose.
          </p>
        </div>

        <div
          className="terminal-screen"
          tabIndex={0}
          ref={screenRef}
          onKeyDown={onKeyDown}
          onClick={() => {
            if (!showingChoices && currentBeat) advance()
          }}
        >
          {title && <div className="terminal-title">{title}</div>}

          {!showingChoices && currentBeat && (
            <>
              <p className="terminal-text">{currentBeat}</p>
              <p className="terminal-hint">— press any key to continue —</p>
            </>
          )}

          {showingChoices && (
            <div className="terminal-choices">
              {choices.map((c, i) => (
                <button key={c.to + c.label} type="button" className="terminal-choice" onClick={() => pick(c.to)}>
                  {i + 1}. {c.label}
                </button>
              ))}
            </div>
          )}

          <span className="terminal-cursor" aria-hidden="true" />
        </div>

        <div className="terminal-footer">
          <button type="button" className="terminal-restart" onClick={restart}>
            ↻ restart
          </button>
          <Link to="/euphoria" className="terminal-restart">
            try the refined version →
          </Link>
        </div>
      </div>
    </div>
  )
}
