import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const GIFTS_ENABLED = Boolean(API_BASE_URL)
export const GIFT_VIEW_ENABLED = Boolean(supabase)

export const GIFT_THEMES = [
  { id: 'kraft', label: 'kraft paper', bg: '#e8ddc8', accent: '#b5763f' },
  { id: 'blush', label: 'blush', bg: '#f7dde2', accent: '#e0708a' },
  { id: 'mint', label: 'mint', bg: '#dcefe6', accent: '#4a9c7d' },
  { id: 'midnight', label: 'midnight', bg: '#242138', accent: '#8f7cf0' },
]

export function parseSpotifyUrl(raw) {
  try {
    const u = new URL(String(raw || '').trim())
    if (!/(^|\.)open\.spotify\.com$/.test(u.hostname)) return null
    const m = u.pathname.match(/\/(track|album|playlist|episode)\/([A-Za-z0-9]+)/)
    if (!m) return null
    return { embedType: m[1], embedId: m[2] }
  } catch {
    return null
  }
}

export function parseYoutubeUrl(raw) {
  try {
    const u = new URL(String(raw || '').trim())
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1)
      return id ? { videoId: id } : null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') {
        const id = u.searchParams.get('v')
        return id ? { videoId: id } : null
      }
      const m = u.pathname.match(/\/(embed|shorts)\/([A-Za-z0-9_-]+)/)
      if (m) return { videoId: m[2] }
    }
    return null
  } catch {
    return null
  }
}

export async function saveGift(payload) {
  if (!API_BASE_URL) throw new Error('Gift package is not configured.')

  const res = await fetch(`${API_BASE_URL}/gifts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Save failed (${res.status})`)
  }
  return res.json()
}

export async function fetchGift(id) {
  if (!supabase) throw new Error('Not configured')
  const { data, error } = await supabase.from('gifts').select('*').eq('id', id).single()
  if (error) throw error
  return data
}
