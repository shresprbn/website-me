import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const GALLERY_ENABLED = Boolean(supabase)
export const SAVE_ENABLED = Boolean(API_BASE_URL)

export async function saveCreation({ kind, data, thumbnailBlob, title, creatorName }) {
  if (!API_BASE_URL) throw new Error('Save is not configured.')

  const form = new FormData()
  form.set('kind', kind)
  form.set('data', JSON.stringify(data))
  if (title) form.set('title', title)
  if (creatorName) form.set('creatorName', creatorName)
  if (thumbnailBlob) form.set('thumbnail', thumbnailBlob, 'thumbnail.png')

  const res = await fetch(`${API_BASE_URL}/creations`, { method: 'POST', body: form })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Save failed (${res.status})`)
  }
  return res.json()
}

export const GALLERY_PAGE_SIZE = 24

// One page of creations, newest first. `total` is the full count for that
// filter, so the caller knows when it has reached the end (infinite scroll).
export async function fetchCreationsPage(kind, page = 0, pageSize = GALLERY_PAGE_SIZE) {
  if (!supabase) return { creations: [], total: 0 }
  const from = page * pageSize
  const to = from + pageSize - 1
  let query = supabase
    .from('creations')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)
  if (kind) query = query.eq('kind', kind)

  const { data, error, count } = await query
  if (error) throw error
  return { creations: data || [], total: count || 0 }
}

export async function deleteCreation(id, passphrase) {
  if (!API_BASE_URL) throw new Error('Not configured.')
  const res = await fetch(`${API_BASE_URL}/creations/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passphrase }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Could not delete (${res.status})`)
  }
  return res.json()
}
