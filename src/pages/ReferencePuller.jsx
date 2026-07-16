import { useCallback, useEffect, useRef, useState } from 'react'
import Nav from '../components/Nav'
import {
  ACCENT,
  SOURCES,
  TIMER_PRESETS,
  createShuffleBag,
  drawArtwork,
  drawGallery,
  formatClock,
  loadPool,
  preloadImage,
  sourceLabel,
} from '../lib/artUtils'

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

const presetBtn = {
  background: '#faf8f3',
  color: '#141414',
  border: '1px solid #e8e3d8',
  borderRadius: 40,
  padding: '9px 18px',
  fontFamily: "'Space Mono', monospace",
  fontSize: 12,
  cursor: 'pointer',
}

const activePresetBtn = {
  ...presetBtn,
  border: `2px solid ${ACCENT}`,
  background: 'rgba(124, 108, 240, .12)',
}

const MODES = [
  { id: 'viewer', label: 'viewer' },
  { id: 'timer', label: 'timed study' },
  { id: 'gallery', label: 'gallery' },
]

export default function ReferencePuller() {
  const [mode, setMode] = useState('viewer')
  const [sourceIds, setSourceIds] = useState(SOURCES.map((s) => s.id))
  const [highlightsOnly, setHighlightsOnly] = useState(true)
  const [artwork, setArtwork] = useState(null)
  const [gallery, setGallery] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')
  const [pulling, setPulling] = useState(false)

  const [seconds, setSeconds] = useState(TIMER_PRESETS[1].seconds)
  const [remaining, setRemaining] = useState(TIMER_PRESETS[1].seconds)
  const [running, setRunning] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const bagRef = useRef(null)
  const abortRef = useRef(null)
  const nextRef = useRef(null)
  const modeRef = useRef(mode)
  const secondsRef = useRef(seconds)
  modeRef.current = mode
  secondsRef.current = seconds

  // Warm the next image so a timed study never opens on a blank frame.
  const primeNext = useCallback(async () => {
    const bag = bagRef.current
    if (!bag) return
    try {
      const next = await drawArtwork(bag, undefined)
      nextRef.current = next
      if (next) preloadImage(next.imageUrl)
    } catch {
      nextRef.current = null
    }
  }, [])

  const pull = useCallback(async () => {
    const bag = bagRef.current
    if (!bag) return
    setPulling(true)
    setRevealed(false)
    try {
      const queued = nextRef.current
      nextRef.current = null
      const next = queued || (await drawArtwork(bag, undefined))
      if (next) {
        setArtwork(next)
        setRemaining(secondsRef.current)
      }
      primeNext()
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message)
    } finally {
      setPulling(false)
    }
  }, [primeNext])

  // Build the pool whenever the chosen sources change.
  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller
    let cancelled = false

    setStatus('loading')
    setError('')
    setArtwork(null)
    setGallery([])
    nextRef.current = null

    async function run() {
      try {
        const entries = await loadPool(sourceIds, { highlightsOnly }, controller.signal)
        if (cancelled) return
        const bag = createShuffleBag(entries)
        bagRef.current = bag

        if (modeRef.current === 'gallery') {
          const items = await drawGallery(bag, controller.signal)
          if (cancelled) return
          setGallery(items)
        } else {
          const first = await drawArtwork(bag, controller.signal)
          if (cancelled) return
          setArtwork(first)
          primeNext()
        }
        setStatus('ready')
      } catch (err) {
        if (cancelled || err.name === 'AbortError') return
        setError(err.message || 'Something went wrong.')
        setStatus('error')
      }
    }
    run()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [sourceIds, highlightsOnly, primeNext])

  // Fill the gallery on first switch into it.
  useEffect(() => {
    if (mode !== 'gallery' || status !== 'ready' || gallery.length) return
    const bag = bagRef.current
    if (!bag) return
    let cancelled = false
    drawGallery(bag, undefined)
      .then((items) => !cancelled && setGallery(items))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [mode, status, gallery.length])

  // Countdown against a wall-clock deadline — a decrementing counter drifts
  // badly once the tab is backgrounded and throttled.
  useEffect(() => {
    if (!running || mode !== 'timer') return
    const deadline = Date.now() + remaining * 1000
    let id = 0
    id = setInterval(() => {
      const left = (deadline - Date.now()) / 1000
      if (left <= 0) {
        // Stop before pulling: the next artwork is async, and a still-live
        // interval would fire again every 250ms and stack up pulls.
        clearInterval(id)
        setRemaining(0)
        pull()
      } else {
        setRemaining(left)
      }
    }, 250)
    return () => clearInterval(id)
    // `remaining` is intentionally omitted: it would rebuild the deadline every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, artwork, pull])

  // Spacebar pulls the next reference.
  useEffect(() => {
    function onKey(e) {
      if (e.code !== 'Space' || mode === 'gallery') return
      const tag = (e.target.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'button') return
      e.preventDefault()
      pull()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pull, mode])

  function toggleSource(id) {
    setSourceIds((prev) => {
      if (prev.includes(id)) return prev.length === 1 ? prev : prev.filter((s) => s !== id)
      return [...prev, id]
    })
  }

  function chooseSeconds(value) {
    setSeconds(value)
    setRemaining(value)
    setRunning(false)
    setRevealed(false)
  }

  // A record whose image 404s or gets blocked: drop it and move on.
  function handleImageError() {
    pull()
  }

  function openFromGallery(item) {
    setArtwork(item)
    setMode('viewer')
    setRevealed(true)
  }

  const hideBlurb = mode === 'timer' && running && !revealed

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />
      <div className="container reference-page">
        <div className="playground-header">
          <div className="playground-eyebrow">// REFERENCE PULLER</div>
          <h1 className="playground-title">Draw from the greats.</h1>
          <p className="playground-lede">
            Random public-domain paintings from the Met and the Cleveland Museum of Art. Pull one,
            set a timer, or browse the wall.
          </p>
        </div>

        <div className="reference-controls">
          <div className="reference-chips">
            {MODES.map((m) => (
              <button
                key={m.id}
                style={mode === m.id ? activePresetBtn : presetBtn}
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="reference-chips">
            <span className="reference-chip-label">source</span>
            {SOURCES.map((s) => (
              <button
                key={s.id}
                style={sourceIds.includes(s.id) ? activePresetBtn : presetBtn}
                onClick={() => toggleSource(s.id)}
              >
                {s.label}
              </button>
            ))}
            <button
              style={highlightsOnly ? activePresetBtn : presetBtn}
              onClick={() => setHighlightsOnly((v) => !v)}
              title="Only works each museum flags as a collection highlight"
            >
              famous only
            </button>
          </div>
        </div>

        {status === 'loading' && (
          <div className="reference-stage">
            <div className="reference-skeleton" />
            <div className="playground-eyebrow">// PULLING…</div>
          </div>
        )}

        {status === 'error' && (
          <div className="reference-stage">
            <p className="reference-error">{error}</p>
            <button style={outlineBtn} onClick={() => setSourceIds((prev) => [...prev])}>
              Try again
            </button>
          </div>
        )}

        {status === 'ready' && mode !== 'gallery' && artwork && (
          <div className="reference-viewer">
            <div className="reference-frame">
              <img
                key={artwork.key}
                src={artwork.imageUrl}
                alt={artwork.title}
                onError={handleImageError}
              />
            </div>

            <div className="reference-meta">
              {mode === 'timer' && (
                <div className="reference-timer">
                  <div className="reference-clock" style={{ color: ACCENT }}>
                    {formatClock(remaining)}
                  </div>
                  <div className="reference-chips">
                    {TIMER_PRESETS.map((p) => (
                      <button
                        key={p.seconds}
                        style={seconds === p.seconds ? activePresetBtn : presetBtn}
                        onClick={() => chooseSeconds(p.seconds)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="reference-chips">
                    <button style={outlineBtn} onClick={() => setRunning((r) => !r)}>
                      {running ? 'Pause' : 'Start'}
                    </button>
                    <button style={outlineBtn} onClick={pull} disabled={pulling}>
                      Skip
                    </button>
                  </div>
                </div>
              )}

              <div className="reference-card">
                <div className="reference-eyebrow">
                  {sourceLabel(artwork.source)}
                  {artwork.highlight ? ' · highlight' : ''}
                </div>
                <h2 className="reference-title">{artwork.title}</h2>
                <p className="reference-artist">
                  {artwork.artist}
                  {artwork.year ? `, ${artwork.year}` : ''}
                </p>
                {artwork.medium && <p className="reference-line">{artwork.medium}</p>}
                {artwork.dimensions && <p className="reference-line">{artwork.dimensions}</p>}
                {artwork.culture && <p className="reference-line">{artwork.culture}</p>}
                {artwork.blurb && !hideBlurb && <p className="reference-blurb">{artwork.blurb}</p>}
                {artwork.pageUrl && (
                  <a
                    className="reference-link"
                    href={artwork.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: ACCENT }}
                  >
                    View at {artwork.credit} →
                  </a>
                )}
              </div>

              {mode === 'viewer' && (
                <div className="reference-chips">
                  <button style={outlineBtn} onClick={pull} disabled={pulling}>
                    {pulling ? 'Pulling…' : 'Pull another'}
                  </button>
                  <span className="reference-hint">or hit space</span>
                </div>
              )}
            </div>
          </div>
        )}

        {status === 'ready' && mode === 'gallery' && (
          <div className="reference-gallery">
            {gallery.map((item) => (
              <button key={item.key} className="reference-tile" onClick={() => openFromGallery(item)}>
                <img src={item.thumbUrl} alt={item.title} loading="lazy" />
                <span className="reference-tile-title">{item.title}</span>
              </button>
            ))}
          </div>
        )}

        <p className="reference-credit">
          Artwork data from the Metropolitan Museum of Art and the Cleveland Museum of Art open
          access APIs. All works shown are public domain.
        </p>
      </div>
    </div>
  )
}
