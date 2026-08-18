import { useCallback, useEffect, useRef, useState } from 'react'
import Nav from '../components/Nav'
import { NOTES_ENABLED, NOTES_PAGE_SIZE, addNote, deleteNote, fetchNotesPage } from '../lib/notes'
import { DEBUG_PASSPHRASE, useDebugMode } from '../hooks/useDebugMode'

const NOTE_COLORS = ['#ffe28a', '#ffc2d1', '#b9e8d8', '#b8dcf2', '#d9c9f5', '#ffcfa3']
const MAX_BODY = 180

function hashStr(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function noteColor(id) {
  return NOTE_COLORS[hashStr(id) % NOTE_COLORS.length]
}

function noteRotation(id) {
  return (hashStr(`${id}r`) % 13) - 6
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function StickyNotes() {
  const [page, setPage] = useState(0)
  const [notes, setNotes] = useState([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('loading')

  const [modalOpen, setModalOpen] = useState(false)
  const [body, setBody] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')
  const textareaRef = useRef(null)

  const { debugMode, flash } = useDebugMode()
  const [removingIds, setRemovingIds] = useState(() => new Set())

  const totalPages = Math.max(1, Math.ceil(total / NOTES_PAGE_SIZE))

  const load = useCallback((p) => {
    if (!NOTES_ENABLED) {
      setStatus('unconfigured')
      return
    }
    setStatus('loading')
    fetchNotesPage(p)
      .then(({ notes: rows, total: t }) => {
        setNotes(rows)
        setTotal(t)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  useEffect(() => {
    load(page)
  }, [page, load])

  const openModal = () => {
    setPostError('')
    setModalOpen(true)
    setTimeout(() => textareaRef.current?.focus(), 10)
  }
  const closeModal = () => {
    if (posting) return
    setModalOpen(false)
  }

  const submitNote = async () => {
    const trimmed = body.trim()
    if (!trimmed) return
    setPosting(true)
    setPostError('')
    try {
      await addNote({ body: trimmed.slice(0, MAX_BODY), authorName: authorName.trim() })
      setBody('')
      setAuthorName('')
      setModalOpen(false)
      if (page === 0) load(0)
      else setPage(0)
    } catch (err) {
      setPostError(err.message || 'Could not post — try again.')
    } finally {
      setPosting(false)
    }
  }

  const removeNote = async (id) => {
    setRemovingIds((prev) => new Set(prev).add(id))
    setTimeout(async () => {
      try {
        await deleteNote(id, DEBUG_PASSPHRASE)
        setNotes((prev) => prev.filter((n) => n.id !== id))
        setTotal((t) => Math.max(0, t - 1))
      } catch (err) {
        window.alert(err.message || 'Could not delete note.')
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
      <div className={`container notes-wall-page${flash ? ' notes-page--flash' : ''}`}>
        <div className="playground-header">
          <div className="playground-eyebrow">// LEAVE A NOTE</div>
          <h1 className="playground-title">Stick something to the wall.</h1>
          <p className="playground-lede">Say hi, leave a thought, sign your name. Public — be nice.</p>
        </div>

        <div className="notes-wall-toolbar">
          <button type="button" className="btn-pill pink" style={{ border: 'none', padding: '11px 22px', fontSize: 13 }} onClick={openModal}>
            + leave a note
          </button>
          {total > 0 && <span className="notes-wall-count">{total} note{total === 1 ? '' : 's'} on the wall</span>}
        </div>

        {status === 'unconfigured' && <p className="gallery-empty">Notes aren't configured on this build.</p>}
        {status === 'error' && <p className="gallery-empty">Couldn't load the wall — try again in a bit.</p>}
        {status === 'loading' && <p className="gallery-empty">loading…</p>}
        {status === 'ready' && notes.length === 0 && <p className="gallery-empty">Nothing here yet — be the first to stick one up.</p>}

        {status === 'ready' && notes.length > 0 && (
          <>
            <div className="notes-wall-grid">
              {notes.map((n) => (
                <div
                  key={n.id}
                  className={`sticky-note${removingIds.has(n.id) ? ' sticky-note--removing' : ''}`}
                  style={{ background: noteColor(n.id), transform: `rotate(${noteRotation(n.id)}deg)` }}
                >
                  <span className="sticky-note-pin" />
                  {debugMode && (
                    <button type="button" className="sticky-note-delete" onClick={() => removeNote(n.id)} title="delete note">
                      ×
                    </button>
                  )}
                  <p className="sticky-note-body">{n.body}</p>
                  <div className="sticky-note-meta">
                    {n.author_name ? `— ${n.author_name}` : ''} <span className="sticky-note-date">{formatDate(n.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="notes-wall-pagination">
                <button type="button" className="notes-page-btn" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  ← newer
                </button>
                <span className="notes-page-label">page {page + 1} of {totalPages}</span>
                <button
                  type="button"
                  className="notes-page-btn"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  older →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {debugMode && (
        <div className="notes-debug-badge">
          <span>🐛 debug mode</span>
          <span className="notes-debug-hint">click × on a note to delete it · type "{DEBUG_PASSPHRASE}" again to exit</span>
        </div>
      )}

      {flash && <div className="notes-debug-flash-overlay">// DEBUG MODE {debugMode ? 'ENABLED' : 'DISABLED'}</div>}

      {modalOpen && (
        <div className="save-modal-overlay" onClick={closeModal}>
          <div className="save-modal" role="dialog" aria-modal="true" aria-label="Leave a note" onClick={(e) => e.stopPropagation()}>
            <div className="save-modal-label">// LEAVE A NOTE</div>
            <p className="save-modal-copy">Short and sweet — this goes up on the public wall.</p>
            <div className="save-modal-fields">
              <textarea
                ref={textareaRef}
                placeholder="write something…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="save-modal-input"
                style={{ borderRadius: 10, resize: 'vertical', fontFamily: "'Space Mono', monospace" }}
                rows={3}
                maxLength={MAX_BODY}
              />
              <div className="notes-modal-counter">{MAX_BODY - body.length} left</div>
              <input
                type="text"
                placeholder="your name (optional)"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitNote()
                }}
                className="save-modal-input"
                maxLength={30}
              />
            </div>
            {postError && <p className="save-to-gallery-error">{postError}</p>}
            <div className="save-modal-actions">
              <button type="button" className="save-modal-cancel" onClick={closeModal} disabled={posting}>
                cancel
              </button>
              <button
                type="button"
                className="btn-pill pink"
                style={{ padding: '10px 20px', fontSize: 13, border: 'none' }}
                onClick={submitNote}
                disabled={posting || !body.trim()}
              >
                {posting ? 'posting…' : 'stick it up ↑'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
