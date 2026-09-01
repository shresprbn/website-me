import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { saveCreation, SAVE_ENABLED } from '../lib/gallery'
import { useModal } from './ModalProvider'

export default function SaveToGallery({ kind, getData, getThumbnailBlob, hasContent }) {
  const { alertUser, copyLink: copyLinkModal } = useModal()
  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState(null)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (modalOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 10)
      return () => clearTimeout(t)
    }
  }, [modalOpen])

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen])

  if (!SAVE_ENABLED) return null

  const openModal = async () => {
    if (!hasContent()) {
      await alertUser('Nothing to save yet — make something first.')
      return
    }
    setError('')
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
    setError('')
  }

  const shareUrl = savedId ? `${window.location.origin}/gallery/${savedId}` : ''

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      await copyLinkModal(shareUrl)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const thumbnailBlob = getThumbnailBlob ? await getThumbnailBlob() : null
      const result = await saveCreation({
        kind,
        data: getData(),
        thumbnailBlob,
        title: title.trim(),
        creatorName: name.trim(),
      })
      setSavedId(result.id)
      setCopied(false)
      setModalOpen(false)
    } catch (err) {
      setError(err.message || 'Save failed — try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="save-to-gallery">
      <button
        type="button"
        className="btn-pill pink"
        style={{ padding: '11px 22px', fontSize: 13, border: 'none' }}
        onClick={openModal}
      >
        save to gallery ↑
      </button>
      {savedId && (
        <div className="save-share-box" role="status">
          <span className="save-share-label">saved!</span>
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="save-share-input"
            onFocus={(e) => e.target.select()}
          />
          <button type="button" className="btn-pill dark" style={{ padding: '9px 16px', fontSize: 12, border: 'none' }} onClick={copyLink}>
            {copied ? 'copied ✓' : 'copy link'}
          </button>
          <Link to={`/gallery/${savedId}`} className="save-share-view">
            view it →
          </Link>
        </div>
      )}

      {modalOpen && (
        <div className="save-modal-overlay" onClick={closeModal}>
          <div
            className="save-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Save to gallery"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="save-modal-label">// SAVE TO GALLERY</div>
            <p className="save-modal-copy">This gets posted publicly. Give it a title and add your name if you want credit — both optional.</p>
            <div className="save-modal-fields">
              <input
                ref={inputRef}
                type="text"
                placeholder="title (optional, e.g. Sunset Pixels)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                }}
                className="save-modal-input"
                maxLength={80}
              />
              <input
                type="text"
                placeholder="your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                }}
                className="save-modal-input"
                maxLength={60}
              />
            </div>
            {error && <p className="save-to-gallery-error" role="alert">{error}</p>}
            <div className="save-modal-actions">
              <button type="button" className="save-modal-cancel" onClick={closeModal} disabled={saving}>
                cancel
              </button>
              <button
                type="button"
                className="btn-pill pink"
                style={{ padding: '10px 20px', fontSize: 13, border: 'none' }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'saving…' : 'save ↑'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
