// Gray-Scott reaction-diffusion. Two chemicals A and B on a toroidal grid;
// A feeds in, B is killed off, and B*B*A converts A into more B. Tiny changes
// to feed/kill flip it between spots, worms, mazes, mitosis, waves…

const DA = 1.0
const DB = 0.5

export const RD_PRESETS = [
  { id: 'mitosis', label: 'mitosis', feed: 0.0367, kill: 0.0649 },
  { id: 'coral', label: 'coral', feed: 0.0545, kill: 0.062 },
  { id: 'spots', label: 'spots', feed: 0.018, kill: 0.051 },
  { id: 'worms', label: 'worms', feed: 0.078, kill: 0.061 },
  { id: 'maze', label: 'maze', feed: 0.029, kill: 0.057 },
  { id: 'waves', label: 'waves', feed: 0.014, kill: 0.0525 },
  { id: 'holes', label: 'holes', feed: 0.039, kill: 0.058 },
]

export const RD_PALETTES = [
  { id: 'ink', label: 'ink', stops: [[247, 245, 240], [20, 20, 20]] },
  { id: 'teal', label: 'teal', stops: [[247, 245, 240], [78, 205, 196], [13, 46, 43]] },
  { id: 'ember', label: 'ember', stops: [[26, 22, 30], [224, 122, 95], [255, 214, 92]] },
  { id: 'violet', label: 'violet', stops: [[247, 245, 240], [124, 108, 240], [24, 18, 46]] },
]

export function createField(cols, rows) {
  return {
    cols,
    rows,
    a: new Float32Array(cols * rows).fill(1),
    b: new Float32Array(cols * rows),
    tmpA: new Float32Array(cols * rows),
    tmpB: new Float32Array(cols * rows),
  }
}

export function seedField(field, blobs = 16, size = 4) {
  const { a, b, cols, rows } = field
  a.fill(1)
  b.fill(0)
  for (let n = 0; n < blobs; n++) {
    const cx = (Math.random() * cols) | 0
    const cy = (Math.random() * rows) | 0
    for (let y = -size; y <= size; y++) {
      for (let x = -size; x <= size; x++) {
        const nx = (cx + x + cols) % cols
        const ny = (cy + y + rows) % rows
        b[ny * cols + nx] = 1
      }
    }
  }
}

// Drop a circle of B — the click-to-poke interaction.
export function splat(field, cx, cy, r = 7) {
  const { b, cols, rows } = field
  const rr = r * r
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y > rr) continue
      const nx = ((cx + x) % cols + cols) % cols
      const ny = ((cy + y) % rows + rows) % rows
      b[ny * cols + nx] = 1
    }
  }
}

export function stepField(field, feed, kill) {
  const { a, b, tmpA, tmpB, cols, rows } = field
  for (let y = 0; y < rows; y++) {
    const yUp = ((y - 1 + rows) % rows) * cols
    const yDn = ((y + 1) % rows) * cols
    const yC = y * cols
    for (let x = 0; x < cols; x++) {
      const xL = (x - 1 + cols) % cols
      const xR = (x + 1) % cols
      const i = yC + x
      const av = a[i]
      const bv = b[i]
      const lapA =
        -av +
        0.2 * (a[yC + xL] + a[yC + xR] + a[yUp + x] + a[yDn + x]) +
        0.05 * (a[yUp + xL] + a[yUp + xR] + a[yDn + xL] + a[yDn + xR])
      const lapB =
        -bv +
        0.2 * (b[yC + xL] + b[yC + xR] + b[yUp + x] + b[yDn + x]) +
        0.05 * (b[yUp + xL] + b[yUp + xR] + b[yDn + xL] + b[yDn + xR])
      const reaction = av * bv * bv
      const na = av + (DA * lapA - reaction + feed * (1 - av))
      const nb = bv + (DB * lapB + reaction - (kill + feed) * bv)
      tmpA[i] = na < 0 ? 0 : na > 1 ? 1 : na
      tmpB[i] = nb < 0 ? 0 : nb > 1 ? 1 : nb
    }
  }
  a.set(tmpA)
  b.set(tmpB)
}

function sampleGradient(stops, t) {
  if (stops.length === 1) return stops[0]
  const seg = t * (stops.length - 1)
  const idx = Math.min(stops.length - 2, Math.floor(seg))
  const f = seg - idx
  const c0 = stops[idx]
  const c1 = stops[idx + 1]
  return [
    (c0[0] + (c1[0] - c0[0]) * f) | 0,
    (c0[1] + (c1[1] - c0[1]) * f) | 0,
    (c0[2] + (c1[2] - c0[2]) * f) | 0,
  ]
}

export function renderField(field, imageData, palette) {
  const { a, b, cols, rows } = field
  const px = imageData.data
  const stops = palette.stops
  const total = cols * rows
  for (let i = 0; i < total; i++) {
    let v = a[i] - b[i]
    v = v < 0 ? 0 : v > 1 ? 1 : v
    const [r, g, bl] = sampleGradient(stops, 1 - v)
    const o = i * 4
    px[o] = r
    px[o + 1] = g
    px[o + 2] = bl
    px[o + 3] = 255
  }
}

// Crisp upscaled PNG for download — the sim grid is small.
export function exportUpscaledPng(sourceCanvas, scale, filename) {
  const out = document.createElement('canvas')
  out.width = sourceCanvas.width * scale
  out.height = sourceCanvas.height * scale
  const ctx = out.getContext('2d')
  if (!ctx) return
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(sourceCanvas, 0, 0, out.width, out.height)
  out.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }, 'image/png')
}

export function canvasToBlob(canvas, scale = 2) {
  const out = document.createElement('canvas')
  out.width = canvas.width * scale
  out.height = canvas.height * scale
  const ctx = out.getContext('2d')
  if (ctx) {
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(canvas, 0, 0, out.width, out.height)
  }
  return new Promise((resolve) => out.toBlob(resolve, 'image/png'))
}
