import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'
import { createRoom, ROOMS_ENABLED, LAST_ROOM_KEY } from '../lib/pomodoroRoom'
import { outlineBtn } from '../lib/controlStyles'

// Visiting /pomodoro used to always mint a fresh room. Now it offers to rejoin
// the last one you were in (stored locally) so bookmarking /pomodoro is useful.
function readLastRoom() {
  try {
    return localStorage.getItem(LAST_ROOM_KEY) || null
  } catch {
    return null
  }
}

export default function PomodoroLanding() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const creatingRef = useRef(false)
  const lastRoom = readLastRoom()

  const newRoom = () => {
    if (!ROOMS_ENABLED || creatingRef.current) return
    creatingRef.current = true
    setCreating(true)
    setError('')
    createRoom({})
      .then((room) => navigate(`/pomodoro/${room.id}`, { replace: true }))
      .catch(() => {
        setError("Couldn't create a room — try refreshing.")
        setCreating(false)
        creatingRef.current = false
      })
  }

  // No previous room → behave like before and jump straight into a new one.
  useEffect(() => {
    if (!lastRoom && ROOMS_ENABLED) newRoom()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />
      <div className="container pomodoro-page">
        <div className="playground-header">
          <div className="playground-eyebrow">// POMODORO</div>
          <h1 className="playground-title">Work. Break. Repeat.</h1>
          <p className="playground-lede">Share the link and everyone sees the same clock.</p>
        </div>

        {!ROOMS_ENABLED && <p className="gallery-empty">Pomodoro rooms aren't configured yet.</p>}

        {ROOMS_ENABLED && lastRoom && (
          <div className="pomodoro-landing-choices">
            <button
              type="button"
              className="btn-pill dark"
              style={{ border: 'none', padding: '13px 28px', fontSize: 14 }}
              onClick={() => navigate(`/pomodoro/${lastRoom}`)}
            >
              rejoin last room →
            </button>
            <button type="button" style={outlineBtn} onClick={newRoom} disabled={creating}>
              {creating ? 'creating…' : 'start a new room'}
            </button>
            <p className="pomodoro-landing-hint">last room: {lastRoom.slice(0, 8)}…</p>
          </div>
        )}

        {ROOMS_ENABLED && !lastRoom && !error && (
          <p className="gallery-empty">setting up your room…</p>
        )}
        {error && <p className="save-to-gallery-error">{error}</p>}
      </div>
    </div>
  )
}
