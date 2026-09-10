import { useEffect, useMemo, useRef, useState } from 'react'
import { DEGREE_COLORS, textToNotes, createTextSequencer } from '../lib/textMusicUtils'

const CELL_W = 24
const ROLL_H = 150
const BAR_H = 16
const SPAN = 36 // semitone range the roll is scaled to (3 octaves)

// Read-only play/stop + piano-roll. Shared by the maker page and the gallery
// detail view. `bpm` can change live while playing.
export default function TextMelodyPlayer({ text, scaleId, bpm }) {
  const [playing, setPlaying] = useState(false)
  const [head, setHead] = useState(-1)

  const notes = useMemo(() => textToNotes(text, scaleId), [text, scaleId])
  const playable = notes.some((n) => !n.rest)

  const seqRef = useRef(null)
  const rollRef = useRef(null)
  const notesRef = useRef(notes)
  const bpmRef = useRef(bpm)
  notesRef.current = notes
  bpmRef.current = bpm

  useEffect(() => {
    const seq = createTextSequencer({
      getNotes: () => notesRef.current,
      getBpm: () => bpmRef.current,
      getVolume: () => 0.8,
      onStep: (i) => setHead(i),
      onDone: () => {
        setPlaying(false)
        setHead(-1)
      },
    })
    seqRef.current = seq
    return () => seq.dispose()
  }, [])

  // A different sentence or scale means a different melody — stop.
  useEffect(() => {
    if (playing) {
      seqRef.current?.stop()
      setPlaying(false)
      setHead(-1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, scaleId])

  useEffect(() => {
    if (head < 0 || !rollRef.current) return
    const el = rollRef.current
    const x = head * CELL_W
    if (x < el.scrollLeft + 40 || x > el.scrollLeft + el.clientWidth - 60) {
      el.scrollTo({ left: Math.max(0, x - el.clientWidth / 2), behavior: 'smooth' })
    }
  }, [head])

  const toggle = async () => {
    const seq = seqRef.current
    if (!seq) return
    if (playing) {
      seq.stop()
      setPlaying(false)
      setHead(-1)
      return
    }
    if (!playable) return
    rollRef.current?.scrollTo({ left: 0 })
    const ok = await seq.start()
    if (ok) setPlaying(true)
  }

  return (
    <div className="text-melody-player">
      <button
        type="button"
        className="btn-pill dark text-melody-play"
        style={{ padding: '11px 26px', fontSize: 13, border: 'none', minWidth: 110 }}
        onClick={toggle}
        disabled={!playable}
      >
        {playing ? 'stop ■' : 'play ▶'}
      </button>

      <div className="text-melody-roll" ref={rollRef}>
        <div className="text-melody-roll-inner" style={{ width: notes.length * CELL_W || CELL_W }}>
          {notes.map((n, i) => {
            if (n.rest) {
              return (
                <span
                  key={i}
                  className={`text-melody-rest${i === head ? ' current' : ''}`}
                  style={{ left: i * CELL_W }}
                />
              )
            }
            const bottom = (n.semitone / SPAN) * (ROLL_H - BAR_H)
            return (
              <span
                key={i}
                className={`text-melody-bar${i === head ? ' current' : ''}`}
                style={{ left: i * CELL_W, bottom, background: DEGREE_COLORS[n.degree] }}
                title={`${n.char} → degree ${n.degree + 1}${n.octave ? `, +${n.octave} oct` : ''}`}
              >
                {n.char}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
