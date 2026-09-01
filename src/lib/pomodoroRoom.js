import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const ROOMS_ENABLED = Boolean(API_BASE_URL) && Boolean(supabase)

const NAME_KEY = 'pomodoro-display-name'
// sessionStorage (not localStorage) on purpose — each tab counts as its own
// presence entry, which matches what you'd actually see if you opened the
// same room in two windows.
const CLIENT_ID_KEY = 'pomodoro-client-id'

// The room the visitor was last in, so /pomodoro can offer "rejoin".
export const LAST_ROOM_KEY = 'pomodoro-last-room'
export function rememberRoom(roomId) {
  try {
    localStorage.setItem(LAST_ROOM_KEY, roomId)
  } catch {
    // ignore
  }
}

const AVATAR_COLORS = ['#ff6b9d', '#4ecdc4', '#f2b705', '#5b8def', '#9b6bff', '#ff8a5c']

export async function createRoom({ workMinutes, breakMinutes } = {}) {
  if (!API_BASE_URL) throw new Error('Not configured.')
  const res = await fetch(`${API_BASE_URL}/pomodoro/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workMinutes, breakMinutes }),
  })
  if (!res.ok) throw new Error(`Could not create room (${res.status})`)
  return res.json()
}

export async function dispatchRoomAction(roomId, action, value) {
  if (!API_BASE_URL) throw new Error('Not configured.')
  const res = await fetch(`${API_BASE_URL}/pomodoro/rooms/${roomId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, value }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Action failed (${res.status})`)
  }
  return res.json()
}

export async function fetchRoom(roomId) {
  if (!supabase) return null
  const { data, error } = await supabase.from('pomodoro_rooms').select('*').eq('id', roomId).single()
  if (error) throw error
  return data
}

// Live updates to the room row — every client just re-renders from whatever
// comes through here, no local ticking of shared state involved.
export function subscribeToRoom(roomId, onChange) {
  if (!supabase) return () => {}
  const channel = supabase
    .channel(`pomodoro-room-${roomId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'pomodoro_rooms', filter: `id=eq.${roomId}` },
      (payload) => onChange(payload.new),
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}

// The row stores an absolute end time, not a countdown — every client
// derives its own displayed secondsLeft from it, so clock drift between
// tabs/devices can't desync the numbers by more than a second or so.
export function computeSecondsLeft(room) {
  if (!room) return 0
  if (room.running && room.phase_ends_at) {
    const ms = new Date(room.phase_ends_at).getTime() - Date.now()
    return Math.max(0, Math.ceil(ms / 1000))
  }
  const fallback = (room.phase === 'work' ? room.work_minutes : room.break_minutes) * 60
  return room.paused_remaining_seconds ?? fallback
}

export function getDisplayName() {
  return localStorage.getItem(NAME_KEY) || ''
}

export function setDisplayName(name) {
  localStorage.setItem(NAME_KEY, name)
}

export function getClientId() {
  let id = sessionStorage.getItem(CLIENT_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(CLIENT_ID_KEY, id)
  }
  return id
}

export function colorForName(name) {
  const str = String(name || '?')
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function initialsForName(name) {
  const trimmed = String(name || '').trim()
  return trimmed ? trimmed[0].toUpperCase() : '?'
}

// Who's here right now — a plain Realtime presence channel, no database
// table involved, so nobody lingers after they close the tab.
export function joinPresence(roomId, member, onSync) {
  if (!supabase) return () => {}
  const channel = supabase.channel(`pomodoro-presence-${roomId}`, {
    config: { presence: { key: member.clientId } },
  })
  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    const members = Object.values(state).map((entries) => entries[0])
    onSync(members)
  })
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') channel.track(member)
  })
  return () => supabase.removeChannel(channel)
}
