import { playMelodyNote } from './melodyUtils'

// Diatonic modes, as semitone offsets from the tonic.
export const SCALES = {
  ionian: { label: 'Ionian (major)', intervals: [0, 2, 4, 5, 7, 9, 11] },
  dorian: { label: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  phrygian: { label: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10] },
  lydian: { label: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11] },
  mixolydian: { label: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
  aeolian: { label: 'Aeolian (minor)', intervals: [0, 2, 3, 5, 7, 8, 10] },
  locrian: { label: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10] },
}

export const SCALE_IDS = Object.keys(SCALES)

export const MIN_BPM = 40
export const MAX_BPM = 240
export const DEFAULT_BPM = 120
export const MAX_TEXT_LENGTH = 600

const ROOT_MIDI = 48 // C3
const MAX_OCTAVE = 2 // a–g, h–n, o–z all fit within 3 octaves

// One colour per scale degree, reused from the site palette.
export const DEGREE_COLORS = [
  '#ff6b9d',
  '#e07a5f',
  '#ffd23f',
  '#57b894',
  '#4ecdc4',
  '#5b8def',
  '#7c6cf0',
]

function midiToFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12)
}

/**
 * Map each character to a note. Letters walk the scale: a → 1st degree,
 * b → 2nd … g → 7th, then h wraps back to the 1st degree an octave up, and
 * so on (capped at MAX_OCTAVE). Anything that isn't a–z becomes a rest, so
 * spaces and punctuation turn into pauses.
 */
export function textToNotes(text, scaleId = 'ionian') {
  const intervals = (SCALES[scaleId] || SCALES.ionian).intervals
  return [...(text || '')].map((ch) => {
    const code = ch.toLowerCase().charCodeAt(0)
    const isLetter = code >= 97 && code <= 122
    if (!isLetter) return { char: ch, rest: true }

    const index = code - 97
    const degree = index % 7
    const octave = Math.min(MAX_OCTAVE, Math.floor(index / 7))
    const semitone = intervals[degree] + 12 * octave
    return {
      char: ch,
      rest: false,
      degree,
      octave,
      semitone,
      freq: midiToFreq(ROOT_MIDI + semitone),
    }
  })
}

// Each character is one eighth note.
export function stepSeconds(bpm) {
  return 30 / Math.max(1, bpm)
}

// A small piano-roll snapshot for the gallery thumbnail.
export function textMelodyToBlob(notes) {
  const W = 360
  const H = 140
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)

  ctx.fillStyle = '#f7f5f0'
  ctx.fillRect(0, 0, W, H)

  const cw = Math.max(1.5, Math.min(9, W / (notes.length || 1)))
  const barH = 8
  notes.forEach((note, i) => {
    if (note.rest) return
    const x = i * cw
    if (x > W) return
    const y = H - barH - 6 - (note.semitone / 36) * (H - barH - 16)
    ctx.fillStyle = DEGREE_COLORS[note.degree]
    ctx.fillRect(x, y, Math.max(1.5, cw - 1), barH)
  })

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

/**
 * Lookahead scheduler that walks a 1-D note list once and stops. Mirrors the
 * shape of beatUtils' createSequencer but without the bar/track grid.
 */
export function createTextSequencer({ getNotes, getBpm, getVolume, onStep, onDone }) {
  let ctx = null
  let timer = null
  let running = false
  let nextTime = 0
  let step = 0

  const LOOKAHEAD_MS = 25
  const SCHEDULE_AHEAD = 0.12

  function ensureContext() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    return ctx
  }

  function scheduleStep(i, time) {
    const note = getNotes()[i]
    if (!note) return
    if (!note.rest && note.freq) {
      playMelodyNote(ctx, note.freq, time, getVolume ? getVolume() : 0.85)
    }
    if (onStep) {
      const delayMs = Math.max(0, (time - ctx.currentTime) * 1000)
      window.setTimeout(() => {
        if (running) onStep(i)
      }, delayMs)
    }
  }

  function tick() {
    if (!running || !ctx) return
    const total = getNotes().length
    while (nextTime < ctx.currentTime + SCHEDULE_AHEAD) {
      if (step >= total) {
        const delayMs = Math.max(0, (nextTime - ctx.currentTime) * 1000)
        window.setTimeout(() => {
          if (running) {
            running = false
            onDone && onDone()
          }
        }, delayMs)
        return
      }
      scheduleStep(step, nextTime)
      nextTime += stepSeconds(getBpm())
      step += 1
    }
    timer = window.setTimeout(tick, LOOKAHEAD_MS)
  }

  return {
    isRunning: () => running,
    async start() {
      const audio = ensureContext()
      if (!audio) return false
      if (audio.state === 'suspended') await audio.resume()
      step = 0
      nextTime = audio.currentTime + 0.06
      running = true
      tick()
      return true
    },
    stop() {
      running = false
      if (timer != null) {
        window.clearTimeout(timer)
        timer = null
      }
    },
    dispose() {
      this.stop()
      if (ctx) {
        ctx.close()
        ctx = null
      }
    },
  }
}
