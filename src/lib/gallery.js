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

export async function fetchCreations(kind, limit = 60) {
  if (!supabase) return []
  let query = supabase
    .from('creations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (kind) query = query.eq('kind', kind)

  const { data, error } = await query
  if (error) throw error
  return data
}
