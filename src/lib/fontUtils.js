import { createEmptyGrid, hasContent } from './pixelUtils'

// A-Z, 0-9 — the character set for the font maker.
export const GLYPH_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export const FONT_GRID_SIZES = [16, 32]
export const FONT_INK = '#141414'

const DIGIT_NAMES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']

function glyphName(ch) {
  if (/[0-9]/.test(ch)) return DIGIT_NAMES[Number(ch)]
  return ch
}

export function createEmptyFontGlyphs(gridSize) {
  const glyphs = {}
  for (const ch of GLYPH_CHARS) glyphs[ch] = createEmptyGrid(gridSize)
  return glyphs
}

export function anyGlyphHasContent(glyphs) {
  return GLYPH_CHARS.some((ch) => hasContent(glyphs[ch]))
}

export function glyphCompletionCount(glyphs) {
  return GLYPH_CHARS.filter((ch) => hasContent(glyphs[ch])).length
}

const UNITS_PER_EM = 1024

// Builds an opentype.js Path for one glyph's pixel grid. Each filled cell
// becomes its own square contour — TrueType's non-zero fill rule handles a
// pile of disjoint squares fine, which is how most bitmap-style pixel fonts
// are actually distributed (vector outlines of little blocks, not a real
// bitmap table).
function gridToPath(opentype, pixels, pixelUnits) {
  const path = new opentype.Path()
  const size = pixels.length
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!pixels[y][x]) continue
      const left = x * pixelUnits
      const right = left + pixelUnits
      const top = (size - y) * pixelUnits
      const bottom = top - pixelUnits
      path.moveTo(left, bottom)
      path.lineTo(right, bottom)
      path.lineTo(right, top)
      path.lineTo(left, top)
      path.close()
    }
  }
  return path
}

// Crafts a real TrueType font from the drawn glyphs. `opentype` is the
// imported opentype.js module — passed in rather than imported at the top
// so callers can lazy-load the (fairly large) library only when exporting.
export function buildFont(opentype, { glyphs, gridSize, fontName }) {
  const pixelUnits = UNITS_PER_EM / gridSize
  const advanceWidth = UNITS_PER_EM + pixelUnits * 2
  const name = (fontName || '').trim() || 'MyPixelFont'

  const notdefGlyph = new opentype.Glyph({
    name: '.notdef',
    advanceWidth,
    path: new opentype.Path(),
  })
  const spaceGlyph = new opentype.Glyph({
    name: 'space',
    unicode: 32,
    advanceWidth: UNITS_PER_EM * 0.6,
    path: new opentype.Path(),
  })

  const letterGlyphs = GLYPH_CHARS.map((ch) => {
    const path = gridToPath(opentype, glyphs[ch], pixelUnits)
    return new opentype.Glyph({
      name: glyphName(ch),
      unicode: ch.charCodeAt(0),
      advanceWidth,
      path,
    })
  })

  return new opentype.Font({
    familyName: name,
    styleName: 'Regular',
    unitsPerEm: UNITS_PER_EM,
    ascender: UNITS_PER_EM,
    descender: 0,
    glyphs: [notdefGlyph, spaceGlyph, ...letterGlyphs],
  })
}

export function downloadFont(font, filename) {
  const buffer = font.toArrayBuffer()
  const blob = new Blob([buffer], { type: 'font/ttf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Draws a faint reference letterform behind the pixel grid so there's
// something to trace over. Rendered at real display resolution (not the
// blocky logical grid resolution) so it stays legible.
export function drawGuideToCanvas(canvas, char, gridSize, displayScale) {
  const size = gridSize * displayScale
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, size, size)
  if (!char) return
  ctx.fillStyle = 'rgba(20, 20, 20, 0.16)'
  ctx.font = `700 ${Math.floor(size * 0.78)}px 'Space Mono', monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(char, size / 2, size / 2 + size * 0.04)
}

// Composites a sample string using the drawn glyph grids directly (not
// through the built font) — cheap enough to redraw on every keystroke for
// a live preview. Unsupported characters (lowercase, punctuation, space)
// just advance a blank gap.
export function drawPreviewToCanvas(canvas, text, glyphs, gridSize, scale = 4) {
  const chars = text.toUpperCase().split('')
  const gap = 1
  const glyphPx = gridSize * scale
  const gapPx = gap * scale
  const width = Math.max(1, chars.length * (glyphPx + gapPx))
  canvas.width = width
  canvas.height = glyphPx
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, width, glyphPx)
  ctx.fillStyle = FONT_INK

  chars.forEach((ch, i) => {
    const originX = i * (glyphPx + gapPx)
    const grid = glyphs[ch]
    if (!grid) return
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (!grid[y][x]) continue
        ctx.fillRect(originX + x * scale, y * scale, scale, scale)
      }
    }
  })
}
