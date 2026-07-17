import { useEffect, useState } from 'react'

// Shared timed-study timer UI. It's presentational/controlled: the parent owns
// the countdown and decides what Start / Skip do — this just renders the clock,
// an editable custom-time field, the presets and the two buttons.

export const TIMER_PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '2m', seconds: 120 },
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
]

const MIN_SECONDS = 5
const MAX_SECONDS = 3600

export function clockText(totalSeconds) {
  const safe = Math.max(0, Math.ceil(totalSeconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Accepts "1:30" (m:ss) or a plain seconds count ("90"). Clamped to a sane range.
export function parseDuration(str) {
  const t = (str || '').trim()
  if (!t) return null
  let secs
  if (t.includes(':')) {
    const [m, s] = t.split(':')
    secs = (parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0)
  } else {
    const n = parseInt(t, 10)
    if (!Number.isFinite(n)) return null
    secs = n
  }
  if (!Number.isFinite(secs)) return null
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, secs))
}

function hexA(hex, a) {
  const n = hex.replace('#', '')
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

export default function StudyTimer({
  remaining,
  seconds,
  running,
  presets = TIMER_PRESETS,
  accent = '#141414',
  onChoose,
  onToggle,
  onSkip,
  skipLabel = 'Skip',
  skipDisabled = false,
}) {
  const [draft, setDraft] = useState(() => clockText(seconds))

  // Keep the custom field in sync when a preset (or the parent) changes seconds.
  useEffect(() => {
    setDraft(clockText(seconds))
  }, [seconds])

  const commit = () => {
    const parsed = parseDuration(draft)
    if (parsed == null) {
      setDraft(clockText(seconds))
      return
    }
    setDraft(clockText(parsed))
    if (parsed !== seconds) onChoose(parsed)
  }

  const chipBase = {
    background: '#faf8f3',
    color: '#141414',
    border: '1px solid #e8e3d8',
    borderRadius: 40,
    padding: '9px 16px',
    fontFamily: "'Space Mono', monospace",
    fontSize: 12,
    cursor: 'pointer',
  }
  const chipActive = {
    ...chipBase,
    border: `2px solid ${accent}`,
    background: hexA(accent, 0.12),
  }
  const outline = {
    background: 'transparent',
    color: '#8a8a8a',
    border: '2px solid #e0dbd0',
    borderRadius: 40,
    padding: '10px 20px',
    fontFamily: "'Space Mono', monospace",
    fontSize: 13,
    cursor: 'pointer',
  }
  const isCustom = !presets.some((p) => p.seconds === seconds)

  return (
    <div className="study-timer">
      <div className="study-timer-clock" style={{ color: accent }}>
        {clockText(remaining)}
      </div>

      <div className="study-timer-row">
        <input
          className="study-timer-input"
          style={isCustom ? { borderColor: accent } : undefined}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
              e.currentTarget.blur()
            }
          }}
          inputMode="numeric"
          aria-label="Custom time — seconds or m:ss"
          title="Custom time — type seconds (90) or m:ss (1:30)"
        />
        {presets.map((p) => (
          <button
            key={p.seconds}
            type="button"
            style={seconds === p.seconds ? chipActive : chipBase}
            onClick={() => onChoose(p.seconds)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="study-timer-row">
        <button type="button" style={outline} onClick={onToggle}>
          {running ? 'Pause' : 'Start'}
        </button>
        <button type="button" style={outline} onClick={onSkip} disabled={skipDisabled}>
          {skipLabel}
        </button>
      </div>
    </div>
  )
}
