import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const SCORES_ENABLED = Boolean(API_BASE_URL)
export const LEADERBOARD_ENABLED = Boolean(supabase)

// Starts a server-clocked session before the game begins. The worker records
// its own start timestamp — the score submitted later gets checked against
// how much real time actually elapsed since this call, so a raw inflated
// score can't just be POSTed without ever having played that long.
export async function startSession() {
  if (!API_BASE_URL) throw new Error('Not configured.')
  const res = await fetch(`${API_BASE_URL}/word-zap/session`, { method: 'POST' })
  if (!res.ok) throw new Error(`Could not start session (${res.status})`)
  return res.json()
}

export async function submitScore({ sessionId, score, playerName }) {
  if (!API_BASE_URL) throw new Error('Not configured.')
  const res = await fetch(`${API_BASE_URL}/word-zap/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, score, playerName }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Could not save score (${res.status})`)
  }
  return res.json()
}

export async function fetchTopScores(limit = 10) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('word_zap_scores')
    .select('*')
    .order('score', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
