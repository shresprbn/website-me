import { useEffect, useRef } from 'react'

// The post-crash "save your run" dialog. Garbage Run and Word Zap had this
// duplicated almost verbatim; the only real difference was Garbage Run's dino
// easter-egg hint, which now comes in as children.
export default function SaveScoreModal({
  score,
  playerName,
  onNameChange,
  onSubmit,
  onClose,
  onPlayAgain,
  submitStatus,
  sessionReady,
  children,
}) {
  const inputRef = useRef(null)
  const saving = submitStatus === 'saving'

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 10)
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="save-modal-overlay" onClick={onClose}>
      <div
        className="save-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Save score"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="save-modal-label">// SAVE SCORE</div>
        <p className="save-modal-copy">
          score {score}. Add your name if you want credit on the leaderboard — or leave it blank.
        </p>

        {children}

        <input
          ref={inputRef}
          type="text"
          placeholder="your name (optional)"
          value={playerName}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit()
          }}
          className="save-modal-input"
          maxLength={30}
        />
        {submitStatus === 'error' && (
          <p className="save-to-gallery-error" role="alert">
            couldn&apos;t save that run — try again
          </p>
        )}

        <div className="save-modal-actions">
          <button
            type="button"
            className="save-modal-cancel"
            onClick={onClose}
            disabled={saving}
          >
            cancel
          </button>
          <button
            type="button"
            className="btn-pill dark"
            style={{ padding: '10px 20px', fontSize: 13, border: 'none' }}
            onClick={onPlayAgain}
            disabled={saving}
          >
            play again ↻
          </button>
          <button
            type="button"
            className="btn-pill pink"
            style={{ padding: '10px 20px', fontSize: 13, border: 'none' }}
            onClick={onSubmit}
            disabled={saving || !sessionReady}
          >
            {saving ? 'saving…' : sessionReady ? 'save ↑' : 'connecting…'}
          </button>
        </div>
      </div>
    </div>
  )
}
