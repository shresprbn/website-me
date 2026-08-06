import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Nav from '../components/Nav'
import { supabase } from '../lib/supabase'
import { fetchComments, postComment, COMMENTS_ENABLED } from '../lib/comments'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function CreationDetail() {
  const { id } = useParams()
  const [creation, setCreation] = useState(null)
  const [status, setStatus] = useState('loading')

  const [comments, setComments] = useState([])
  const [commentsStatus, setCommentsStatus] = useState('loading')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!supabase) {
      setStatus('unconfigured')
      return
    }
    let cancelled = false
    setStatus('loading')
    supabase
      .from('creations')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          setStatus('error')
          return
        }
        setCreation(data)
        setStatus('ready')
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const loadComments = () => {
    setCommentsStatus('loading')
    fetchComments(id)
      .then((rows) => {
        setComments(rows)
        setCommentsStatus('ready')
      })
      .catch(() => setCommentsStatus('error'))
  }

  useEffect(() => {
    loadComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const submitComment = async (e) => {
    e.preventDefault()
    setFormError('')

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedBody = body.trim()

    if (!trimmedName) {
      setFormError('Name is required.')
      return
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setFormError('A valid email is required.')
      return
    }
    if (!trimmedBody) {
      setFormError('Comment cannot be empty.')
      return
    }
    if (trimmedBody.length > 500) {
      setFormError('Comment must be 500 characters or fewer.')
      return
    }

    setSubmitting(true)
    try {
      await postComment({
        creationId: id,
        body: trimmedBody,
        authorName: trimmedName,
        authorEmail: trimmedEmail,
      })
      setBody('')
      loadComments()
    } catch (err) {
      setFormError(err.message || 'Could not post comment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />
      <div className="container gallery-page">
        <Link to="/gallery" className="gallery-back-link">
          ← back to gallery
        </Link>

        {status === 'loading' && <p className="gallery-empty">loading…</p>}
        {status === 'unconfigured' && <p className="gallery-empty">Gallery isn't configured on this build.</p>}
        {status === 'error' && <p className="gallery-empty">Couldn't find that creation.</p>}

        {status === 'ready' && creation && (
          <>
            <div className="playground-header">
              <div className="playground-eyebrow">// {creation.kind.toUpperCase()}</div>
              <h1 className="playground-title">{creation.title || 'Untitled'}</h1>
              <p className="playground-lede">saved {formatDate(creation.created_at)}</p>
            </div>

            <div className="creation-detail-thumb">
              {creation.thumbnail_url ? (
                <img src={creation.thumbnail_url} alt={creation.title || creation.kind} />
              ) : (
                <div className="gallery-card-fallback">{creation.kind}</div>
              )}
            </div>

            <section className="comments-section">
              <div className="playground-eyebrow">// COMMENTS</div>

              {commentsStatus === 'loading' && <p className="gallery-empty">loading comments…</p>}
              {commentsStatus === 'error' && <p className="gallery-empty">Couldn't load comments.</p>}
              {commentsStatus === 'ready' && comments.length === 0 && (
                <p className="gallery-empty">No comments yet — be the first.</p>
              )}
              {commentsStatus === 'ready' && comments.length > 0 && (
                <ul className="comment-list">
                  {comments.map((c) => (
                    <li key={c.id} className="comment-item">
                      <div className="comment-meta">
                        <span className="comment-author">{c.author_name}</span>
                        <span className="comment-date">{formatDate(c.created_at)}</span>
                      </div>
                      <p className="comment-body">{c.body}</p>
                    </li>
                  ))}
                </ul>
              )}

              {COMMENTS_ENABLED ? (
                <form className="comment-form" onSubmit={submitComment}>
                  <div className="comment-form-row">
                    <input
                      type="text"
                      placeholder="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="comment-input"
                      maxLength={60}
                    />
                    <input
                      type="email"
                      placeholder="email (not shown publicly)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="comment-input"
                      maxLength={120}
                    />
                  </div>
                  <textarea
                    placeholder="say something…"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="comment-textarea"
                    maxLength={500}
                    rows={3}
                  />
                  {formError && <p className="comment-form-error">{formError}</p>}
                  <button type="submit" className="btn-pill dark" disabled={submitting} style={{ border: 'none' }}>
                    {submitting ? 'posting…' : 'post comment'}
                  </button>
                </form>
              ) : (
                <p className="gallery-empty">Comments aren't configured on this build.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
