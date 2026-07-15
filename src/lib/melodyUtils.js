const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const MELODY_MIDI_TOP = 83 // B5
const MELODY_NOTE_COUNT = 48 // C2–B5 (4 octaves)

/** C2 (midi 36) through B5 (midi 83), high → low for piano-roll display */
export const MELODY_NOTES = Array.from({ length: MELODY_NOTE_COUNT }, (_, i) => {
  const midi = MELODY_MIDI_TOP - i
  const name = NOTE_NAMES[midi % 12]
  const octave = Math.floor(midi / 12) - 1
  return {
    id: `${name.replace('#', 's')}${octave}`,
    label: `${name}${octave}`,
    midi,
    sharp: name.includes('#'),
    freq: 440 * 2 ** ((midi - 69) / 12),
  }
})

export const MELODY_COLOR = '#7c6cf0'

/** Octave groups for collapse UI (high → low, matching MELODY_NOTES order). */
export const MELODY_OCTAVES = [5, 4, 3, 2].map((oct, groupIndex) => ({
  id: `oct${oct}`,
  label: `Octave ${oct}`,
  range: `C${oct}–B${oct}`,
  noteIndices: Array.from({ length: 12 }, (_, i) => groupIndex * 12 + i),
  /** Outer octaves start collapsed so the roll stays manageable */
  defaultCollapsed: oct === 5 || oct === 2,
}))

/** Per-step presence + relative pitch height (0=low … 1=high) within an octave. */
export function octaveStepLines(melodyBar, noteIndices) {
  return Array.from({ length: 16 }, (_, step) => {
    const lines = []
    noteIndices.forEach((noteIndex, local) => {
      if (melodyBar[noteIndex]?.[step]) {
        // noteIndices are high→low; invert so high pitches sit near top
        const height = 1 - local / Math.max(1, noteIndices.length - 1)
        lines.push(height)
      }
    })
    return lines
  })
}

export function createEmptyMelodyBar() {
  return MELODY_NOTES.map(() => Array(16).fill(false))
}

export function createDefaultMelodyPages() {
  return [createEmptyMelodyBar()]
}

export function melodyBarHasContent(bar) {
  return bar.some((row) => row.some(Boolean))
}

export function melodyPagesHaveContent(pages) {
  return pages.some(melodyBarHasContent)
}

export function cloneMelodyBar(bar) {
  return bar.map((row) => row.slice())
}

export function cloneMelodyPages(pages) {
  return pages.map(cloneMelodyBar)
}

export function playMelodyNote(ctx, freq, time) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(freq, time)
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(3200, time)
  filter.frequency.exponentialRampToValueAtTime(900, time + 0.35)
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(0.22, time + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.45)
  osc.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  osc.start(time)
  osc.stop(time + 0.5)

  const partial = ctx.createOscillator()
  const pGain = ctx.createGain()
  partial.type = 'sine'
  partial.frequency.setValueAtTime(freq * 2, time)
  pGain.gain.setValueAtTime(0.0001, time)
  pGain.gain.exponentialRampToValueAtTime(0.06, time + 0.008)
  pGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2)
  partial.connect(pGain)
  pGain.connect(ctx.destination)
  partial.start(time)
  partial.stop(time + 0.22)
}

export function playMelodyByIndex(ctx, noteIndex, time) {
  const note = MELODY_NOTES[noteIndex]
  if (!note) return
  playMelodyNote(ctx, note.freq, time)
}
