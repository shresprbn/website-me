import { playMelodyByIndex } from './melodyUtils'

export const STEPS_PER_BAR = 16
export const MAX_BARS = 5
export const MIN_BPM = 60
export const MAX_BPM = 180
export const DEFAULT_BPM = 120

export const TRACKS = [
  { id: 'kick', label: 'Kick', color: '#ff6b9d' },
  { id: 'snare', label: 'Snare', color: '#4ecdc4' },
  { id: 'hat', label: 'Hi-hat', color: '#ffd23f' },
  { id: 'ohat', label: 'Open', color: '#c4a0ff' },
  { id: 'clap', label: 'Clap', color: '#ffb800' },
  { id: 'tom', label: 'Tom', color: '#5b8def' },
  { id: 'rim', label: 'Rim', color: '#e07a5f' },
  { id: 'cowbell', label: 'Cowbell', color: '#2a9d8f' },
]

export function createEmptyTrack() {
  return Array(STEPS_PER_BAR).fill(false)
}

export function createEmptyBar() {
  return TRACKS.map(() => createEmptyTrack())
}

export function createDefaultPages() {
  return [createEmptyBar()]
}

export function barHasContent(bar) {
  return bar.some((track) => track.some(Boolean))
}

export function pagesHaveContent(pages) {
  return pages.some(barHasContent)
}

export function cloneBar(bar) {
  return bar.map((track) => track.slice())
}

export function clonePages(pages) {
  return pages.map(cloneBar)
}

/** Global step index → { barIndex, stepIndex } */
export function stepToBarStep(globalStep, barCount) {
  const total = barCount * STEPS_PER_BAR
  const wrapped = ((globalStep % total) + total) % total
  return {
    barIndex: Math.floor(wrapped / STEPS_PER_BAR),
    stepIndex: wrapped % STEPS_PER_BAR,
  }
}

export function secondsPerStep(bpm) {
  // 16th notes: 4 per beat
  return 60 / bpm / 4
}

function noiseBuffer(ctx, duration) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

export function playKick(ctx, time, volume = 1) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const output = ctx.createGain()
  output.gain.value = volume
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, time)
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.12)
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(0.85, time + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.28)
  osc.connect(gain)
  gain.connect(output)
  output.connect(ctx.destination)
  osc.start(time)
  osc.stop(time + 0.3)
}

export function playSnare(ctx, time, volume = 1) {
  const output = ctx.createGain()
  output.gain.value = volume
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer(ctx, 0.2)
  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'highpass'
  noiseFilter.frequency.value = 1000
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.0001, time)
  noiseGain.gain.exponentialRampToValueAtTime(0.45, time + 0.005)
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15)
  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(output)
  noise.start(time)
  noise.stop(time + 0.2)

  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(200, time)
  oscGain.gain.setValueAtTime(0.0001, time)
  oscGain.gain.exponentialRampToValueAtTime(0.35, time + 0.004)
  oscGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1)
  osc.connect(oscGain)
  oscGain.connect(output)
  osc.start(time)
  osc.stop(time + 0.12)

  output.connect(ctx.destination)
}

export function playHat(ctx, time, volume = 1) {
  const output = ctx.createGain()
  output.gain.value = volume
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer(ctx, 0.08)
  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 7000
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(0.28, time + 0.002)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06)
  noise.connect(filter)
  filter.connect(gain)
  gain.connect(output)
  output.connect(ctx.destination)
  noise.start(time)
  noise.stop(time + 0.08)
}

export function playClap(ctx, time, volume = 1) {
  const output = ctx.createGain()
  output.gain.value = volume
  const bursts = [0, 0.012, 0.024]
  bursts.forEach((offset, i) => {
    const t = time + offset
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer(ctx, 0.08)
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1200
    filter.Q.value = 0.8
    const gain = ctx.createGain()
    const peak = i === bursts.length - 1 ? 0.4 : 0.22
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(output)
    noise.start(t)
    noise.stop(t + 0.06)
  })
  output.connect(ctx.destination)
}

export function playOpenHat(ctx, time, volume = 1) {
  const output = ctx.createGain()
  output.gain.value = volume
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer(ctx, 0.35)
  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 5500
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(0.32, time + 0.003)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.32)
  noise.connect(filter)
  filter.connect(gain)
  gain.connect(output)
  output.connect(ctx.destination)
  noise.start(time)
  noise.stop(time + 0.35)
}

export function playTom(ctx, time, volume = 1) {
  const output = ctx.createGain()
  output.gain.value = volume
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(220, time)
  osc.frequency.exponentialRampToValueAtTime(90, time + 0.18)
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(0.7, time + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.28)
  osc.connect(gain)
  gain.connect(output)
  output.connect(ctx.destination)
  osc.start(time)
  osc.stop(time + 0.3)
}

export function playRim(ctx, time, volume = 1) {
  const output = ctx.createGain()
  output.gain.value = volume
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(800, time)
  osc.frequency.exponentialRampToValueAtTime(400, time + 0.04)
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(0.28, time + 0.002)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05)
  osc.connect(gain)
  gain.connect(output)
  osc.start(time)
  osc.stop(time + 0.06)

  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer(ctx, 0.04)
  const nGain = ctx.createGain()
  nGain.gain.setValueAtTime(0.0001, time)
  nGain.gain.exponentialRampToValueAtTime(0.15, time + 0.001)
  nGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03)
  noise.connect(nGain)
  nGain.connect(output)
  noise.start(time)
  noise.stop(time + 0.04)

  output.connect(ctx.destination)
}

export function playCowbell(ctx, time, volume = 1) {
  const output = ctx.createGain()
  output.gain.value = volume
  const makePartial = (freq, peak) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.exponentialRampToValueAtTime(peak, time + 0.003)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22)
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = freq
    filter.Q.value = 8
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(output)
    osc.start(time)
    osc.stop(time + 0.25)
  }
  makePartial(560, 0.22)
  makePartial(845, 0.18)
  output.connect(ctx.destination)
}

const HIT_PLAYERS = [
  playKick,
  playSnare,
  playHat,
  playOpenHat,
  playClap,
  playTom,
  playRim,
  playCowbell,
]

export function playTrackHit(ctx, trackIndex, time, volume = 1) {
  const play = HIT_PLAYERS[trackIndex]
  if (play) play(ctx, time, volume)
}

/**
 * Lookahead sequencer. Provide getPages and/or getMelodyPages.
 * Optional getDrumsArmed / getMelodyArmed mute a part without stopping the clock.
 * onStep({ drum, melody, globalStep }) fires each step while running.
 */
export function createSequencer({
  getPages,
  getMelodyPages,
  getDrumsArmed,
  getMelodyArmed,
  getBpm,
  getDrumsVolume,
  getMelodyVolume,
  onStep,
}) {
  let ctx = null
  let timerId = null
  let nextNoteTime = 0
  let globalStep = 0
  let running = false

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

  function scheduleStep(step, time) {
    const drumPages = getPages?.()
    const melodyPages = getMelodyPages?.()
    if (!drumPages?.length && !melodyPages?.length) return

    const drumsOn = getDrumsArmed ? getDrumsArmed() : true
    const melodyOn = getMelodyArmed ? getMelodyArmed() : true

    let drumPos = null
    let melodyPos = null

    const drumVolume = getDrumsVolume?.() ?? 1
    const melodyVolume = getMelodyVolume?.() ?? 1

    if (drumPages?.length) {
      drumPos = stepToBarStep(step, drumPages.length)
      if (drumsOn) {
        const bar = drumPages[drumPos.barIndex]
        bar.forEach((track, trackIndex) => {
          if (track[drumPos.stepIndex]) playTrackHit(ctx, trackIndex, time, drumVolume)
        })
      }
    }

    if (melodyPages?.length) {
      melodyPos = stepToBarStep(step, melodyPages.length)
      if (melodyOn) {
        const melodyBar = melodyPages[melodyPos.barIndex]
        melodyBar.forEach((row, noteIndex) => {
          if (row[melodyPos.stepIndex]) playMelodyByIndex(ctx, noteIndex, time, melodyVolume)
        })
      }
    }

    if (onStep) {
      const delayMs = Math.max(0, (time - ctx.currentTime) * 1000)
      window.setTimeout(() => {
        if (!running) return
        onStep({
          globalStep: step,
          drum: drumPos,
          melody: melodyPos,
          barIndex: drumPos?.barIndex ?? melodyPos?.barIndex ?? 0,
          stepIndex: drumPos?.stepIndex ?? melodyPos?.stepIndex ?? 0,
        })
      }, delayMs)
    }
  }

  function advanceNote() {
    const bpm = getBpm()
    nextNoteTime += secondsPerStep(bpm)
    globalStep += 1
  }

  function tick() {
    if (!running || !ctx) return
    while (nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
      scheduleStep(globalStep, nextNoteTime)
      advanceNote()
    }
    timerId = window.setTimeout(tick, LOOKAHEAD_MS)
  }

  return {
    isRunning: () => running,
    getGlobalStep: () => globalStep,
    getContext: () => ctx,
    async unlock() {
      const audio = ensureContext()
      if (!audio) return null
      if (audio.state === 'suspended') await audio.resume()
      return audio
    },
    async start(fromGlobalStep = 0) {
      const audio = await this.unlock()
      if (!audio) return false
      globalStep = fromGlobalStep
      nextNoteTime = audio.currentTime + 0.05
      running = true
      tick()
      return true
    },
    stop() {
      running = false
      if (timerId != null) {
        window.clearTimeout(timerId)
        timerId = null
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
