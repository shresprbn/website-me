export const GRID_COLS = 18
export const GRID_ROWS = 18

export const TICK_START_MS = 140
export const TICK_MIN_MS = 70
export const TICK_STEP_MS = 3
export const SCORE_PER_FOOD = 10

export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' }

export function createInitialSnake() {
  const midY = Math.floor(GRID_ROWS / 2)
  const startX = Math.floor(GRID_COLS / 2)
  return [
    { x: startX, y: midY },
    { x: startX - 1, y: midY },
    { x: startX - 2, y: midY },
  ]
}

// Which side of `from`'s tile does `to` sit on?
function sideFacing(from, to) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (dx === 1) return 'E'
  if (dx === -1) return 'W'
  if (dy === 1) return 'S'
  if (dy === -1) return 'N'
  return null
}

// direction word (up/down/left/right) that `from` -> `to` represents
export function directionBetween(from, to) {
  const side = sideFacing(from, to)
  if (side === 'N') return 'up'
  if (side === 'S') return 'down'
  if (side === 'E') return 'right'
  if (side === 'W') return 'left'
  return null
}

// Given the two tile sides a body segment connects to (toward the head,
// toward the tail), pick which truck body sprite hugs that corner —
// straight pieces when the sides are opposite, otherwise a turn.
export function bodySpriteKey(sideToHead, sideToTail) {
  const sides = new Set([sideToHead, sideToTail])
  if (sides.has('N') && sides.has('S')) return 'bodyVertical'
  if (sides.has('E') && sides.has('W')) return 'bodyHorizontal'
  if (sides.has('N') && sides.has('E')) return 'bodyTR'
  if (sides.has('N') && sides.has('W')) return 'bodyTL'
  if (sides.has('S') && sides.has('E')) return 'bodyBR'
  if (sides.has('S') && sides.has('W')) return 'bodyBL'
  return 'bodyHorizontal'
}

export function segmentSpriteKey(snake, index) {
  const curr = snake[index]

  if (index === 0) return null // head uses current movement direction, not neighbors

  if (index === snake.length - 1) {
    // tail: same convention as the head — face the direction of travel
    // that dragged the tail into this cell (from the segment ahead of it).
    const dir = directionBetween(snake[index - 1], curr)
    return { kind: 'tail', dir: dir || 'right' }
  }

  const sideToHead = sideFacing(curr, snake[index - 1])
  const sideToTail = sideFacing(curr, snake[index + 1])
  return { kind: 'body', key: bodySpriteKey(sideToHead, sideToTail) }
}

export function randomEmptyCell(occupied) {
  const taken = new Set(occupied.map((s) => `${s.x},${s.y}`))
  const free = []
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y })
    }
  }
  if (free.length === 0) return null
  return free[Math.floor(Math.random() * free.length)]
}

export function isOutOfBounds(cell) {
  return cell.x < 0 || cell.y < 0 || cell.x >= GRID_COLS || cell.y >= GRID_ROWS
}
