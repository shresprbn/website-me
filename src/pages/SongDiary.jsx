import { useEffect, useRef, useState, useCallback } from 'react'
import Nav from '../components/Nav'
import {
  fetchDiaryEntries,
  addDiaryEntry,
  deleteDiaryEntry,
  DIARY_READ_ENABLED,
  DIARY_WRITE_ENABLED,
} from '../lib/songDiaryApi'
import { DEBUG_PASSPHRASE, useDebugMode } from '../hooks/useDebugMode'
import { useModal } from '../components/ModalProvider'

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// A visible, draggable scrollbar for the timeline strip, plus wheel-to-scroll
// (overflow-x alone only responds to shift+wheel or a trackpad by default).
function TimelineScrollbar({ scrollRef }) {
  const trackRef = useRef(null)
  const draggingRef = useRef(false)
  const [thumb, setThumb] = useState({ left: 0, width: 1 })

  const measure = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const width = max > 0 ? Math.min(1, el.clientWidth / el.scrollWidth) : 1
    const left = max > 0 ? (el.scrollLeft / max) * (1 - width) : 0
    setThumb({ left, width })
  }, [scrollRef])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    measure()
    el.addEventListener('scroll', measure)
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      el.scrollLeft += e.deltaY
      e.preventDefault()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', measure)
      el.removeEventListener('wheel', onWheel)
      ro.disconnect()
    }
  }, [scrollRef, measure])

  const scrollToClientX = (clientX) => {
    const el = scrollRef.current
    const track = trackRef.current
    if (!el || !track) return
    const rect = track.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    el.scrollLeft = pct * (el.scrollWidth - el.clientWidth)
  }

  const onPointerDown = (e) => {
    draggingRef.current = true
    e.target.setPointerCapture(e.pointerId)
    scrollToClientX(e.clientX)
  }
  const onPointerMove = (e) => {
    if (!draggingRef.current) return
    scrollToClientX(e.clientX)
  }
  const onPointerUp = () => {
    draggingRef.current = false
  }
  const nudge = (dir) => scrollRef.current?.scrollBy({ left: dir * 240, behavior: 'smooth' })

  return (
    <div className="song-diary-scrollbar">
      <button type="button" className="song-diary-scrollbar-arrow" onClick={() => nudge(-1)} aria-label="Scroll left">
        ◄
      </button>
      <div
        ref={trackRef}
        className="song-diary-scrollbar-track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="song-diary-scrollbar-thumb"
          style={{ left: `${thumb.left * 100}%`, width: `${thumb.width * 100}%` }}
        />
      </div>
      <button type="button" className="song-diary-scrollbar-arrow" onClick={() => nudge(1)} aria-label="Scroll right">
        ►
      </button>
    </div>
  )
}

export default function SongDiary() {
  const [entries, setEntries] = useState([])
  const [status, setStatus] = useState('loading')
  const [selected, setSelected] = useState(0)
  const { debugMode, flash } = useDebugMode()

  const [formOpen, setFormOpen] = useState(false)
  const [trackUrl, setTrackUrl] = useState('')
  const [artist, setArtist] = useState('')
  const [date, setDate] = useState(todayIso())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [removingIds, setRemovingIds] = useState(() => new Set())
  const timelineRef = useRef(null)
  const { alertUser } = useModal()

  const load = (selectId) => {
    if (!DIARY_READ_ENABLED) {
      setStatus('unconfigured')
      return
    }
    setStatus('loading')
    fetchDiaryEntries()
      .then((rows) => {
        setEntries(rows)
        const idx = selectId ? rows.findIndex((r) => r.id === selectId) : -1
        setSelected(idx >= 0 ? idx : Math.floor(Math.random() * rows.length))
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }

  useEffect(() => load(), [])

  useEffect(() => {
    if (!debugMode) setFormOpen(false)
  }, [debugMode])

  useEffect(() => {
    const el = timelineRef.current?.querySelector(`[data-index="${selected}"]`)
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selected])

  const current = entries[selected]
  const goPrev = () => setSelected((i) => Math.max(0, i - 1))
  const goNext = () => setSelected((i) => Math.min(entries.length - 1, i + 1))

  const removeEntry = (id) => {
    setRemovingIds((prev) => new Set(prev).add(id))
    setTimeout(async () => {
      try {
        await deleteDiaryEntry(id, DEBUG_PASSPHRASE)
        const removedIdx = entries.findIndex((e) => e.id === id)
        const next = entries.filter((e) => e.id !== id)
        setEntries(next)
        setSelected((sel) => (next.length === 0 ? 0 : Math.min(removedIdx < sel ? sel - 1 : sel, next.length - 1)))
      } catch (err) {
        await alertUser(err.message || 'Could not delete.')
      } finally {
        setRemovingIds((prev) => {
          const n = new Set(prev)
          n.delete(id)
          return n
        })
      }
    }, 280)
  }

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')

    const cleanUrl = trackUrl.trim()
    const cleanArtist = artist.trim()
    if (!cleanUrl) {
      setFormError('Paste a Spotify track link.')
      return
    }
    if (!cleanArtist) {
      setFormError('Artist is required.')
      return
    }

    setSaving(true)
    try {
      const created = await addDiaryEntry({ trackUrl: cleanUrl, artist: cleanArtist, date, passphrase: DEBUG_PASSPHRASE })
      setTrackUrl('')
      setArtist('')
      setDate(todayIso())
      setFormOpen(false)
      load(created.id)
    } catch (err) {
      setFormError(err.message || 'Could not save entry.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />
      <div className={`container song-diary-page${flash ? ' notes-page--flash' : ''}`}>
        <div className="playground-header">
          <div className="playground-eyebrow">// SONG DIARY</div>
          <h1 className="playground-title">One song a day.</h1>
          <p className="playground-lede">Whatever's been on repeat — a small archive, browsable by date.</p>
        </div>

        {status === 'loading' && <p className="gallery-empty">loading…</p>}
        {status === 'unconfigured' && <p className="gallery-empty">Song diary isn't configured on this build.</p>}
        {status === 'error' && <p className="gallery-empty">Couldn't load the diary — try again in a bit.</p>}
        {status === 'ready' && entries.length === 0 && <p className="gallery-empty">Nothing in the diary yet.</p>}

        {status === 'ready' && current && (
          <>
            <div className="song-diary-date song-diary-date--center">{formatDate(current.date)}</div>
            <div className="song-diary-player-row">
              <button
                type="button"
                className="song-diary-nav-btn"
                onClick={goPrev}
                disabled={selected === 0}
                aria-label="Previous song"
              >
                ‹
              </button>
              <div className="song-diary-player-card">
                <iframe
                  key={current.trackId + current.date}
                  title={`${current.title} — ${current.artist}`}
                  src={`https://open.spotify.com/embed/track/${current.trackId}`}
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>
              <button
                type="button"
                className="song-diary-nav-btn"
                onClick={goNext}
                disabled={selected === entries.length - 1}
                aria-label="Next song"
              >
                ›
              </button>
            </div>

            <div className="song-diary-timeline-wrap">
              <div className="song-diary-timeline" ref={timelineRef}>
                {entries.map((entry, i) => (
                  <button
                    key={entry.id}
                    type="button"
                    data-index={i}
                    className={`song-diary-thumb${i === selected ? ' selected' : ''}${removingIds.has(entry.id) ? ' song-diary-thumb--removing' : ''}`}
                    onClick={() => setSelected(i)}
                    title={`${entry.title} — ${entry.artist} (${formatDate(entry.date)})`}
                  >
                    {debugMode && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="gallery-card-delete song-diary-thumb-delete"
                        title="delete entry"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          removeEntry(entry.id)
                        }}
                      >
                        ×
                      </span>
                    )}
                    <img src={entry.thumbnailUrl} alt={entry.title} loading="lazy" />
                  </button>
                ))}
              </div>
              <TimelineScrollbar scrollRef={timelineRef} />
              <div className="song-diary-scroll-hint">
                <span>{formatDate(entries[0].date)}</span>
                <span>{formatDate(entries[entries.length - 1].date)}</span>
              </div>
            </div>
          </>
        )}

        {DIARY_WRITE_ENABLED && debugMode && (
          <div className="song-diary-add">
            <button type="button" className="terminal-restart" onClick={() => setFormOpen((o) => !o)}>
              {formOpen ? '× cancel' : '+ add a song'}
            </button>

            {formOpen && (
              <form className="comment-form song-diary-form" onSubmit={submit}>
                <input
                  type="text"
                  placeholder="Spotify track link"
                  value={trackUrl}
                  onChange={(e) => setTrackUrl(e.target.value)}
                  className="comment-input"
                />
                <div className="comment-form-row">
                  <input
                    type="text"
                    placeholder="artist"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    className="comment-input"
                    maxLength={120}
                  />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="comment-input"
                  />
                </div>
                {formError && <p className="comment-form-error">{formError}</p>}
                <button type="submit" className="btn-pill dark" disabled={saving} style={{ border: 'none' }}>
                  {saving ? 'saving…' : 'add to diary'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {debugMode && (
        <div className="notes-debug-badge">
          <span>🐛 debug mode</span>
          <span className="notes-debug-hint">
            add a song below · click × on a thumbnail to delete it · type "{DEBUG_PASSPHRASE}" again to exit
          </span>
        </div>
      )}

      {flash && <div className="notes-debug-flash-overlay">// DEBUG MODE {debugMode ? 'ENABLED' : 'DISABLED'}</div>}
    </div>
  )
}
