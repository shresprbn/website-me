import { useEffect, useState } from 'react'
import Nav from '../components/Nav'
import { fetchCreations, GALLERY_ENABLED } from '../lib/gallery'

const KINDS = [
  { id: null, label: 'all' },
  { id: 'pixel', label: 'pixel maker' },
  { id: 'beat', label: 'beat maker' },
  { id: 'character', label: 'character maker' },
]

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Gallery() {
  const [kind, setKind] = useState(null)
  const [creations, setCreations] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!GALLERY_ENABLED) {
      setStatus('unconfigured')
      return
    }
    let cancelled = false
    setStatus('loading')
    fetchCreations(kind)
      .then((rows) => {
        if (cancelled) return
        setCreations(rows)
        setStatus('ready')
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [kind])

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />
      <div className="container gallery-page">
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
        {status === 'loading' && <p className="gallery-empty">loading…</p>}
        {status === 'ready' && creations.length === 0 && (
          <p className="gallery-empty">Nothing here yet — go make something.</p>
        )}

        {status === 'ready' && creations.length > 0 && (
          <div className="gallery-grid">
            {creations.map((c) => (
              <div key={c.id} className="gallery-card">
                <div className="gallery-card-thumb">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title || c.kind} loading="lazy" />
                  ) : (
                    <div className="gallery-card-fallback">{c.kind}</div>
                  )}
                </div>
                <div className="gallery-card-meta">
                  <span className="gallery-card-kind">{c.kind}</span>
                  <span className="gallery-card-date">{formatDate(c.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
