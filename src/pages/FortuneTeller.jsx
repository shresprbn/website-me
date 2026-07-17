import { useEffect, useRef, useState } from 'react'
import Nav from '../components/Nav'
import fortuneTeller from '../assets/fortune-teller.svg'
import { randomFortune } from '../lib/fortuneData'

const ACCENT = '#9d4edd'
const LOADING_MS = 2200

const outlineBtn = {
  background: 'transparent',
  color: '#8a8a8a',
  border: '2px solid #e0dbd0',
  borderRadius: 40,
  padding: '11px 22px',
  fontFamily: "'Space Mono', monospace",
  fontSize: 13,
  cursor: 'pointer',
}

// deliberately meaningless status lines for the (pointless) loading screen
const CONSULTING = [
  'consulting the beyond…',
  'shuffling the cosmos…',
  'aligning the stars…',
  'polishing the crystal ball…',
  'decoding the vibes…',
]

export default function FortuneTeller() {
  const [phase, setPhase] = useState('ask') // 'ask' | 'loading' | 'reveal'
  const [question, setQuestion] = useState('')
  const [asked, setAsked] = useState('')
  const [fortune, setFortune] = useState('')
  const [consulting, setConsulting] = useState(CONSULTING[0])
  const timerRef = useRef(null)

  // Always clear a pending reveal timer on unmount.
  useEffect(() => () => clearTimeout(timerRef.current), [])

  const ask = () => {
    const q = question.trim()
    if (!q || phase === 'loading') return
    setAsked(q)
    setConsulting(CONSULTING[Math.floor(Math.random() * CONSULTING.length)])
    setPhase('loading')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setFortune(randomFortune())
      setPhase('reveal')
    }, LOADING_MS)
  }

  const askAgain = () => {
    clearTimeout(timerRef.current)
    setQuestion('')
    setFortune('')
    setAsked('')
    setPhase('ask')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      ask()
    }
  }

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />

      <div className="container fortune-teller-page">
        <div className="playground-header">
          <div className="playground-eyebrow">// FORTUNE TELLER</div>
          <h1 className="playground-title">Ask the crystal ball.</h1>
          <p className="playground-lede">
            Type a question, let the oracle stall dramatically for no reason at all, and give you a prediction. Accuracy not guaranteed;
            entertainment mildly implied.
          </p>
        </div>

        <div className={`fortune-teller-stage${phase === 'loading' ? ' is-loading' : ''}`}>
          <img
            src={fortuneTeller}
            alt="A fortune teller peering into a crystal ball"
            className="fortune-teller-img"
          />

          {phase === 'ask' && (
            <div className="fortune-ask">
              <input
                className="fortune-input"
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="ask me anything…"
                aria-label="Your question for the fortune teller"
                autoFocus
              />
              <button
                type="button"
                className="btn-pill dark"
                style={{
                  padding: '13px 24px',
                  fontSize: 14,
                  border: 'none',
                  opacity: question.trim() ? 1 : 0.4,
                  cursor: question.trim() ? 'pointer' : 'not-allowed',
                }}
                onClick={ask}
                disabled={!question.trim()}
              >
                consult the oracle ✦
              </button>
            </div>
          )}

          {phase === 'loading' && (
            <div className="fortune-loading">
              <span className="fortune-consulting" style={{ color: ACCENT }}>
                // {consulting}
              </span>
            </div>
          )}

          {phase === 'reveal' && (
            <div className="fortune-card">
              <div className="fortune-question">
                you asked: <span>{asked}</span>
              </div>
              <p className="fortune-line">{fortune}</p>
              <button type="button" style={outlineBtn} onClick={askAgain}>
                ask again ↻
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
