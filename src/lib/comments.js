import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const COMMENTS_ENABLED = Boolean(API_BASE_URL)

export async function fetchComments(creationId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('comments')
    .select('id, body, author_name, created_at')
    .eq('creation_id', creationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function postComment({ creationId, body, authorName, authorEmail }) {
  if (!API_BASE_URL) throw new Error('Comments are not configured.')

  const res = await fetch(`${API_BASE_URL}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creationId, body, authorName, authorEmail }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Comment failed (${res.status})`)
  }
  return res.json()
}
