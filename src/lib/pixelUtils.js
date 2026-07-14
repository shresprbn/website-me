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

export function exportPng(pixels, scale = 16) {
  const size = pixels.length
  const canvas = document.createElement('canvas')
  canvas.width = size * scale
  canvas.height = size * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const color = pixels[y][x]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(x * scale, y * scale, scale, scale)
    }
  }

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
