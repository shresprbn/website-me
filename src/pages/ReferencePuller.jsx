import { useCallback, useEffect, useRef, useState } from 'react'
import Nav from '../components/Nav'
import StudyTimer, { TIMER_PRESETS } from '../components/StudyTimer'
import {
  ACCENT,
  SOURCES,
  createShuffleBag,
  drawArtwork,
  drawGallery,
  loadPool,
  preloadImage,
  sourceLabel,
} from '../lib/artUtils'
import { outlineBtn, presetBtn, makeActivePreset } from '../lib/controlStyles'

const activePresetBtn = makeActivePreset(ACCENT)

const MODES = [
  { id: 'viewer', label: 'viewer' },
  { id: 'timer', label: 'timed study' },
  { id: 'gallery', label: 'gallery' },
]

const HISTORY_CAP = 40
const CENTER = { x: 50, y: 50 }

export default function ReferencePuller() {
  const [mode, setMode] = useState('viewer')
  const [sourceIds, setSourceIds] = useState(SOURCES.map((s) => s.id))
  const [highlightsOnly, setHighlightsOnly] = useState(false)
  const [history, setHistory] = useState([])
  const [histIndex, setHistIndex] = useState(-1)
  const [gallery, setGallery] = useState([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')
  const [pulling, setPulling] = useState(false)

  // Study aids — all sticky across pulls; the magnifier focal recenters.
  const [grayscale, setGrayscale] = useState(false)
  const [flip, setFlip] = useState(false)
  const [detail, setDetail] = useState(false)
  const [focal, setFocal] = useState(CENTER)

  const [seconds, setSeconds] = useState(TIMER_PRESETS[1].seconds)
  const [remaining, setRemaining] = useState(TIMER_PRESETS[1].seconds)
  const [running, setRunning] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const bagRef = useRef(null)
  const abortRef = useRef(null)
  const nextRef = useRef(null)
  const modeRef = useRef(mode)
  const secondsRef = useRef(seconds)
  const historyRef = useRef([])
  const histIndexRef = useRef(-1)
  modeRef.current = mode
  secondsRef.current = seconds
  historyRef.current = history
  histIndexRef.current = histIndex

  const artwork = histIndex >= 0 ? history[histIndex] : null
  const hasPrev = histIndex > 0
  const hasSeenNext = histIndex >= 0 && histIndex < history.length - 1

  // Push a freshly-pulled artwork, dropping any "forward" history first —
  // browser-style: pulling a new one after going back rewrites the future.
  const pushArtwork = (art) => {
    const base = historyRef.current.slice(0, histIndexRef.current + 1)
    const next = [...base, art].slice(-HISTORY_CAP)
    historyRef.current = next
    histIndexRef.current = next.length - 1
    setHistory(next)
    setHistIndex(next.length - 1)
  }

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
        pushArtwork(next)
        setRemaining(secondsRef.current)
      }
      primeNext()
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message)
    } finally {
      setPulling(false)
    }
    // pushArtwork is stable (only touches refs + setState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primeNext])

  // Step back through already-seen references — no network, no repeat draw.
  const goPrev = useCallback(() => {
    if (histIndexRef.current <= 0) return
    const i = histIndexRef.current - 1
    histIndexRef.current = i
    setHistIndex(i)
    setRevealed(true)
    setRunning(false)
    setRemaining(secondsRef.current)
  }, [])

  // Forward: walk seen history first, only hit the API once you're at the end.
  const goNext = useCallback(() => {
    if (histIndexRef.current < historyRef.current.length - 1) {
      const i = histIndexRef.current + 1
      histIndexRef.current = i
      setHistIndex(i)
      setRevealed(true)
      setRunning(false)
      setRemaining(secondsRef.current)
      return
    }
    pull()
  }, [pull])

  // Build the pool whenever the chosen sources change.
  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller
    let cancelled = false

    setStatus('loading')
    setError('')
    setHistory([])
    setHistIndex(-1)
    historyRef.current = []
    histIndexRef.current = -1
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
          if (first) pushArtwork(first)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Magnifier focal + timed reveal reset on every new piece.
  useEffect(() => {
    setFocal(CENTER)
  }, [artwork?.key])

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

  // Keyboard: space / → advance, ← goes back.
  useEffect(() => {
    function onKey(e) {
      if (mode === 'gallery') return
      const tag = (e.target.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'button') return
      if (e.code === 'Space' || e.code === 'ArrowRight') {
        e.preventDefault()
        goNext()
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, mode])

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
    pushArtwork(item)
    setMode('viewer')
    setRevealed(true)
  }

  async function loadMoreGallery() {
    const bag = bagRef.current
    if (!bag || galleryLoading) return
    setGalleryLoading(true)
    try {
      const more = await drawGallery(bag, undefined)
      setGallery((g) => {
        const seen = new Set(g.map((x) => x.key))
        return [...g, ...more.filter((m) => !seen.has(m.key))]
      })
    } catch {
      // leave what's there
    } finally {
      setGalleryLoading(false)
    }
  }

  function onFrameMove(e) {
    if (!detail) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 100
    const y = ((e.clientY - r.top) / r.height) * 100
    setFocal({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    })
  }

  const hideBlurb = mode === 'timer' && running && !revealed
  const originX = flip ? 100 - focal.x : focal.x
  const imgStyle = {
    filter: grayscale ? 'grayscale(1) contrast(1.05)' : undefined,
    transform: `scaleX(${flip ? -1 : 1}) scale(${detail ? 2 : 1})`,
    transformOrigin: `${originX}% ${focal.y}%`,
    cursor: detail ? 'crosshair' : undefined,
    transition: 'transform .12s ease-out, filter .12s ease-out',
  }

  const navRow = (
    <div className="reference-nav">
      <button style={outlineBtn} onClick={goPrev} disabled={!hasPrev}>
        ← prev
      </button>
      <button style={outlineBtn} onClick={goNext} disabled={pulling}>
        {hasSeenNext ? 'next →' : pulling ? 'Pulling…' : 'pull another →'}
      </button>
      <span className="reference-hint">
        {histIndex >= 0 ? `${histIndex + 1} / ${history.length}` : ''} · ← → or space
      </span>
    </div>
  )

  const studyTools = (
    <div className="reference-study-tools">
      <span className="reference-chip-label">study</span>
      <button
        style={grayscale ? activePresetBtn : presetBtn}
        onClick={() => setGrayscale((v) => !v)}
        aria-pressed={grayscale}
        title="Value study — drop the colour"
      >
        ◑ grayscale
      </button>
      <button
        style={flip ? activePresetBtn : presetBtn}
        onClick={() => setFlip((v) => !v)}
        aria-pressed={flip}
        title="Fresh eyes — mirror the image"
      >
        ⇋ flip
      </button>
      <button
        style={detail ? activePresetBtn : presetBtn}
        onClick={() => setDetail((v) => !v)}
        aria-pressed={detail}
        title="Magnify — move the pointer over the image"
      >
        ⌕ detail
      </button>
    </div>
  )

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
            <div className="reference-frame-col">
              {studyTools}
              <div
                className="reference-frame"
                onMouseMove={onFrameMove}
                onMouseLeave={() => detail && setFocal(CENTER)}
              >
                <img
                  key={artwork.key}
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  onError={handleImageError}
                  style={imgStyle}
                />
              </div>
            </div>

            <div className="reference-meta">
              {mode === 'timer' && (
                <div className="reference-timer">
                  <StudyTimer
                    remaining={remaining}
                    seconds={seconds}
                    running={running}
                    accent={ACCENT}
                    onChoose={chooseSeconds}
                    onToggle={() => setRunning((r) => !r)}
                    onSkip={goNext}
                    skipDisabled={pulling}
                  />
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

              {navRow}
            </div>
          </div>
        )}

        {status === 'ready' && mode === 'gallery' && (
          <>
            <div className="reference-gallery">
              {gallery.map((item) => (
                <button key={item.key} className="reference-tile" onClick={() => openFromGallery(item)}>
                  <img src={item.thumbUrl} alt={item.title} loading="lazy" />
                  <span className="reference-tile-title">{item.title}</span>
                </button>
              ))}
            </div>
            {gallery.length > 0 && (
              <div className="reference-gallery-more">
                <button style={outlineBtn} onClick={loadMoreGallery} disabled={galleryLoading}>
                  {galleryLoading ? 'loading…' : 'load more'}
                </button>
              </div>
            )}
          </>
        )}

        <p className="reference-credit">
          Artwork data from the Metropolitan Museum of Art and the Cleveland Museum of Art open
          access APIs. All works shown are public domain.
        </p>
      </div>
    </div>
  )
}
