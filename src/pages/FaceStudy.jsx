import { useEffect, useState } from 'react'
import Nav from '../components/Nav'
import StudyTimer from '../components/StudyTimer'
import { CONTEXT_TRAITS, FEATURE_TRAITS, randomFace } from '../lib/faceStudyUtils'

const ACCENT = '#e07a5f'

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

const presetBtn = {
  background: '#faf8f3',
  color: '#141414',
  border: '1px solid #e8e3d8',
  borderRadius: 40,
  padding: '9px 18px',
  fontFamily: "'Space Mono', monospace",
  fontSize: 12,
  cursor: 'pointer',
}

const activePresetBtn = {
  ...presetBtn,
  border: `2px solid ${ACCENT}`,
  background: 'rgba(224, 122, 95, .12)',
}

const fmt = (s) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

const article = (word) => (/^[aeiou]/i.test(word) ? 'An' : 'A')

function TraitRow({ label, value, pending }) {
  return (
    <div className={`face-study-trait${pending ? ' pending' : ''}`}>
      <span className="face-study-trait-label">{label}</span>
      <span className="face-study-trait-value">{pending ? '———' : value}</span>
    </div>
  )
}

export default function FaceStudy() {
  const [face, setFace] = useState(randomFace)
  const [view, setView] = useState('description') // 'description' | 'table'
  const [mode, setMode] = useState('all') // 'all' | 'timed'
  const [intervalSec, setIntervalSec] = useState(60)
  const [revealCount, setRevealCount] = useState(0)
  const [running, setRunning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(60)

  const totalFeatures = FEATURE_TRAITS.length
  const done = revealCount >= totalFeatures
  // all-at-once shows every feature; timed reveals up to revealCount
  const shownFeatures =
    mode === 'all' ? FEATURE_TRAITS : FEATURE_TRAITS.slice(0, revealCount)

  const resetTimed = (secs = intervalSec) => {
    setRevealCount(0)
    setRunning(false)
    setSecondsLeft(secs)
  }

  // Tick the countdown once per second while running.
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [running])

  // When the countdown hits zero, reveal the next feature (or stop when done).
  useEffect(() => {
    if (!running || secondsLeft > 0) return
    const next = Math.min(revealCount + 1, totalFeatures)
    setRevealCount(next)
    if (next >= totalFeatures) setRunning(false)
    else setSecondsLeft(intervalSec)
  }, [secondsLeft, running, revealCount, intervalSec, totalFeatures])

  const newFace = () => {
    setFace(randomFace())
    resetTimed()
  }

  const switchMode = (m) => {
    setMode(m)
    if (m === 'timed') resetTimed()
  }

  const chooseInterval = (secs) => {
    setIntervalSec(secs)
    if (!running) setSecondsLeft(secs)
  }

  const toggleRun = () => {
    if (running) {
      setRunning(false)
      return
    }
    // starting fresh after finishing → restart the study
    if (done) setRevealCount(0)
    setSecondsLeft(intervalSec)
    setRunning(true)
  }

  // Reveal the next feature now instead of waiting out the clock.
  const skipFeature = () => {
    if (done) return
    const next = Math.min(revealCount + 1, totalFeatures)
    setRevealCount(next)
    if (next >= totalFeatures) setRunning(false)
    else setSecondsLeft(intervalSec)
  }

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />

      <div className="container face-study-page">
        <div className="playground-header">
          <div className="playground-eyebrow">// FACE STUDY</div>
          <h1 className="playground-title">Draw a stranger.</h1>
          <p className="playground-lede">
            A face in words — you do the drawing. Get the whole description at once, or
            run the timed study: meet the person first, then draw one feature at a time.
          </p>
        </div>

        <div className="face-study-toolbar">
          <div className="face-study-modes">
            <button
              type="button"
              style={mode === 'all' ? activePresetBtn : presetBtn}
              onClick={() => switchMode('all')}
            >
              all at once
            </button>
            <button
              type="button"
              style={mode === 'timed' ? activePresetBtn : presetBtn}
              onClick={() => switchMode('timed')}
            >
              timed study
            </button>
          </div>
          <button type="button" style={outlineBtn} onClick={newFace}>
            new face ⚄
          </button>
        </div>

        {mode === 'timed' && (
          <div className="face-study-timerbar">
            <StudyTimer
              remaining={secondsLeft}
              seconds={intervalSec}
              running={running}
              accent={ACCENT}
              onChoose={chooseInterval}
              onToggle={toggleRun}
              onSkip={skipFeature}
              skipLabel="Skip"
              skipDisabled={done}
            />
            <div className="face-study-progress">
              {revealCount} / {totalFeatures} features revealed
            </div>
          </div>
        )}

        {mode === 'timed' && (
          <p className="face-study-hint">
            Sketch the shape from who they are, then add each feature as it lands.
          </p>
        )}

        <div className="face-study-card">
          <div className="face-study-cardtop">
            <div className="face-study-views">
              <button
                type="button"
                style={view === 'description' ? activePresetBtn : presetBtn}
                onClick={() => setView('description')}
              >
                description
              </button>
              <button
                type="button"
                style={view === 'table' ? activePresetBtn : presetBtn}
                onClick={() => setView('table')}
              >
                table
              </button>
            </div>
          </div>

          {view === 'description' ? (
            <>
              <p className="face-study-prose">
                <span className="face-study-person">
                  {article(face.age)} {face.age}, {face.temperament} {face.heritage}
                </span>
                {shownFeatures.length > 0 && ' — '}
                {shownFeatures.map((t, i) => {
                  const isLast = i === shownFeatures.length - 1
                  const justRevealed = mode === 'timed' && isLast && !done
                  const sep = i === 0 ? '' : isLast ? '; and ' : '; '
                  return (
                    <span key={t.id}>
                      {sep}
                      <span className={justRevealed ? 'face-study-just' : undefined}>
                        {face[t.id]}
                      </span>
                    </span>
                  )
                })}
                {mode === 'all' || done ? '.' : ' …'}
              </p>

              {mode === 'timed' && shownFeatures.length === 0 && (
                <p className="face-study-waiting">
                  Meet them first, then press start — a feature will surface every {fmt(intervalSec)}.
                </p>
              )}
            </>
          ) : (
            <div className="face-study-table">
              <div className="face-study-group">
                <div className="face-study-group-label">the person</div>
                {CONTEXT_TRAITS.map((t) => (
                  <TraitRow key={t.id} label={t.label} value={face[t.id]} />
                ))}
              </div>

              <div className="face-study-group">
                <div className="face-study-group-label">the face</div>
                {FEATURE_TRAITS.map((t, i) => (
                  <TraitRow
                    key={t.id}
                    label={t.label}
                    value={face[t.id]}
                    pending={mode === 'timed' && i >= revealCount}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
