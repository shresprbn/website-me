// Light client-side checks for the public notes wall. These are *feedback*
// helpers only — fast "hey, maybe not" nudges so an obviously-bad note doesn't
// round-trip to the server. The server stays the real gate.

// Deliberately short and conservative: strong profanity + the worst slurs, not
// mild swears. Tune the list here, not in the page.
const BLOCKLIST = [
  'fuck', 'shit', 'bitch', 'cunt', 'asshole', 'dickhead', 'motherfucker',
  'nigger', 'nigga', 'faggot', 'retard', 'kike', 'spic', 'chink', 'tranny',
]

// Fold common letter/number swaps so "sh1t" / "f u c k" style dodges still trip.
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/0/g, 'o')
    .replace(/[4@]/g, 'a')
    .replace(/5\$/g, 's')
    .replace(/\$/g, 's')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
}

// Returns a short reason string, or null when the text looks fine.
export function flagNote(text) {
  const norm = normalize(text || '')
  // Collapse only runs of single letters ("f u c k" -> "fuck") so the
  // spaced-out dodge trips without turning "Scunthorpe" into a false positive.
  const despaced = norm.replace(/\b\w(?:\s+\w\b)+/g, (m) => m.replace(/\s+/g, ''))
  for (const word of BLOCKLIST) {
    const boundary = new RegExp(`\\b${word}\\b`)
    if (boundary.test(norm) || boundary.test(despaced)) {
      return "Let's keep it friendly — mind the language."
    }
  }
  return null
}

// ── Client-side rate limit ───────────────────────────────────────────
// Backed by localStorage so a refresh doesn't hand out a fresh allowance.
const RATE_KEY = 'sticky-notes-last-post'
export const POST_COOLDOWN_MS = 20_000

export function postCooldownLeft() {
  try {
    const last = Number(localStorage.getItem(RATE_KEY) || 0)
    if (!last) return 0
    return Math.max(0, POST_COOLDOWN_MS - (Date.now() - last))
  } catch {
    return 0
  }
}

export function markPosted() {
  try {
    localStorage.setItem(RATE_KEY, String(Date.now()))
  } catch {
    // ignore — rate limiting is a nicety
  }
}
