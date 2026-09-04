import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const DIARY_READ_ENABLED = Boolean(supabase)
export const DIARY_WRITE_ENABLED = Boolean(API_BASE_URL)

export async function fetchDiaryEntries() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('song_diary')
    .select('id, date, track_id, title, artist, thumbnail_url')
    .order('date', { ascending: true })
  if (error) throw error
  return data.map((row) => ({
    id: row.id,
    date: row.date,
    trackId: row.track_id,
    title: row.title,
    artist: row.artist,
    thumbnailUrl: row.thumbnail_url,
  }))
}

export async function addDiaryEntry({ trackUrl, artist, date, passphrase }) {
  if (!API_BASE_URL) throw new Error('Adding songs is not configured.')

  const res = await fetch(`${API_BASE_URL}/song-diary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackUrl, artist, date, passphrase }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Save failed (${res.status})`)
  }
  const row = await res.json()
  return {
    id: row.id,
    date: row.date,
    trackId: row.track_id,
    title: row.title,
    artist: row.artist,
    thumbnailUrl: row.thumbnail_url,
  }
}
