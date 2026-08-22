import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// Site-wide replacement for window.confirm/alert/prompt. Those default
// browser dialogs can't be styled and look completely out of place next to
// the rest of the site, so every page should go through here instead —
// same visual language as the save-to-gallery modal (.save-modal-*).
const ModalContext = createContext(null)

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null)
  const resolverRef = useRef(null)
  const inputRef = useRef(null)
  const confirmBtnRef = useRef(null)
  const [copied, setCopied] = useState(false)

  const openModal = useCallback((config) => (
    new Promise((resolve) => {
      resolverRef.current = resolve
      setCopied(false)
      setModal(config)
    })
  ), [])

  const close = useCallback((result) => {
    setModal(null)
    const resolve = resolverRef.current
    resolverRef.current = null
    if (resolve) resolve(result)
  }, [])

  // confirmAction(message, { title, confirmLabel, cancelLabel, danger }) -> Promise<boolean>
  const confirmAction = useCallback((message, opts = {}) => (
    openModal({ type: 'confirm', message, ...opts })
  ), [openModal])

  // alertUser(message, { title }) -> Promise<void>
  const alertUser = useCallback((message, opts = {}) => (
    openModal({ type: 'alert', message, ...opts })
  ), [openModal])

  // copyLink(url, { message, title }) -> Promise<void>
  const copyLink = useCallback((url, opts = {}) => (
    openModal({ type: 'copy', url, ...opts })
  ), [openModal])

  useEffect(() => {
    if (!modal) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        close(modal.type === 'confirm' ? false : undefined)
      } else if (e.key === 'Enter' && modal.type !== 'copy') {
        close(modal.type === 'confirm' ? true : undefined)
      }
    }
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => {
      ;(modal.type === 'confirm' ? confirmBtnRef.current : inputRef.current)?.focus()
    }, 10)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal])

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(modal.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      inputRef.current?.select()
    }
  }

  const defaultTitle = modal
    ? modal.title || (modal.type === 'confirm' ? 'are you sure' : modal.type === 'copy' ? 'share link' : 'heads up')
    : ''

  return (
    <ModalContext.Provider value={{ confirmAction, alertUser, copyLink }}>
      {children}
      {modal && (
        <div
          className="save-modal-overlay"
          onClick={() => close(modal.type === 'confirm' ? false : undefined)}
        >
          <div
            className="save-modal"
            role="dialog"
            aria-modal="true"
            aria-label={defaultTitle}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="save-modal-label">// {defaultTitle.toUpperCase()}</div>
            <p className="save-modal-copy">{modal.message}</p>

            {modal.type === 'copy' && (
              <div className="save-modal-fields">
                <input
                  ref={inputRef}
                  type="text"
                  readOnly
                  value={modal.url}
                  className="save-modal-input"
                  onFocus={(e) => e.target.select()}
                />
              </div>
            )}

            <div className="save-modal-actions">
              {modal.type === 'confirm' && (
                <>
                  <button type="button" className="save-modal-cancel" onClick={() => close(false)}>
                    {modal.cancelLabel || 'cancel'}
                  </button>
                  <button
                    ref={confirmBtnRef}
                    type="button"
                    className={`btn-pill ${modal.danger ? 'danger' : 'pink'}`}
                    style={{ padding: '10px 20px', fontSize: 13, border: 'none' }}
                    onClick={() => close(true)}
                  >
                    {modal.confirmLabel || 'yes ↑'}
                  </button>
                </>
              )}

              {modal.type === 'alert' && (
                <button
                  ref={confirmBtnRef}
                  type="button"
                  className="btn-pill dark"
                  style={{ padding: '10px 20px', fontSize: 13, border: 'none' }}
                  onClick={() => close()}
                >
                  ok
                </button>
              )}

              {modal.type === 'copy' && (
                <button
                  type="button"
                  className="btn-pill pink"
                  style={{ padding: '10px 20px', fontSize: 13, border: 'none' }}
                  onClick={doCopy}
                >
                  {copied ? 'copied ✓' : 'copy link'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be used within a ModalProvider')
  return ctx
}
