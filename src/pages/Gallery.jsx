import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav'
import { deleteCreation, fetchCreationsPage, GALLERY_ENABLED } from '../lib/gallery'
import { DEBUG_PASSPHRASE, useDebugMode } from '../hooks/useDebugMode'
import { useModal } from '../components/ModalProvider'

const KINDS = [
  { id: null, label: 'all' },
  { id: 'pixel', label: 'pixel maker' },
  { id: 'beat', label: 'beat maker' },
  { id: 'character', label: 'character maker' },
  { id: 'text', label: 'text melody' },
]

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Gallery() {
  const [kind, setKind] = useState(null)
  const [creations, setCreations] = useState([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('loading') // loading | ready | error | unconfigured
  const [loadingMore, setLoadingMore] = useState(false)
  const { debugMode, flash } = useDebugMode()
  const [removingIds, setRemovingIds] = useState(() => new Set())
  const { alertUser } = useModal()

  const kindRef = useRef(kind)
  const pageRef = useRef(0)
  const loadingRef = useRef(false)
  const creationsRef = useRef(creations)
  const totalRef = useRef(total)
  const sentinelRef = useRef(null)
  kindRef.current = kind
  creationsRef.current = creations
  totalRef.current = total

  const load = useCallback(async (targetKind, targetPage, replace) => {
    if (loadingRef.current) return
    loadingRef.current = true
    if (replace) setStatus('loading')
    else setLoadingMore(true)
    try {
      const { creations: rows, total: t } = await fetchCreationsPage(targetKind, targetPage)
      // A response that landed after the tab was switched is stale — drop it.
      if (kindRef.current !== targetKind) return
      setTotal(t)
      setCreations((prev) => {
        if (replace) return rows
        const seen = new Set(prev.map((c) => c.id))
        return [...prev, ...rows.filter((r) => !seen.has(r.id))]
      })
      pageRef.current = targetPage
      setStatus('ready')
    } catch (err) {
      console.error(err)
      if (kindRef.current === targetKind && replace) setStatus('error')
    } finally {
      loadingRef.current = false
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    if (!GALLERY_ENABLED) {
      setStatus('unconfigured')
      return
    }
    pageRef.current = 0
    setCreations([])
    setTotal(0)
    load(kind, 0, true)
  }, [kind, load])

  // Infinite scroll — pull the next page as the sentinel nears the viewport.
  // Re-observed after every append so that, if the fresh page still doesn't
  // fill the viewport, the observer re-fires and keeps going until it does
  // (or everything's loaded).
  useEffect(() => {
    if (status !== 'ready') return
    const el = sentinelRef.current
    if (!el) return
    if (creations.length === 0 || creations.length >= total) return

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || loadingRef.current) return
        if (creationsRef.current.length >= totalRef.current) return
        load(kindRef.current, pageRef.current + 1, false)
      },
      { rootMargin: '500px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [load, status, creations.length, total])

  const removeCreation = (id) => {
    setRemovingIds((prev) => new Set(prev).add(id))
    setTimeout(async () => {
      try {
        await deleteCreation(id, DEBUG_PASSPHRASE)
        setCreations((prev) => prev.filter((c) => c.id !== id))
        setTotal((t) => Math.max(0, t - 1))
      } catch (err) {
        await alertUser(err.message || 'Could not delete.')
      } finally {
        setRemovingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    }, 280)
  }

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />
      <div className={`container gallery-page${flash ? ' notes-page--flash' : ''}`}>
        <div className="playground-header">
          <div className="playground-eyebrow">// GALLERY</div>
          <h1 className="playground-title">What people made.</h1>
          <p className="playground-lede">
            Everything saved from the pixel, beat, and character makers — public, first come first served.
          </p>
        </div>

        <div className="gallery-tabs">
          {KINDS.map((k) => (
            <button
              key={k.label}
              type="button"
              className={`gallery-tab${kind === k.id ? ' active' : ''}`}
              onClick={() => setKind(k.id)}
            >
              {k.label}
            </button>
          ))}
        </div>

        {status === 'unconfigured' && (
          <p className="gallery-empty">Gallery isn't configured on this build.</p>
        )}
        {status === 'error' && (
          <p className="gallery-empty">Couldn't load the gallery — try again in a bit.</p>
        )}
        {status === 'loading' && (
          <div className="gallery-grid" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="gallery-card gallery-card--skeleton">
                <div className="gallery-card-thumb" />
                <div className="gallery-skeleton-line" />
              </div>
            ))}
          </div>
        )}
        {status === 'ready' && creations.length === 0 && (
          <p className="gallery-empty">Nothing here yet — go make something.</p>
        )}

        {status === 'ready' && creations.length > 0 && (
          <div className="gallery-grid">
            {creations.map((c) => (
              <Link
                key={c.id}
                to={`/gallery/${c.id}`}
                className={`gallery-card${removingIds.has(c.id) ? ' gallery-card--removing' : ''}`}
              >
                {debugMode && (
                  <button
                    type="button"
                    className="gallery-card-delete"
                    title="delete creation"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      removeCreation(c.id)
                    }}
                  >
                    ×
                  </button>
                )}
                <div className="gallery-card-thumb">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title || c.kind} loading="lazy" />
                  ) : (
                    <div className="gallery-card-fallback">{c.kind}</div>
                  )}
                </div>
                {c.title && <div className="gallery-card-title">{c.title}</div>}
                <div className="gallery-card-meta">
                  <span className="gallery-card-kind">{c.kind}</span>
                  {c.creator_name && <span className="gallery-card-author">by {c.creator_name}</span>}
                  <span className="gallery-card-date">{formatDate(c.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="gallery-sentinel" aria-hidden="true" />

        {status === 'ready' && creations.length > 0 && creations.length < total && (
          <div className="gallery-more">
            {loadingMore ? (
              <p className="gallery-empty gallery-loading-more">loading more…</p>
            ) : (
              <button
                type="button"
                className="gallery-more-btn"
                onClick={() => load(kind, pageRef.current + 1, false)}
              >
                load more ({total - creations.length} left)
              </button>
            )}
          </div>
        )}
        {status === 'ready' && total > 0 && creations.length >= total && creations.length > 8 && (
          <p className="gallery-empty gallery-end">that's all {total} of them.</p>
        )}
      </div>

      {debugMode && (
        <div className="notes-debug-badge">
          <span>🐛 debug mode</span>
          <span className="notes-debug-hint">click × on a card to delete it · type "{DEBUG_PASSPHRASE}" again to exit</span>
        </div>
      )}

      {flash && <div className="notes-debug-flash-overlay">// DEBUG MODE {debugMode ? 'ENABLED' : 'DISABLED'}</div>}
    </div>
  )
}
