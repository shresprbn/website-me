import { WORD_BANK } from './wordZapWords'

// Longer words are worth more but should show up far less often — these
// tiers are keyed by max length, each with a spawn weight. Bucketed once
// from the real word lengths so the comments in wordZapWords.js never have
// to be kept in sync by hand.
const LENGTH_TIERS = [
  { max: 4, weight: 42 },
  { max: 6, weight: 30 },
  { max: 8, weight: 18 },
  { max: Infinity, weight: 10 },
]

function buildBuckets() {
  const buckets = LENGTH_TIERS.map(() => [])
  for (const word of WORD_BANK) {
    const tierIndex = LENGTH_TIERS.findIndex((t) => word.length <= t.max)
    buckets[Math.max(0, tierIndex)].push(word)
  }
  return buckets
}

const BUCKETS = buildBuckets()
const TOTAL_WEIGHT = LENGTH_TIERS.reduce((sum, t) => sum + t.weight, 0)

// Points scale directly with word length — this also keeps the server-side
// plausibility check simple, since total score is just total characters
// typed times POINTS_PER_CHAR (see the Worker's /word-zap/score handler,
// which must mirror this constant).
export const POINTS_PER_CHAR = 10
export function pointsForWord(word) {
  return word.length * POINTS_PER_CHAR
}

// Picks a random word, weighted toward shorter tiers, skipping anything
// already falling on screen so you don't see the same word twice at once.
export function pickWeightedWord(excludeSet = new Set()) {
  for (let attempt = 0; attempt < 8; attempt++) {
    let roll = Math.random() * TOTAL_WEIGHT
    let tierIndex = 0
    for (let i = 0; i < LENGTH_TIERS.length; i++) {
      roll -= LENGTH_TIERS[i].weight
      if (roll <= 0) {
        tierIndex = i
        break
      }
    }
    const bucket = BUCKETS[tierIndex].length ? BUCKETS[tierIndex] : WORD_BANK
    const word = bucket[Math.floor(Math.random() * bucket.length)]
    if (!excludeSet.has(word)) return word
  }
  // Pool's briefly saturated with near-duplicates — just take anything.
  return WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]
}

export const STARTING_LIVES = 3
export const MAX_CONCURRENT_WORDS = 6

// Fall speed and spawn rate both ramp up with elapsed play time, capped so
// it never gets literally unplayable.
export const BASE_FALL_SPEED = 42 // px/sec
export const MAX_FALL_SPEED = 150 // px/sec
export const FALL_SPEED_RAMP_PER_SEC = 1.3 // added per second elapsed

export const SPAWN_INTERVAL_START_MS = 1750
export const SPAWN_INTERVAL_MIN_MS = 650
export const SPAWN_INTERVAL_RAMP_MS_PER_SEC = 15 // interval shrinks by this much per second elapsed

export function fallSpeedAt(elapsedMs) {
  return Math.min(MAX_FALL_SPEED, BASE_FALL_SPEED + (elapsedMs / 1000) * FALL_SPEED_RAMP_PER_SEC)
}

export function spawnIntervalAt(elapsedMs) {
  return Math.max(
    SPAWN_INTERVAL_MIN_MS,
    SPAWN_INTERVAL_START_MS - (elapsedMs / 1000) * SPAWN_INTERVAL_RAMP_MS_PER_SEC,
  )
}
