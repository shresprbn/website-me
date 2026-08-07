import { useState } from 'react'
import { Link } from 'react-router-dom'
import { saveCreation, SAVE_ENABLED } from '../lib/gallery'

export default function SaveToGallery({ kind, getData, getThumbnailBlob, hasContent }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState(null)

  if (!SAVE_ENABLED) return null

  const handleSave = async () => {
    if (!hasContent()) {
      window.alert('Nothing to save yet — make something first.')
      return
    }
    setSaving(true)
    setError('')
    setSavedId(null)
    try {
      const thumbnailBlob = getThumbnailBlob ? await getThumbnailBlob() : null
      const result = await saveCreation({
        kind,
        data: getData(),
        thumbnailBlob,
        creatorName: name.trim(),
      })
      setSavedId(result.id)
    } catch (err) {
      setError(err.message || 'Save failed — try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="save-to-gallery">
      <input
        type="text"
        placeholder="your name (optional, shown on the gallery)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="save-to-gallery-name"
        maxLength={60}
      />
      <button
        type="button"
        className="btn-pill pink"
        style={{ padding: '11px 22px', fontSize: 13, border: 'none' }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'saving…' : 'save to gallery ↑'}
      </button>
      {error && <span className="save-to-gallery-error">{error}</span>}
      {savedId && (
        <span className="save-to-gallery-link">
          saved! <Link to={`/gallery/${savedId}`}>view &amp; share →</Link>
        </span>
      )}
    </div>
  )
}
