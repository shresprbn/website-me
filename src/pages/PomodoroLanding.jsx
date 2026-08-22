import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'
import { createRoom, ROOMS_ENABLED } from '../lib/pomodoroRoom'

// Visiting /pomodoro always spins up a fresh shareable room and redirects —
// there's no separate "solo" mode, a room with just you in it works fine.
export default function PomodoroLanding() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ROOMS_ENABLED) return
    let cancelled = false
    createRoom({})
      .then((room) => {
        if (!cancelled) navigate(`/pomodoro/${room.id}`, { replace: true })
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't create a room — try refreshing.")
      })
    return () => {
      cancelled = true
    }
  }, [navigate])

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
        {ROOMS_ENABLED && !error && <p className="gallery-empty">setting up your room…</p>}
        {error && <p className="save-to-gallery-error">{error}</p>}
      </div>
    </div>
  )
}
