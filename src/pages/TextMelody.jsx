import { useMemo, useState } from 'react'
import Nav from '../components/Nav'
import SaveToGallery from '../components/SaveToGallery'
import TextMelodyPlayer from '../components/TextMelodyPlayer'
import {
  SCALES,
  SCALE_IDS,
  MIN_BPM,
  MAX_BPM,
  DEFAULT_BPM,
  MAX_TEXT_LENGTH,
  textToNotes,
  textMelodyToBlob,
} from '../lib/textMusicUtils'

const SAMPLE = 'the quick brown fox jumps over the lazy dog'

export default function TextMelody() {
  const [text, setText] = useState(SAMPLE)
  const [scaleId, setScaleId] = useState('ionian')
  const [bpm, setBpm] = useState(DEFAULT_BPM)

  const notes = useMemo(() => textToNotes(text, scaleId), [text, scaleId])
  const playable = notes.some((n) => !n.rest)

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />
      <div className="container text-melody-page">
        <div className="playground-header">
          <div className="playground-eyebrow">// TEXT MELODY</div>
          <h1 className="playground-title">Hear what a sentence sounds like.</h1>
          <p className="playground-lede">
            Every letter is a step up the scale — a is the 1st note, b the 2nd, and it wraps around
            after g. Spaces and punctuation are rests. Pick a mode, set the tempo, type something.
          </p>
        </div>

        <div className="text-melody-controls">
          <label className="text-melody-field">
            <span>scale</span>
            <select value={scaleId} onChange={(e) => setScaleId(e.target.value)} className="text-melody-select">
              {SCALE_IDS.map((id) => (
                <option key={id} value={id}>
                  {SCALES[id].label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-melody-field text-melody-field--bpm">
            <span>bpm</span>
            <input
              type="range"
              min={MIN_BPM}
              max={MAX_BPM}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
            />
            <span className="text-melody-bpm-val">{bpm}</span>
          </label>
        </div>

        <textarea
          className="text-melody-input"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
          placeholder="type or paste some text…"
          rows={4}
          spellCheck={false}
        />
        <div className="text-melody-count">
          {text.length} / {MAX_TEXT_LENGTH}
        </div>

        <TextMelodyPlayer text={text} scaleId={scaleId} bpm={bpm} />

        <div className="text-melody-save">
          <SaveToGallery
            kind="text"
            hasContent={() => playable}
            getData={() => ({ text, scaleId, bpm })}
            getThumbnailBlob={() => textMelodyToBlob(notes)}
          />
        </div>
      </div>
    </div>
  )
}
