import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav'
import { GIFT_THEMES, GIFTS_ENABLED, parseSpotifyUrl, parseYoutubeUrl, saveGift } from '../lib/gifts'
import { useModal } from '../components/ModalProvider'

const MAX_NOTES = 6
const MAX_SONGS = 8
const MAX_LINKS = 6
const MAX_STICKERS = 40

const STICKER_PALETTE = [
  '🌸', '🌷', '🌼', '🌻', '🌹', '💐', '🍀', '🌵',
  '🧸', '🪀', '🎈', '🎁', '🪁', '🧩', '🚂', '🦄',
  '🎠', '🪅', '🍭', '🍬', '🎨', '✨', '⭐', '🌙',
]

let uid = 0
const nextId = () => `g${Date.now()}-${uid++}`

const fieldStyle = {
  fontFamily: "'Space Mono', monospace",
  fontSize: 13,
  border: '1px solid #e0dbd0',
  borderRadius: 6,
  padding: '10px 12px',
  background: '#fff',
  color: '#141414',
}

const smallAddBtn = {
  background: '#141414',
  color: '#fff',
  border: 'none',
  borderRadius: 40,
  padding: '10px 18px',
  fontFamily: "'Space Mono', monospace",
  fontSize: 12,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

function SectionLabel({ children, count, max }) {
  return (
    <div className="gift-section-label">
      <span>{children}</span>
      {max != null && (
        <span className="gift-section-count">
          {count}/{max}
        </span>
      )}
    </div>
  )
}

export default function GiftMaker() {
  const { alertUser, copyLink: copyLinkModal } = useModal()
  const [title, setTitle] = useState('')
  const [toName, setToName] = useState('')
  const [fromName, setFromName] = useState('')
  const [theme, setTheme] = useState('kraft')

  const [noteDraft, setNoteDraft] = useState('')
  const [notes, setNotes] = useState([])

  const [songTitle, setSongTitle] = useState('')
  const [songArtist, setSongArtist] = useState('')
  const [songUrl, setSongUrl] = useState('')
  const [songs, setSongs] = useState([])

  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [links, setLinks] = useState([])

  const [stickers, setStickers] = useState([])
  const boardRef = useRef(null)
  const dragRef = useRef(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(null)
  const [copied, setCopied] = useState(false)

  const activeTheme = GIFT_THEMES.find((t) => t.id === theme) || GIFT_THEMES[0]

  const addNote = () => {
    const trimmed = noteDraft.trim()
    if (!trimmed || notes.length >= MAX_NOTES) return
    setNotes((prev) => [...prev, { id: nextId(), text: trimmed.slice(0, 500) }])
    setNoteDraft('')
  }
  const removeNote = (id) => setNotes((prev) => prev.filter((n) => n.id !== id))

  const addSong = () => {
    const t = songTitle.trim()
    if (!t || songs.length >= MAX_SONGS) return
    const parsed = songUrl.trim() ? parseSpotifyUrl(songUrl.trim()) : null
    setSongs((prev) => [
      ...prev,
      {
        id: nextId(),
        title: t.slice(0, 100),
        artist: songArtist.trim().slice(0, 100),
        url: parsed ? songUrl.trim() : '',
        embedType: parsed?.embedType || null,
        embedId: parsed?.embedId || null,
        urlLooksInvalid: Boolean(songUrl.trim() && !parsed),
      },
    ])
    setSongTitle('')
    setSongArtist('')
    setSongUrl('')
  }
  const removeSong = (id) => setSongs((prev) => prev.filter((s) => s.id !== id))

  const addLink = () => {
    const url = linkUrl.trim()
    const parsed = parseYoutubeUrl(url)
    if (!parsed || links.length >= MAX_LINKS) return
    setLinks((prev) => [
      ...prev,
      { id: nextId(), url, title: linkTitle.trim().slice(0, 100), videoId: parsed.videoId },
    ])
    setLinkUrl('')
    setLinkTitle('')
  }
  const removeLink = (id) => setLinks((prev) => prev.filter((l) => l.id !== id))
  const linkUrlInvalid = Boolean(linkUrl.trim() && !parseYoutubeUrl(linkUrl.trim()))

  const addSticker = (emoji) => {
    if (stickers.length >= MAX_STICKERS) return
    setStickers((prev) => [
      ...prev,
      {
        id: nextId(),
        emoji,
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
        rot: Math.round(Math.random() * 40 - 20),
        scale: 1,
      },
    ])
  }
  const removeSticker = (id) => setStickers((prev) => prev.filter((s) => s.id !== id))

  const stickerPointerDown = (e, id) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = id
  }
  const stickerPointerMove = (e) => {
    const id = dragRef.current
    const board = boardRef.current
    if (!id || !board) return
    const rect = board.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setStickers((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, x: Math.min(96, Math.max(4, x)), y: Math.min(96, Math.max(4, y)) }
          : s,
      ),
    )
  }
  const stickerPointerUp = () => {
    dragRef.current = null
  }

  const hasAnything = notes.length || songs.length || links.length || stickers.length

  const wrapItUp = async () => {
    if (!hasAnything) {
      await alertUser('Add at least one note, song, link, or sticker first.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await saveGift({
        title: title.trim(),
        toName: toName.trim(),
        fromName: fromName.trim(),
        theme,
        notes: notes.map((n) => n.text),
        songs: songs.map(({ title: t, artist, url }) => ({ title: t, artist, url })),
        links: links.map(({ url, title: t }) => ({ url, title: t })),
        stickers: stickers.map(({ emoji, x, y, rot, scale }) => ({ emoji, x, y, rot, scale })),
      })
      setSaved(result)
    } catch (err) {
      setError(err.message || 'Could not save — try again.')
    } finally {
      setSaving(false)
    }
  }

  const shareUrl = saved ? `${window.location.origin}/gift/${saved.id}` : ''

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      await copyLinkModal(shareUrl)
    }
  }

  if (!GIFTS_ENABLED) {
    return (
      <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
        <Nav />
        <div className="container gift-maker-page">
          <div className="playground-header">
            <div className="playground-eyebrow">// GIFT PACKAGE</div>
            <h1 className="playground-title">Wrap something up.</h1>
          </div>
          <p className="gallery-empty">Gift package isn't configured on this build.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />
      <div className="container gift-maker-page">
        <div className="playground-header">
          <div className="playground-eyebrow">// GIFT PACKAGE</div>
          <h1 className="playground-title">Wrap something up.</h1>
          <p className="playground-lede">
            A note, a mixtape, a couple videos, a few stickers. Get a link — send it to someone.
          </p>
        </div>

        {saved ? (
          <div className="gift-share-box">
            <div className="gift-share-label">// IT'S WRAPPED</div>
            <p className="gift-share-copy">Here's the link — send it to them.</p>
            <div className="gift-share-row">
              <input type="text" readOnly value={shareUrl} className="gift-share-input" onFocus={(e) => e.target.select()} />
              <button type="button" className="btn-pill dark" style={{ border: 'none', padding: '11px 20px', fontSize: 13 }} onClick={copyLink}>
                {copied ? 'copied ✓' : 'copy link'}
              </button>
            </div>
            <div className="gift-share-links">
              <Link to={`/gift/${saved.id}`}>preview it →</Link>
              <button
                type="button"
                className="gift-share-reset"
                onClick={() => {
                  setSaved(null)
                }}
              >
                make another
              </button>
            </div>
          </div>
        ) : (
          <>
            <section className="gift-maker-section">
              <SectionLabel>// FOR & FROM</SectionLabel>
              <div className="gift-maker-row">
                <input
                  type="text"
                  placeholder="title (optional, e.g. Happy Birthday)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ ...fieldStyle, flex: '2 1 220px' }}
                  maxLength={80}
                />
                <input
                  type="text"
                  placeholder="to"
                  value={toName}
                  onChange={(e) => setToName(e.target.value)}
                  style={{ ...fieldStyle, flex: '1 1 140px' }}
                  maxLength={60}
                />
                <input
                  type="text"
                  placeholder="from"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  style={{ ...fieldStyle, flex: '1 1 140px' }}
                  maxLength={60}
                />
              </div>
              <div className="gift-theme-swatches">
                {GIFT_THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`gift-theme-swatch${theme === t.id ? ' selected' : ''}`}
                    style={{ background: t.bg, borderColor: t.accent }}
                    title={t.label}
                    onClick={() => setTheme(t.id)}
                  />
                ))}
                <span className="gift-theme-name">{activeTheme.label}</span>
              </div>
            </section>

            <section className="gift-maker-section">
              <SectionLabel count={notes.length} max={MAX_NOTES}>// HANDWRITTEN NOTES</SectionLabel>
              <div className="gift-maker-row">
                <textarea
                  placeholder="write a little note…"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  style={{ ...fieldStyle, flex: 1, resize: 'vertical', fontFamily: "'Space Mono', monospace" }}
                  rows={2}
                  maxLength={500}
                />
                <button type="button" style={smallAddBtn} onClick={addNote} disabled={notes.length >= MAX_NOTES || !noteDraft.trim()}>
                  + add note
                </button>
              </div>
              {notes.length > 0 && (
                <div className="gift-note-pile">
                  {notes.map((n) => (
                    <div key={n.id} className="gift-note-card">
                      <button type="button" className="gift-remove-x" onClick={() => removeNote(n.id)}>×</button>
                      <p className="gift-note-text">{n.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="gift-maker-section">
              <SectionLabel count={songs.length} max={MAX_SONGS}>// MIXTAPE</SectionLabel>
              <div className="gift-maker-row">
                <input
                  type="text"
                  placeholder="song title"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  style={{ ...fieldStyle, flex: '1 1 160px' }}
                  maxLength={100}
                />
                <input
                  type="text"
                  placeholder="artist"
                  value={songArtist}
                  onChange={(e) => setSongArtist(e.target.value)}
                  style={{ ...fieldStyle, flex: '1 1 140px' }}
                  maxLength={100}
                />
                <input
                  type="text"
                  placeholder="spotify link (optional)"
                  value={songUrl}
                  onChange={(e) => setSongUrl(e.target.value)}
                  style={{ ...fieldStyle, flex: '1 1 200px' }}
                  maxLength={300}
                />
                <button type="button" style={smallAddBtn} onClick={addSong} disabled={songs.length >= MAX_SONGS || !songTitle.trim()}>
                  + add track
                </button>
              </div>
              {songUrl.trim() && !parseSpotifyUrl(songUrl.trim()) && (
                <p className="gift-inline-hint">doesn't look like an open.spotify.com link — track will show without a player</p>
              )}

              {songs.length > 0 && (
                <div className="gift-cassette">
                  <div className="gift-cassette-reels">
                    <span className="gift-cassette-reel" />
                    <span className="gift-cassette-reel" />
                  </div>
                  <div className="gift-cassette-label">
                    <div className="gift-cassette-title">{title.trim() || 'a mixtape for you'}</div>
                    <ul className="gift-cassette-tracklist">
                      {songs.map((s, i) => (
                        <li key={s.id}>
                          <span className="gift-cassette-track-num">{String(i + 1).padStart(2, '0')}</span>
                          <span className="gift-cassette-track-name">
                            {s.title}
                            {s.artist ? ` — ${s.artist}` : ''}
                          </span>
                          <button type="button" className="gift-remove-x" onClick={() => removeSong(s.id)}>×</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </section>

            <section className="gift-maker-section">
              <SectionLabel count={links.length} max={MAX_LINKS}>// WATCH TOGETHER</SectionLabel>
              <div className="gift-maker-row">
                <input
                  type="text"
                  placeholder="youtube link"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  style={{ ...fieldStyle, flex: '2 1 220px' }}
                  maxLength={300}
                />
                <input
                  type="text"
                  placeholder="caption (optional)"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  style={{ ...fieldStyle, flex: '1 1 160px' }}
                  maxLength={100}
                />
                <button type="button" style={smallAddBtn} onClick={addLink} disabled={links.length >= MAX_LINKS || !linkUrl.trim() || linkUrlInvalid}>
                  + add video
                </button>
              </div>
              {linkUrlInvalid && <p className="gift-inline-hint">needs to be a youtube.com or youtu.be link</p>}
              {links.length > 0 && (
                <ul className="gift-link-list">
                  {links.map((l) => (
                    <li key={l.id} className="gift-link-item">
                      <img src={`https://img.youtube.com/vi/${l.videoId}/mqdefault.jpg`} alt="" className="gift-link-thumb" />
                      <span className="gift-link-caption">{l.title || l.url}</span>
                      <button type="button" className="gift-remove-x" onClick={() => removeLink(l.id)}>×</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="gift-maker-section">
              <SectionLabel count={stickers.length} max={MAX_STICKERS}>// STICKERS</SectionLabel>
              <p className="gift-inline-hint" style={{ marginTop: 0 }}>tap a sticker to drop it on the board, then drag it wherever.</p>
              <div className="gift-sticker-palette">
                {STICKER_PALETTE.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="gift-sticker-palette-btn"
                    onClick={() => addSticker(emoji)}
                    disabled={stickers.length >= MAX_STICKERS}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div
                ref={boardRef}
                className="gift-board"
                style={{ background: activeTheme.bg }}
                onPointerMove={stickerPointerMove}
                onPointerUp={stickerPointerUp}
              >
                {stickers.length === 0 && <span className="gift-board-empty">the board's empty — add some stickers above</span>}
                {stickers.map((s) => (
                  <div
                    key={s.id}
                    className="gift-sticker"
                    style={{
                      left: `${s.x}%`,
                      top: `${s.y}%`,
                      transform: `translate(-50%, -50%) rotate(${s.rot}deg) scale(${s.scale})`,
                    }}
                    onPointerDown={(e) => stickerPointerDown(e, s.id)}
                  >
                    {s.emoji}
                    <button
                      type="button"
                      className="gift-sticker-remove"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => removeSticker(s.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <div className="gift-maker-footer">
              {error && <p className="comment-form-error">{error}</p>}
              <button type="button" className="btn-pill pink" style={{ border: 'none', padding: '13px 28px', fontSize: 14 }} onClick={wrapItUp} disabled={saving}>
                {saving ? 'wrapping…' : 'wrap it up →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
