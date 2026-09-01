// Conway's Game of Life — grid helpers + a handful of classic patterns.

export function createGrid(cols, rows) {
  return Array.from({ length: rows }, () => new Uint8Array(cols))
}

export function randomGrid(cols, rows, density = 0.3) {
  const g = createGrid(cols, rows)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      g[y][x] = Math.random() < density ? 1 : 0
    }
  }
  return g
}

// One generation. `wrap` makes the board a torus so gliders come back around.
export function step(grid, cols, rows, wrap) {
  const next = createGrid(cols, rows)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          let nx = x + dx
          let ny = y + dy
          if (wrap) {
            nx = (nx + cols) % cols
            ny = (ny + rows) % rows
          } else if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) {
            continue
          }
          n += grid[ny][nx]
        }
      }
      next[y][x] = grid[y][x] ? (n === 2 || n === 3 ? 1 : 0) : n === 3 ? 1 : 0
    }
  }
  return next
}

export function population(grid) {
  let p = 0
  for (const row of grid) {
    for (const c of row) p += c
  }
  return p
}

export function cloneGrid(grid) {
  return grid.map((row) => Uint8Array.from(row))
}

// ── Patterns ─────────────────────────────────────────────────────────
// Cells as [x, y] offsets from a pattern's top-left.

const pulsarRows = {
  0: [2, 3, 4, 8, 9, 10],
  2: [0, 5, 7, 12],
  3: [0, 5, 7, 12],
  4: [0, 5, 7, 12],
  5: [2, 3, 4, 8, 9, 10],
  7: [2, 3, 4, 8, 9, 10],
  8: [0, 5, 7, 12],
  9: [0, 5, 7, 12],
  10: [0, 5, 7, 12],
  12: [2, 3, 4, 8, 9, 10],
}
const pulsar = Object.entries(pulsarRows).flatMap(([y, xs]) => xs.map((x) => [x, Number(y)]))

// Gosper glider gun — the classic infinite-growth pattern.
const gliderGun = [
  [24, 0],
  [22, 1], [24, 1],
  [12, 2], [13, 2], [20, 2], [21, 2], [34, 2], [35, 2],
  [11, 3], [15, 3], [20, 3], [21, 3], [34, 3], [35, 3],
  [0, 4], [1, 4], [10, 4], [16, 4], [20, 4], [21, 4],
  [0, 5], [1, 5], [10, 5], [14, 5], [16, 5], [17, 5], [22, 5], [24, 5],
  [10, 6], [16, 6], [24, 6],
  [11, 7], [15, 7],
  [12, 8], [13, 8],
]

export const PATTERNS = [
  { id: 'glider', label: 'glider', cells: [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]] },
  { id: 'blinker', label: 'blinker', cells: [[0, 1], [1, 1], [2, 1]] },
  { id: 'toad', label: 'toad', cells: [[1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1]] },
  { id: 'beacon', label: 'beacon', cells: [[0, 0], [1, 0], [0, 1], [3, 2], [2, 3], [3, 3]] },
  { id: 'rpentomino', label: 'R-pentomino', cells: [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]] },
  { id: 'pulsar', label: 'pulsar', cells: pulsar },
  { id: 'gun', label: 'glider gun', cells: gliderGun },
]

// Drops a pattern onto a blank grid, centred (the gun sits toward the left so
// it has room to fire).
export function stampPattern(cols, rows, cells, { anchor = 'center' } = {}) {
  const g = createGrid(cols, rows)
  const maxX = Math.max(...cells.map((c) => c[0]))
  const maxY = Math.max(...cells.map((c) => c[1]))
  const ox = anchor === 'left' ? 2 : Math.floor((cols - maxX - 1) / 2)
  const oy = Math.floor((rows - maxY - 1) / 2)
  for (const [x, y] of cells) {
    const gx = ox + x
    const gy = oy + y
    if (gx >= 0 && gy >= 0 && gx < cols && gy < rows) g[gy][gx] = 1
  }
  return g
}
