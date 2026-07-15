import { useEffect, useRef, useState } from 'react'
import Nav from '../components/Nav'
import {
  TRACKS,
  STEPS_PER_BAR,
  MAX_BARS,
  MIN_BPM,
  MAX_BPM,
  DEFAULT_BPM,
  createEmptyBar,
  createDefaultPages,
  clonePages,
  barHasContent,
  pagesHaveContent,
  createSequencer,
  playTrackHit,
} from '../lib/beatUtils'
import {
  MELODY_NOTES,
  MELODY_COLOR,
  MELODY_OCTAVES,
  createEmptyMelodyBar,
  createDefaultMelodyPages,
  cloneMelodyPages,
  melodyBarHasContent,
  melodyPagesHaveContent,
  playMelodyByIndex,
  octaveStepLines,
} from '../lib/melodyUtils'

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
  border: '2px solid #ffb800',
  background: 'rgba(255, 184, 0, .12)',
}

function clampBpm(n) {
  if (!Number.isFinite(n)) return DEFAULT_BPM
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(n)))
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

function SectionTransport({
  playing,
  onTogglePlay,
  bpm,
  onBpmChange,
  pages,
  viewBar,
  onViewBar,
  onAddBar,
  onRemoveBar,
  onClearBar,
  onClearAll,
  accent = '#ffb800',
}) {
  const [bpmDraft, setBpmDraft] = useState(String(bpm))

  useEffect(() => {
    setBpmDraft(String(bpm))
  }, [bpm])

  const commitBpm = () => {
    const next = clampBpm(Number(bpmDraft))
    setBpmDraft(String(next))
    onBpmChange(next)
  }

  const activeStyle = {
    ...presetBtn,
    border: `2px solid ${accent}`,
    background: `${accent}22`,
  }

  return (
    <>
      <div className="beat-maker-toolbar">
        <div className="beat-maker-transport">
          <button
            type="button"
            className="btn-pill dark"
            style={{ padding: '11px 26px', fontSize: 13, border: 'none', minWidth: 110 }}
            onClick={onTogglePlay}
          >
            {playing ? 'stop ■' : 'play ▶'}
          </button>
          <label className="beat-maker-bpm">
            <span>bpm</span>
            <input
              type="range"
              min={MIN_BPM}
              max={MAX_BPM}
              value={bpm}
              onChange={(e) => onBpmChange(Number(e.target.value))}
            />
            <input
              type="number"
              className="beat-maker-bpm-input"
              min={MIN_BPM}
              max={MAX_BPM}
              value={bpmDraft}
              onChange={(e) => setBpmDraft(e.target.value)}
              onBlur={commitBpm}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitBpm()
                  e.currentTarget.blur()
                }
              }}
              aria-label="BPM"
            />
          </label>
        </div>

        <div className="beat-maker-actions">
          <button type="button" style={outlineBtn} onClick={onClearBar}>
            clear bar ⌫
          </button>
          <button type="button" style={outlineBtn} onClick={onClearAll}>
            clear all ↻
          </button>
        </div>
      </div>

      <div className="beat-maker-pager">
        <button
          type="button"
          style={presetBtn}
          onClick={() => onViewBar(Math.max(0, viewBar - 1))}
          disabled={viewBar === 0}
          aria-label="Previous bar"
        >
          ← prev
        </button>

        <div className="beat-maker-pages-dots">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              style={i === viewBar ? activeStyle : presetBtn}
              onClick={() => onViewBar(i)}
              aria-label={`Bar ${i + 1}`}
              aria-current={i === viewBar ? 'page' : undefined}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <span className="beat-maker-page-label">
          bar {viewBar + 1} / {pages.length}
        </span>

        <button
          type="button"
          style={presetBtn}
          onClick={() => onViewBar(Math.min(pages.length - 1, viewBar + 1))}
          disabled={viewBar >= pages.length - 1}
          aria-label="Next bar"
        >
          next →
        </button>

        <div className="beat-maker-bar-ops">
          <button
            type="button"
            style={presetBtn}
            onClick={onAddBar}
            disabled={pages.length >= MAX_BARS}
          >
            + bar
          </button>
          <button
            type="button"
            style={outlineBtn}
            onClick={onRemoveBar}
            disabled={pages.length <= 1}
          >
            − bar
          </button>
        </div>
      </div>
    </>
  )
}

function useSectionSwipe(viewBar, setViewBar, pageCount) {
  const swipeRef = useRef({ x: 0, active: false })
  return {
    onTouchStart: (e) => {
      const x = e.touches?.[0]?.clientX ?? e.clientX
      swipeRef.current = { x, active: true }
    },
    onTouchEnd: (e) => {
      if (!swipeRef.current.active) return
      const x = e.changedTouches?.[0]?.clientX ?? e.clientX
      const dx = x - swipeRef.current.x
      swipeRef.current.active = false
      if (Math.abs(dx) < 50) return
      if (dx < 0) setViewBar((v) => Math.min(pageCount - 1, v + 1))
      else setViewBar((v) => Math.max(0, v - 1))
    },
  }
}

export default function BeatMaker() {
  // ── Shared transport clock; each part can mute independently ──
  const [bpm, setBpm] = useState(DEFAULT_BPM)
  const [drumsArmed, setDrumsArmed] = useState(false)
  const [melodyArmed, setMelodyArmed] = useState(false)

  // ── Drums ──────────────────────────────────────────────
  const [drumPages, setDrumPages] = useState(createDefaultPages)
  const [drumViewBar, setDrumViewBar] = useState(0)
  const [drumHead, setDrumHead] = useState(null)

  const drumPagesRef = useRef(drumPages)
  const drumViewBarRef = useRef(drumViewBar)
  const drumsArmedRef = useRef(drumsArmed)

  drumPagesRef.current = drumPages
  drumViewBarRef.current = drumViewBar
  drumsArmedRef.current = drumsArmed

  // ── Melody ─────────────────────────────────────────────
  const [melodyPages, setMelodyPages] = useState(createDefaultMelodyPages)
  const [melodyViewBar, setMelodyViewBar] = useState(0)
  const [melodyHead, setMelodyHead] = useState(null)
  const [collapsedOctaves, setCollapsedOctaves] = useState(() =>
    Object.fromEntries(MELODY_OCTAVES.map((o) => [o.id, !!o.defaultCollapsed])),
  )

  const melodyPagesRef = useRef(melodyPages)
  const melodyViewBarRef = useRef(melodyViewBar)
  const melodyArmedRef = useRef(melodyArmed)
  const bpmRef = useRef(bpm)
  const seqRef = useRef(null)

  melodyPagesRef.current = melodyPages
  melodyViewBarRef.current = melodyViewBar
  melodyArmedRef.current = melodyArmed
  bpmRef.current = bpm

  useEffect(() => {
    const seq = createSequencer({
      getPages: () => drumPagesRef.current,
      getMelodyPages: () => melodyPagesRef.current,
      getDrumsArmed: () => drumsArmedRef.current,
      getMelodyArmed: () => melodyArmedRef.current,
      getBpm: () => bpmRef.current,
      onStep: ({ drum, melody }) => {
        if (drum) {
          setDrumHead(drum)
          if (drumsArmedRef.current && drum.barIndex !== drumViewBarRef.current) {
            setDrumViewBar(drum.barIndex)
          }
        }
        if (melody) {
          setMelodyHead(melody)
          if (melodyArmedRef.current && melody.barIndex !== melodyViewBarRef.current) {
            setMelodyViewBar(melody.barIndex)
          }
        }
      },
    })
    seqRef.current = seq
    return () => seq.dispose()
  }, [])

  const stopTransport = () => {
    seqRef.current?.stop()
    setDrumsArmed(false)
    setMelodyArmed(false)
    setDrumHead(null)
    setMelodyHead(null)
  }

  const toggleSection = async (section) => {
    const seq = seqRef.current
    if (!seq) return

    const isDrums = section === 'drums'
    const armed = isDrums ? drumsArmed : melodyArmed

    // Stop only this part
    if (armed) {
      if (isDrums) {
        setDrumsArmed(false)
        drumsArmedRef.current = false
        if (!melodyArmedRef.current) stopTransport()
      } else {
        setMelodyArmed(false)
        melodyArmedRef.current = false
        if (!drumsArmedRef.current) stopTransport()
      }
      return
    }

    // Arm this part (join synced clock, or start it)
    if (isDrums) {
      setDrumsArmed(true)
      drumsArmedRef.current = true
    } else {
      setMelodyArmed(true)
      melodyArmedRef.current = true
    }

    if (!seq.isRunning()) {
      const startBar = isDrums ? drumViewBar : melodyViewBar
      const ok = await seq.start(startBar * STEPS_PER_BAR)
      if (!ok) {
        if (isDrums) {
          setDrumsArmed(false)
          drumsArmedRef.current = false
        } else {
          setMelodyArmed(false)
          melodyArmedRef.current = false
        }
      }
    }
  }

  const toggleDrumStep = (trackIndex, stepIndex) => {
    setDrumPages((prev) => {
      const next = clonePages(prev)
      const bar = next[drumViewBar]
      if (!bar) return prev
      bar[trackIndex][stepIndex] = !bar[trackIndex][stepIndex]
      return next
    })
  }

  const toggleMelodyStep = (noteIndex, stepIndex) => {
    setMelodyPages((prev) => {
      const next = cloneMelodyPages(prev)
      const bar = next[melodyViewBar]
      if (!bar) return prev
      bar[noteIndex][stepIndex] = !bar[noteIndex][stepIndex]
      return next
    })
  }

  const previewHit = async (trackIndex) => {
    const seq = seqRef.current
    if (!seq) return
    const ctx = await seq.unlock()
    if (!ctx) return
    playTrackHit(ctx, trackIndex, ctx.currentTime)
  }

  const previewMelody = async (noteIndex) => {
    const seq = seqRef.current
    if (!seq) return
    const ctx = await seq.unlock()
    if (!ctx) return
    playMelodyByIndex(ctx, noteIndex, ctx.currentTime)
  }

  const addDrumBar = () => {
    if (drumPages.length >= MAX_BARS) {
      window.alert(`Max ${MAX_BARS} bars.`)
      return
    }
    setDrumPages((prev) => [...prev, createEmptyBar()])
    setDrumViewBar(drumPages.length)
  }

  const removeDrumBar = () => {
    if (drumPages.length <= 1) return
    const last = drumPages[drumPages.length - 1]
    if (barHasContent(last)) {
      if (!window.confirm('Remove last drum bar?')) return
    }
    setDrumPages((prev) => prev.slice(0, -1))
    setDrumViewBar((v) => Math.min(v, drumPages.length - 2))
  }

  const clearDrumBar = () => {
    const bar = drumPages[drumViewBar]
    if (!bar || !barHasContent(bar)) return
    if (!window.confirm(`Clear drum bar ${drumViewBar + 1}?`)) return
    setDrumPages((prev) => {
      const next = clonePages(prev)
      next[drumViewBar] = createEmptyBar()
      return next
    })
  }

  const clearAllDrums = () => {
    if (!pagesHaveContent(drumPages)) return
    if (!window.confirm('Clear all drum bars?')) return
    setDrumPages(createDefaultPages())
    setDrumViewBar(0)
  }

  const addMelodyBar = () => {
    if (melodyPages.length >= MAX_BARS) {
      window.alert(`Max ${MAX_BARS} bars.`)
      return
    }
    setMelodyPages((prev) => [...prev, createEmptyMelodyBar()])
    setMelodyViewBar(melodyPages.length)
  }

  const removeMelodyBar = () => {
    if (melodyPages.length <= 1) return
    const last = melodyPages[melodyPages.length - 1]
    if (melodyBarHasContent(last)) {
      if (!window.confirm('Remove last melody bar?')) return
    }
    setMelodyPages((prev) => prev.slice(0, -1))
    setMelodyViewBar((v) => Math.min(v, melodyPages.length - 2))
  }

  const clearMelodyBar = () => {
    const bar = melodyPages[melodyViewBar]
    if (!bar || !melodyBarHasContent(bar)) return
    if (!window.confirm(`Clear melody bar ${melodyViewBar + 1}?`)) return
    setMelodyPages((prev) => {
      const next = cloneMelodyPages(prev)
      next[melodyViewBar] = createEmptyMelodyBar()
      return next
    })
  }

  const clearAllMelody = () => {
    if (!melodyPagesHaveContent(melodyPages)) return
    if (!window.confirm('Clear all melody bars?')) return
    setMelodyPages(createDefaultMelodyPages())
    setMelodyViewBar(0)
  }

  const toggleOctave = (id) => {
    setCollapsedOctaves((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const drumSwipe = useSectionSwipe(drumViewBar, setDrumViewBar, drumPages.length)
  const melodySwipe = useSectionSwipe(melodyViewBar, setMelodyViewBar, melodyPages.length)

  const currentDrum = drumPages[drumViewBar] ?? drumPages[0]
  const currentMelody = melodyPages[melodyViewBar] ?? melodyPages[0]
  const drumHeadHere =
    drumHead && drumsArmed && drumHead.barIndex === drumViewBar
  const melodyHeadHere =
    melodyHead && melodyArmed && melodyHead.barIndex === melodyViewBar

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />

      <div className="container beat-maker-page">
        <div className="playground-header">
          <div className="playground-eyebrow">// BEAT MAKER</div>
          <h1 className="playground-title">Tap out a loop.</h1>
          <p className="playground-lede">
            Shared clock keeps drums and melody locked. Stop either side on its own — the other keeps going.
          </p>
        </div>

        <section className="beat-maker-section">
          <div className="beat-maker-section-label">// DRUMS</div>
          <SectionTransport
            playing={drumsArmed}
            onTogglePlay={() => toggleSection('drums')}
            bpm={bpm}
            onBpmChange={setBpm}
            pages={drumPages}
            viewBar={drumViewBar}
            onViewBar={setDrumViewBar}
            onAddBar={addDrumBar}
            onRemoveBar={removeDrumBar}
            onClearBar={clearDrumBar}
            onClearAll={clearAllDrums}
            accent="#ff6b9d"
          />
          <div className="beat-maker-stage" {...drumSwipe}>
            <BeatMarks />
            {TRACKS.map((track, trackIndex) => (
              <div key={track.id} className="beat-maker-row">
                <button
                  type="button"
                  className="beat-maker-track-label"
                  style={{ color: track.color }}
                  onClick={() => previewHit(trackIndex)}
                  title={`Preview ${track.label}`}
                >
                  {track.label}
                </button>
                <div className="beat-maker-pads">
                  {currentDrum[trackIndex].map((on, stepIndex) => {
                    const isBeat = stepIndex % 4 === 0
                    const isCurrent =
                      drumHeadHere && drumHead.stepIndex === stepIndex
                    return (
                      <button
                        key={stepIndex}
                        type="button"
                        className={[
                          'beat-maker-pad',
                          on ? 'on' : '',
                          isBeat ? 'beat' : '',
                          isCurrent ? 'current' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={
                          on
                            ? { background: track.color, borderColor: track.color }
                            : undefined
                        }
                        aria-pressed={on}
                        aria-label={`${track.label} step ${stepIndex + 1}`}
                        onClick={() => toggleDrumStep(trackIndex, stepIndex)}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
            <div className="playground-stage-caption">
              8 drum tracks · stop independently · stays in sync when both play
            </div>
          </div>
        </section>

        <section className="beat-maker-section">
          <div className="beat-maker-section-label">// MELODY</div>
          <SectionTransport
            playing={melodyArmed}
            onTogglePlay={() => toggleSection('melody')}
            bpm={bpm}
            onBpmChange={setBpm}
            pages={melodyPages}
            viewBar={melodyViewBar}
            onViewBar={setMelodyViewBar}
            onAddBar={addMelodyBar}
            onRemoveBar={removeMelodyBar}
            onClearBar={clearMelodyBar}
            onClearAll={clearAllMelody}
            accent={MELODY_COLOR}
          />
          <div className="beat-maker-stage beat-maker-melody-stage" {...melodySwipe}>
            <BeatMarks />

            <div className="beat-maker-melody-roll">
              {MELODY_OCTAVES.map((oct) => {
                const collapsed = collapsedOctaves[oct.id]
                const linesByStep = octaveStepLines(currentMelody, oct.noteIndices)

                return (
                  <div key={oct.id} className="beat-maker-octave">
                    <button
                      type="button"
                      className="beat-maker-octave-toggle"
                      aria-expanded={!collapsed}
                      onClick={() => toggleOctave(oct.id)}
                    >
                      <span className="beat-maker-octave-chevron">
                        {collapsed ? '▸' : '▾'}
                      </span>
                      <span>{oct.label}</span>
                      <span className="beat-maker-octave-range">{oct.range}</span>
                    </button>

                    {collapsed ? (
                      <div className="beat-maker-row beat-maker-octave-summary">
                        <span className="beat-maker-track-label beat-maker-note-label">
                          —
                        </span>
                        <div className="beat-maker-pads">
                          {linesByStep.map((lines, stepIndex) => {
                            const isBeat = stepIndex % 4 === 0
                            const isCurrent =
                              melodyHeadHere && melodyHead.stepIndex === stepIndex
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
                                aria-hidden="true"
                              >
                                {lines.map((h, i) => (
                                  <span
                                    key={i}
                                    className="beat-maker-summary-line"
                                    style={{
                                      top: `${8 + (1 - h) * 70}%`,
                                      background: MELODY_COLOR,
                                    }}
                                  />
                                ))}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      oct.noteIndices.map((noteIndex) => {
                        const note = MELODY_NOTES[noteIndex]
                        return (
                          <div
                            key={note.id}
                            className={`beat-maker-row beat-maker-melody-row${note.sharp ? ' sharp' : ''}`}
                          >
                            <button
                              type="button"
                              className="beat-maker-track-label beat-maker-note-label"
                              onClick={() => previewMelody(noteIndex)}
                              title={`Preview ${note.label}`}
                            >
                              {note.label}
                            </button>
                            <div className="beat-maker-pads">
                              {currentMelody[noteIndex].map((on, stepIndex) => {
                                const isBeat = stepIndex % 4 === 0
                                const isCurrent =
                                  melodyHeadHere &&
                                  melodyHead.stepIndex === stepIndex
                                return (
                                  <button
                                    key={stepIndex}
                                    type="button"
                                    className={[
                                      'beat-maker-pad',
                                      'beat-maker-melody-pad',
                                      on ? 'on' : '',
                                      isBeat ? 'beat' : '',
                                      isCurrent ? 'current' : '',
                                    ]
                                      .filter(Boolean)
                                      .join(' ')}
                                    style={
                                      on
                                        ? {
                                            background: MELODY_COLOR,
                                            borderColor: MELODY_COLOR,
                                          }
                                        : undefined
                                    }
                                    aria-pressed={on}
                                    aria-label={`${note.label} step ${stepIndex + 1}`}
                                    onClick={() =>
                                      toggleMelodyStep(noteIndex, stepIndex)
                                    }
                                  />
                                )
                              })}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )
              })}
            </div>

            <div className="playground-stage-caption">
              C2–B5 · stop independently · rejoins in sync
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
