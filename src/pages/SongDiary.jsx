import { useEffect, useState } from 'react'
import Nav from '../components/Nav'
import { fetchDiaryEntries, addDiaryEntry, DIARY_READ_ENABLED, DIARY_WRITE_ENABLED } from '../lib/songDiaryApi'

const KEY_STORAGE = 'song-diary-key'

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

export default function SongDiary() {
  const [entries, setEntries] = useState([])
  const [status, setStatus] = useState('loading')
  const [selected, setSelected] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [trackUrl, setTrackUrl] = useState('')
  const [artist, setArtist] = useState('')
  const [date, setDate] = useState(todayIso())
  const [passphrase, setPassphrase] = useState(() => {
    try {
      return localStorage.getItem(KEY_STORAGE) || ''
    } catch {
      return ''
    }
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = () => {
    if (!DIARY_READ_ENABLED) {
      setStatus('unconfigured')
      return
    }
    setStatus('loading')
    fetchDiaryEntries()
      .then((rows) => {
        setEntries(rows)
        setSelected(rows.length - 1)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }

  useEffect(load, [])

  const current = entries[selected]

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
    if (!passphrase) {
      setFormError('Passphrase is required.')
      return
    }

    setSaving(true)
    try {
      await addDiaryEntry({ trackUrl: cleanUrl, artist: cleanArtist, date, passphrase })
      try {
        localStorage.setItem(KEY_STORAGE, passphrase)
      } catch {
        // ignore — localStorage may be unavailable
      }
      setTrackUrl('')
      setArtist('')
      setDate(todayIso())
      setFormOpen(false)
      load()
    } catch (err) {
      setFormError(err.message || 'Could not save entry.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />
      <div className="container song-diary-page">
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
            <div className="song-diary-date">{formatDate(current.date)}</div>
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

            <div className="song-diary-timeline-wrap">
              <div className="song-diary-timeline">
                {entries.map((entry, i) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`song-diary-thumb${i === selected ? ' selected' : ''}`}
                    onClick={() => setSelected(i)}
                    title={`${entry.title} — ${entry.artist} (${formatDate(entry.date)})`}
                  >
                    <img src={entry.thumbnailUrl} alt={entry.title} loading="lazy" />
                  </button>
                ))}
              </div>
              <div className="song-diary-scroll-hint">
                <span>{formatDate(entries[0].date)}</span>
                <span>← scroll timeline →</span>
                <span>{formatDate(entries[entries.length - 1].date)}</span>
              </div>
            </div>
          </>
        )}

        {DIARY_WRITE_ENABLED && (
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
                <input
                  type="password"
                  placeholder="passphrase"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="comment-input"
                />
                {formError && <p className="comment-form-error">{formError}</p>}
                <button type="submit" className="btn-pill dark" disabled={saving} style={{ border: 'none' }}>
                  {saving ? 'saving…' : 'add to diary'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
