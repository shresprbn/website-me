import { useEffect, useRef, useState } from 'react'
import { TRACKS, STEPS_PER_BAR, createSequencer } from '../lib/beatUtils'
import { MELODY_COLOR, MELODY_OCTAVES, octaveStepLines } from '../lib/melodyUtils'

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

function BeatMarks() {
  return (
    <div className="beat-maker-beat-marks" aria-hidden="true">
      <span />
      {[1, 2, 3, 4].map((beat) => (
        <span key={beat} className="beat-maker-beat-mark">
          {beat}
        </span>
      ))}
    </div>
  )
}

export default function BeatViewer({ bpm, drumPages, melodyPages }) {
  const seqRef = useRef(null)
  const dataRef = useRef({ bpm, drumPages, melodyPages })
  dataRef.current = { bpm, drumPages, melodyPages }

  const [playing, setPlaying] = useState(false)
  const [viewBar, setViewBar] = useState(0)
  const [head, setHead] = useState(null)

  const barCount = Math.max(drumPages.length, melodyPages.length, 1)

  useEffect(() => {
    const seq = createSequencer({
      getPages: () => dataRef.current.drumPages,
      getMelodyPages: () => dataRef.current.melodyPages,
      getBpm: () => dataRef.current.bpm || 120,
      onStep: ({ drum, melody }) => {
        const pos = drum || melody
        if (!pos) return
        setHead(pos)
        setViewBar(pos.barIndex)
      },
    })
    seqRef.current = seq
    return () => seq.dispose()
  }, [])

  const toggle = async () => {
    const seq = seqRef.current
    if (!seq) return
    if (playing) {
      seq.stop()
      setPlaying(false)
      setHead(null)
      return
    }
    const ok = await seq.start(viewBar * STEPS_PER_BAR)
    if (ok) setPlaying(true)
  }

  const drumBar = drumPages[Math.min(viewBar, drumPages.length - 1)] || null
  const melodyBar = melodyPages[Math.min(viewBar, melodyPages.length - 1)] || null
  const headHere = head && head.barIndex === viewBar

  return (
    <div className="beat-viewer">
      <div className="beat-maker-pager">
        <button
          type="button"
          className="btn-pill dark"
          style={{ padding: '11px 26px', fontSize: 13, border: 'none', minWidth: 110 }}
          onClick={toggle}
        >
          {playing ? 'stop ■' : 'play ▶'}
        </button>
        {barCount > 1 && (
          <>
            <button
              type="button"
              style={presetBtn}
              onClick={() => setViewBar((v) => Math.max(0, v - 1))}
              disabled={viewBar === 0}
            >
              ← prev
            </button>
            <span className="beat-maker-page-label">
              bar {viewBar + 1} / {barCount}
            </span>
            <button
              type="button"
              style={presetBtn}
              onClick={() => setViewBar((v) => Math.min(barCount - 1, v + 1))}
              disabled={viewBar >= barCount - 1}
            >
              next →
            </button>
          </>
        )}
      </div>

      {drumBar && (
        <div className="beat-maker-stage">
          <BeatMarks />
          {TRACKS.map((track, trackIndex) => (
            <div key={track.id} className="beat-maker-row">
              <span className="beat-maker-track-label" style={{ color: track.color }}>
                {track.label}
              </span>
              <div className="beat-maker-pads">
                {drumBar[trackIndex].map((on, stepIndex) => {
                  const isBeat = stepIndex % 4 === 0
                  const isCurrent = headHere && head.stepIndex === stepIndex
                  return (
                    <div
                      key={stepIndex}
                      className={[
                        'beat-maker-pad',
                        on ? 'on' : '',
                        isBeat ? 'beat' : '',
                        isCurrent ? 'current' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={on ? { background: track.color, borderColor: track.color } : undefined}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {melodyBar && (
        <div className="beat-maker-stage beat-maker-melody-stage">
          <BeatMarks />
          <div className="beat-maker-melody-roll">
            {MELODY_OCTAVES.map((oct) => {
              const linesByStep = octaveStepLines(melodyBar, oct.noteIndices)
              if (!linesByStep.some((l) => l.length)) return null
              return (
                <div key={oct.id} className="beat-maker-octave">
                  <div className="beat-maker-row beat-maker-octave-summary">
                    <span className="beat-maker-track-label beat-maker-note-label">{oct.range}</span>
                    <div className="beat-maker-pads">
                      {linesByStep.map((lines, stepIndex) => {
                        const isBeat = stepIndex % 4 === 0
                        const isCurrent = headHere && head.stepIndex === stepIndex
                        return (
                          <div
                            key={stepIndex}
                            className={[
                              'beat-maker-pad',
                              'beat-maker-melody-pad',
                              'beat-maker-summary-pad',
                              lines.length ? 'on' : '',
                              isBeat ? 'beat' : '',
                              isCurrent ? 'current' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            {lines.map((h, i) => (
                              <span
                                key={i}
                                className="beat-maker-summary-line"
                                style={{ top: `${8 + (1 - h) * 70}%`, background: MELODY_COLOR }}
                              />
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
