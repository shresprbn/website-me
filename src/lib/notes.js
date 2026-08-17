import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const NOTES_ENABLED = Boolean(supabase)
export const NOTES_WRITE_ENABLED = Boolean(API_BASE_URL)

export const NOTES_PAGE_SIZE = 8

export async function fetchNotesPage(page = 0, pageSize = NOTES_PAGE_SIZE) {
  if (!supabase) return { notes: [], total: 0 }
  const from = page * pageSize
  const to = from + pageSize - 1
  const { data, error, count } = await supabase
    .from('sticky_notes')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) throw error
  return { notes: data || [], total: count || 0 }
}

export async function addNote({ body, authorName }) {
  if (!API_BASE_URL) throw new Error('Notes are not configured.')
  const res = await fetch(`${API_BASE_URL}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, authorName }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Could not save note (${res.status})`)
  }
  return res.json()
}

export async function deleteNote(id, passphrase) {
  if (!API_BASE_URL) throw new Error('Notes are not configured.')
  const res = await fetch(`${API_BASE_URL}/notes/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passphrase }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Could not delete note (${res.status})`)
  }
  return res.json()
}
