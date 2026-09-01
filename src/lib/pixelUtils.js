export const GRID_SIZES = [16, 32, 64]
export const MAX_LAYERS = 8

export const DEFAULT_PALETTE = [
  '#141414',
  '#ff6b9d',
  '#4ecdc4',
  '#ffd23f',
  '#faf8f3',
  '#e8e3d8',
  '#ffffff',
]

export function createEmptyGrid(size) {
  return Array.from({ length: size }, () => Array(size).fill(null))
}

export function hasContent(pixels) {
  return pixels.some((row) => row.some((cell) => cell !== null))
}

export function createLayer(size, name) {
  return {
    id: crypto.randomUUID(),
    name,
    visible: true,
    pixels: createEmptyGrid(size),
  }
}

export function createDefaultLayers(size) {
  const layer = createLayer(size, 'Layer 1')
  return { layers: [layer], activeLayerId: layer.id }
}

export function hasContentInLayers(layers) {
  return layers.some((layer) => hasContent(layer.pixels))
}

export function compositeLayers(layers) {
  if (layers.length === 0) return createEmptyGrid(16)
  const size = layers[0].pixels.length
  const result = createEmptyGrid(size)
  for (const layer of layers) {
    if (!layer.visible) continue
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const color = layer.pixels[y][x]
        if (color !== null) result[y][x] = color
      }
    }
  }
  return result
}

export function floodFill(pixels, startX, startY, fillColor) {
  const size = pixels.length
  const target = pixels[startY][startX]
  if (target === fillColor) return pixels

  const next = pixels.map((row) => row.slice())
  const stack = [[startX, startY]]
  const seen = new Set()

  while (stack.length) {
    const [x, y] = stack.pop()
    const key = `${x},${y}`
    if (seen.has(key)) continue
    if (x < 0 || y < 0 || x >= size || y >= size) continue
    if (next[y][x] !== target) continue

    seen.add(key)
    next[y][x] = fillColor

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }

  return next
}

export function pixelsToCanvas(pixels, scale = 16) {
  const size = pixels.length
  const canvas = document.createElement('canvas')
  canvas.width = size * scale
  canvas.height = size * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const color = pixels[y][x]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(x * scale, y * scale, scale, scale)
    }
  }

  return canvas
}

export function pixelsToBlob(pixels, scale = 16) {
  const canvas = pixelsToCanvas(pixels, scale)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

export function exportPng(pixels, scale = 16) {
  const canvas = pixelsToCanvas(pixels, scale)
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pixel-art.png'
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

// ── Geometry helpers for the shape tools + gap-free freehand ──────────

// Bresenham. Used both for the `line` tool and to fill the gaps between
// pointer samples on a fast pencil drag.
export function linePoints(x0, y0, x1, y1) {
  const points = []
  let x = x0
  let y = y0
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy
  // guard against a pathological loop if something passes NaN
  for (let guard = 0; guard < 100000; guard++) {
    points.push({ x, y })
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }
  return points
}

// Hollow rectangle outline between two corners.
export function rectCells(x0, y0, x1, y1) {
  const minX = Math.min(x0, x1)
  const maxX = Math.max(x0, x1)
  const minY = Math.min(y0, y1)
  const maxY = Math.max(y0, y1)
  const cells = []
  for (let x = minX; x <= maxX; x++) {
    cells.push({ x, y: minY })
    if (maxY !== minY) cells.push({ x, y: maxY })
  }
  for (let y = minY + 1; y < maxY; y++) {
    cells.push({ x: minX, y })
    if (maxX !== minX) cells.push({ x: maxX, y })
  }
  return cells
}

// Hollow ellipse inscribed in the drag's bounding box. Parametric sampling —
// simpler than midpoint rasterisation and plenty smooth at these sizes.
export function ellipseCells(x0, y0, x1, y1) {
  const minX = Math.min(x0, x1)
  const maxX = Math.max(x0, x1)
  const minY = Math.min(y0, y1)
  const maxY = Math.max(y0, y1)
  const a = (maxX - minX) / 2
  const b = (maxY - minY) / 2
  if (a < 0.5 || b < 0.5) return linePoints(minX, minY, maxX, maxY)
  const cx = (maxX + minX) / 2
  const cy = (maxY + minY) / 2
  const steps = Math.max(32, Math.ceil((a + b) * 4))
  const seen = new Set()
  const cells = []
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const x = Math.round(cx + a * Math.cos(t))
    const y = Math.round(cy + b * Math.sin(t))
    const key = `${x},${y}`
    if (!seen.has(key)) {
      seen.add(key)
      cells.push({ x, y })
    }
  }
  return cells
}

// The editor's on-screen render. Unlike drawGridToCanvas it walks the layer
// stack directly so it can dim the inactive layers (onion skin) and paint a
// translucent preview of an in-progress shape on top.
export function drawLayersToCanvas(canvas, layers, displayScale, opts = {}) {
  const { activeLayerId = null, onionSkin = false, preview = null } = opts
  const size = layers[0]?.pixels.length ?? 16
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, size, size)

  for (const layer of layers) {
    if (!layer.visible) continue
    ctx.globalAlpha = onionSkin && activeLayerId && layer.id !== activeLayerId ? 0.26 : 1
    const px = layer.pixels
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const color = px[y][x]
        if (!color) continue
        ctx.fillStyle = color
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }
  ctx.globalAlpha = 1

  if (preview && preview.cells && preview.cells.length) {
    ctx.globalAlpha = 0.55
    ctx.fillStyle = preview.color || '#141414'
    for (const c of preview.cells) {
      if (c.x < 0 || c.y < 0 || c.x >= size || c.y >= size) continue
      ctx.fillRect(c.x, c.y, 1, 1)
    }
    ctx.globalAlpha = 1
  }

  canvas.style.width = `${size * displayScale}px`
  canvas.style.height = `${size * displayScale}px`
}

export function drawGridToCanvas(canvas, pixels, displayScale) {
  const size = pixels.length
  const logical = size
  canvas.width = logical
  canvas.height = logical
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, logical, logical)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const color = pixels[y][x]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(x, y, 1, 1)
    }
  }

  canvas.style.width = `${logical * displayScale}px`
  canvas.style.height = `${logical * displayScale}px`
}

export function cellFromPointer(canvas, clientX, clientY, gridSize) {
  const rect = canvas.getBoundingClientRect()
  const x = Math.floor(((clientX - rect.left) / rect.width) * gridSize)
  const y = Math.floor(((clientY - rect.top) / rect.height) * gridSize)
  if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return null
  return { x, y }
}
