import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import Nav from '../components/Nav'
import {
  ROOMS_ENABLED,
  fetchRoom,
  subscribeToRoom,
  dispatchRoomAction,
  computeSecondsLeft,
  getDisplayName,
  setDisplayName,
  getClientId,
  colorForName,
  initialsForName,
  joinPresence,
} from '../lib/pomodoroRoom'

const RING_RADIUS = 90
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

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

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function bubbleSize(value, values) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return 92
  const t = (value - min) / (max - min)
  return Math.round(62 + t * (140 - 62))
}

export default function PomodoroTimer() {
  const { roomId } = useParams()

  const [room, setRoom] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [members, setMembers] = useState([])
  const [displayName, setDisplayNameState] = useState(() => getDisplayName())
  const [nameDraft, setNameDraft] = useState('')
  const [newWorkInput, setNewWorkInput] = useState('')
  const [newBreakInput, setNewBreakInput] = useState('')
  const [soundOn, setSoundOn] = useState(true)
  const [copyStatus, setCopyStatus] = useState('idle')

  const roomRef = useRef(null)
  const completingRef = useRef(null)
  const prevPhaseRef = useRef(null)
  const soundOnRef = useRef(true)
  const audioCtxRef = useRef(null)
  const clientIdRef = useRef(getClientId())
  const originalTitleRef = useRef(typeof document !== 'undefined' ? document.title : '')

  roomRef.current = room
  soundOnRef.current = soundOn

  // Initial load + live updates from every client in the room.
  useEffect(() => {
    if (!ROOMS_ENABLED || !roomId) return
    let cancelled = false
    fetchRoom(roomId)
      .then((row) => {
        if (!cancelled) setRoom(row)
      })
      .catch(() => {
        if (!cancelled) setLoadError("Couldn't find that room.")
      })
    const unsubscribe = subscribeToRoom(roomId, (row) => setRoom(row))
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [roomId])

  // Presence — who else is here right now.
  useEffect(() => {
    if (!ROOMS_ENABLED || !roomId || !displayName) return
    const member = {
      clientId: clientIdRef.current,
      name: displayName,
      color: colorForName(displayName),
    }
    const leave = joinPresence(roomId, member, setMembers)
    return leave
  }, [roomId, displayName])

  // A steady 1s display clock, plus an immediate recompute whenever the
  // room row itself changes (start/pause/skip/realtime update).
  useEffect(() => {
    setSecondsLeft(computeSecondsLeft(room))
  }, [room])

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft(computeSecondsLeft(roomRef.current)), 1000)
    return () => clearInterval(id)
  }, [])

  // Every client independently notices when the countdown hits zero and
  // claims the phase change — see the Worker's idempotent 'complete' action.
  useEffect(() => {
    if (!room?.running || secondsLeft > 0) return
    if (completingRef.current === room.phase_ends_at) return
    completingRef.current = room.phase_ends_at
    dispatchRoomAction(roomId, 'complete', room.phase_ends_at)
      .then((updated) => setRoom(updated))
      .catch(() => {})
  }, [secondsLeft, room, roomId])

  // Chime + notification fire for everyone in the room when the phase
  // actually flips, not just whoever happened to trigger it.
  useEffect(() => {
    if (!room) return
    if (prevPhaseRef.current && prevPhaseRef.current !== room.phase) {
      playChime()
      notifyPhaseEnd(room.phase)
    }
    prevPhaseRef.current = room.phase
  }, [room?.phase])

  useEffect(() => {
    if (room?.running) {
      document.title = `${formatTime(secondsLeft)} · ${room.phase === 'work' ? 'Work' : 'Break'}`
    } else {
      document.title = originalTitleRef.current
    }
  }, [room?.running, room?.phase, secondsLeft])

  useEffect(() => () => { document.title = originalTitleRef.current }, [])

  const ensureAudioCtx = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return null
      audioCtxRef.current = new Ctx()
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
    return audioCtxRef.current
  }

  const playChime = () => {
    if (!soundOnRef.current) return
    const ctx = audioCtxRef.current
    if (!ctx) return
    try {
      const now = ctx.currentTime
      ;[0, 0.18, 0.36].forEach((offset, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = i === 2 ? 880 : 660
        gain.gain.setValueAtTime(0.0001, now + offset)
        gain.gain.exponentialRampToValueAtTime(0.2, now + offset + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + offset)
        osc.stop(now + offset + 0.18)
      })
    } catch {
      // audio is a nicety, never let it break the timer
    }
  }

  const notifyPhaseEnd = (nextPhase) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    try {
      new Notification(nextPhase === 'break' ? 'Break time 🌤' : 'Back to work 🎯', {
        body: nextPhase === 'break' ? 'Nice work — step away for a bit.' : "Break's over — let's go.",
      })
    } catch {
      // ignore
    }
  }

  const runAction = async (action, value) => {
    setActionError('')
    try {
      const updated = await dispatchRoomAction(roomId, action, value)
      setRoom(updated)
    } catch (err) {
      setActionError(err.message || 'Something went wrong.')
    }
  }

  const handleStart = () => {
    ensureAudioCtx()
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    runAction('start')
  }

  const handleSaveName = (e) => {
    e.preventDefault()
    const trimmed = nameDraft.trim().slice(0, 30) || `Guest${Math.floor(10 + Math.random() * 90)}`
    setDisplayName(trimmed)
    setDisplayNameState(trimmed)
    ensureAudioCtx()
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(
      () => {
        setCopyStatus('copied')
        setTimeout(() => setCopyStatus('idle'), 1800)
      },
      () => {},
    )
  }

  if (!ROOMS_ENABLED) {
    return (
      <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
        <Nav />
        <div className="container pomodoro-page">
          <div className="playground-header">
            <div className="playground-eyebrow">// POMODORO</div>
            <h1 className="playground-title">Work. Break. Repeat.</h1>
          </div>
          <p className="gallery-empty">Pomodoro rooms aren't configured yet.</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
        <Nav />
        <div className="container pomodoro-page">
          <div className="playground-header">
            <div className="playground-eyebrow">// POMODORO</div>
            <h1 className="playground-title">Work. Break. Repeat.</h1>
          </div>
          <p className="save-to-gallery-error">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
        <Nav />
        <div className="container pomodoro-page">
          <p className="gallery-empty">loading…</p>
        </div>
      </div>
    )
  }

  const totalSeconds = (room.phase === 'work' ? room.work_minutes : room.break_minutes) * 60
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress)
  const workPresets = room.work_presets || []
  const breakPresets = room.break_presets || []
  const defaultWork = [25, 50]
  const defaultBreak = [5, 10, 30]

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />

      {!displayName && (
        <div className="save-modal-overlay">
          <div className="save-modal" role="dialog" aria-modal="true" aria-label="Your name">
            <div className="save-modal-label">// WHO'S JOINING</div>
            <p className="save-modal-copy">Pick a name so others in the room know who's here.</p>
            <form onSubmit={handleSaveName}>
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="your name"
                className="save-modal-input"
                maxLength={30}
                autoFocus
              />
              <div className="save-modal-actions">
                <button type="submit" className="btn-pill pink" style={{ padding: '10px 20px', fontSize: 13, border: 'none' }}>
                  join ↑
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="container pomodoro-page">
        <div className="playground-header">
          <div className="playground-eyebrow">// POMODORO</div>
          <h1 className="playground-title">Work. Break. Repeat.</h1>
          <p className="playground-lede">Everyone with this link sees the same clock, live.</p>
        </div>

        <div className="pomodoro-layout">
          <div className="pomodoro-main-col">
            <div className="pomodoro-ring-wrap">
              <svg className={`pomodoro-ring${room.phase === 'break' ? ' pomodoro-ring--break' : ''}`} viewBox="0 0 200 200">
                <circle className="pomodoro-ring-track" cx="100" cy="100" r={RING_RADIUS} />
                <circle
                  className="pomodoro-ring-progress"
                  cx="100"
                  cy="100"
                  r={RING_RADIUS}
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <div className="pomodoro-ring-center">
                <div className="pomodoro-phase-label">{room.phase === 'work' ? 'focus' : 'break'}</div>
                <div className="pomodoro-time">{formatTime(secondsLeft)}</div>
                <div className="pomodoro-cycles">
                  {room.cycles_completed} session{room.cycles_completed === 1 ? '' : 's'} done
                </div>
              </div>
            </div>

            <div className="pomodoro-controls">
              {!room.running ? (
                <button
                  type="button"
                  className="btn-pill pink"
                  style={{ border: 'none', padding: '13px 32px', fontSize: 14 }}
                  onClick={handleStart}
                >
                  ▶ start
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-pill dark"
                  style={{ border: 'none', padding: '13px 32px', fontSize: 14 }}
                  onClick={() => runAction('pause')}
                >
                  ⏸ pause
                </button>
              )}
              <button type="button" style={outlineBtn} onClick={() => runAction('skip')}>
                skip ⏭
              </button>
              <button type="button" style={outlineBtn} onClick={() => runAction('reset')}>
                reset ↻
              </button>
              <button
                type="button"
                style={outlineBtn}
                onClick={() => setSoundOn((s) => !s)}
                title={soundOn ? 'Mute chime' : 'Unmute chime'}
              >
                {soundOn ? '🔊' : '🔇'}
              </button>
            </div>
            {actionError && <p className="save-to-gallery-error">{actionError}</p>}

            <div className="pomodoro-preset-groups">
              <div className="pomodoro-preset-group">
                <div className="pomodoro-preset-label">// WORK</div>
                <div className="pomodoro-bubbles">
                  {workPresets.map((m) => {
                    const size = bubbleSize(m, workPresets)
                    return (
                      <div key={m} className="pomodoro-bubble-wrap">
                        <button
                          type="button"
                          className={`pomodoro-bubble${room.work_minutes === m ? ' selected' : ''}`}
                          style={{ width: size, height: size }}
                          disabled={room.running}
                          onClick={() => runAction('selectWork', m)}
                        >
                          {m}
                        </button>
                        {!defaultWork.includes(m) && (
                          <button
                            type="button"
                            className="pomodoro-bubble-remove"
                            aria-label={`Remove ${m} minute work preset`}
                            onClick={() => runAction('removeWorkPreset', m)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                <form
                  className="pomodoro-add-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (newWorkInput) runAction('addWorkPreset', Number(newWorkInput))
                    setNewWorkInput('')
                  }}
                >
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={newWorkInput}
                    onChange={(e) => setNewWorkInput(e.target.value)}
                    placeholder="+ add minutes"
                    className="pomodoro-add-input"
                  />
                </form>
              </div>

              <div className="pomodoro-preset-group">
                <div className="pomodoro-preset-label">// BREAK</div>
                <div className="pomodoro-bubbles">
                  {breakPresets.map((m) => {
                    const size = bubbleSize(m, breakPresets)
                    return (
                      <div key={m} className="pomodoro-bubble-wrap">
                        <button
                          type="button"
                          className={`pomodoro-bubble pomodoro-bubble--break${room.break_minutes === m ? ' selected' : ''}`}
                          style={{ width: size, height: size }}
                          disabled={room.running}
                          onClick={() => runAction('selectBreak', m)}
                        >
                          {m}
                        </button>
                        {!defaultBreak.includes(m) && (
                          <button
                            type="button"
                            className="pomodoro-bubble-remove"
                            aria-label={`Remove ${m} minute break preset`}
                            onClick={() => runAction('removeBreakPreset', m)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                <form
                  className="pomodoro-add-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (newBreakInput) runAction('addBreakPreset', Number(newBreakInput))
                    setNewBreakInput('')
                  }}
                >
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={newBreakInput}
                    onChange={(e) => setNewBreakInput(e.target.value)}
                    placeholder="+ add minutes"
                    className="pomodoro-add-input"
                  />
                </form>
              </div>
            </div>
            {room.running && <p className="pomodoro-hint">pause to change the preset durations</p>}
          </div>

          <div className="pomodoro-side-col">
            <div className="pomodoro-panel">
              <div className="pomodoro-preset-label">// SHARE THIS ROOM</div>
              <button type="button" className="pomodoro-share-btn" onClick={copyLink}>
                {copyStatus === 'copied' ? 'copied ✓' : 'copy link 🔗'}
              </button>
            </div>

            <div className="pomodoro-panel">
              <div className="pomodoro-preset-label">// WHO'S HERE ({members.length})</div>
              <div className="pomodoro-members">
                {members.map((m) => (
                  <div key={m.clientId} className="pomodoro-avatar" style={{ background: m.color }} title={m.name}>
                    {initialsForName(m.name)}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="pomodoro-rename-link"
                onClick={() => {
                  setNameDraft(displayName)
                  setDisplayNameState('')
                }}
              >
                you're "{displayName}" — change
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
