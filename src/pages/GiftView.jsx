import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Nav from '../components/Nav'
import { fetchGift, GIFT_THEMES, GIFT_VIEW_ENABLED } from '../lib/gifts'

export default function GiftView() {
  const { id } = useParams()
  const [gift, setGift] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!GIFT_VIEW_ENABLED) {
      setStatus('unconfigured')
      return
    }
    let cancelled = false
    setStatus('loading')
    fetchGift(id)
      .then((data) => {
        if (cancelled) return
        setGift(data)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const theme = GIFT_THEMES.find((t) => t.id === gift?.theme) || GIFT_THEMES[0]
  const isDark = theme.id === 'midnight'
  const data = gift?.data || {}
  const notes = data.notes || []
  const songs = data.songs || []
  const links = data.links || []
  const stickers = data.stickers || []

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />
      <div className="container gift-view-page">
        <Link to="/playground" className="gallery-back-link">
          ← playground
        </Link>

        {status === 'loading' && <p className="gallery-empty">unwrapping…</p>}
        {status === 'unconfigured' && <p className="gallery-empty">Gift package isn't configured on this build.</p>}
        {status === 'error' && <p className="gallery-empty">Couldn't find that gift — the link might be wrong.</p>}

        {status === 'ready' && gift && (
          <div className="gift-view-wrap" style={{ background: theme.bg, color: isDark ? '#f2eefe' : '#141414' }}>
            <div className="gift-view-header">
              <div className="gift-view-eyebrow" style={{ color: theme.accent }}>
                {gift.to_name ? `for ${gift.to_name}` : 'a little something'}
              </div>
              <h1 className="gift-view-title">{gift.title || 'A gift for you'}</h1>
              {gift.from_name && <p className="gift-view-from">from {gift.from_name}</p>}
            </div>

            {stickers.length > 0 && (
              <div className="gift-board gift-board--view">
                {stickers.map((s, i) => (
                  <div
                    key={i}
                    className="gift-sticker gift-sticker--view"
                    style={{
                      left: `${s.x}%`,
                      top: `${s.y}%`,
                      transform: `translate(-50%, -50%) rotate(${s.rot || 0}deg) scale(${s.scale || 1})`,
                    }}
                  >
                    {s.emoji}
                  </div>
                ))}
              </div>
            )}

            {notes.length > 0 && (
              <section className="gift-view-section">
                <div className="gift-note-pile">
                  {notes.map((text, i) => (
                    <div key={i} className="gift-note-card" style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (2 + (i % 3))}deg)` }}>
                      <p className="gift-note-text">{text}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {songs.length > 0 && (
              <section className="gift-view-section">
                <div className="gift-cassette">
                  <div className="gift-cassette-reels">
                    <span className="gift-cassette-reel" />
                    <span className="gift-cassette-reel" />
                  </div>
                  <div className="gift-cassette-label">
                    <div className="gift-cassette-title">{gift.title || 'a mixtape for you'}</div>
                    <ul className="gift-cassette-tracklist">
                      {songs.map((s, i) => (
                        <li key={i}>
                          <span className="gift-cassette-track-num">{String(i + 1).padStart(2, '0')}</span>
                          <span className="gift-cassette-track-name">
                            {s.title}
                            {s.artist ? ` — ${s.artist}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="gift-song-embeds">
                  {songs
                    .filter((s) => s.embedType && s.embedId)
                    .map((s, i) => (
                      <iframe
                        key={i}
                        title={s.title}
                        className="gift-spotify-embed"
                        src={`https://open.spotify.com/embed/${s.embedType}/${s.embedId}?theme=0`}
                        width="100%"
                        height="152"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                      />
                    ))}
                </div>
              </section>
            )}

            {links.length > 0 && (
              <section className="gift-view-section">
                <div className="gift-section-label" style={{ color: isDark ? '#cfc6ec' : '#8a8a8a' }}>// WATCH TOGETHER</div>
                <div className="gift-youtube-grid">
                  {links.map((l, i) => (
                    <div key={i} className="gift-youtube-item">
                      <iframe
                        title={l.title || `video ${i + 1}`}
                        src={`https://www.youtube.com/embed/${l.videoId}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                      />
                      {l.title && <p className="gift-youtube-caption">{l.title}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="gift-view-footer">
              <Link to="/gift-package" style={{ color: theme.accent }}>make your own gift package →</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
