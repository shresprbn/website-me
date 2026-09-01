import { createEmptyGrid, hasContent } from './pixelUtils'

// The character set, in the order the sheet lays it out. Grouped so the sheet
// can print a heading before each block instead of one 77-tile wall.
const DIGITS = '0123456789'.split('')
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const LOWER = 'abcdefghijklmnopqrstuvwxyz'.split('')
const PUNCT = ['.', ',', '!', '?', "'", '"', '-', ':', ';', '(', ')', '/', '&', '@', '#']

export const GLYPH_GROUPS = [
  { id: 'digits', label: 'digits', chars: DIGITS },
  { id: 'upper', label: 'uppercase', chars: UPPER },
  { id: 'lower', label: 'lowercase', chars: LOWER },
  { id: 'punct', label: 'punctuation', chars: PUNCT },
]
export const GLYPH_CHARS = GLYPH_GROUPS.flatMap((g) => g.chars)

export const FONT_GRID_SIZES = [16, 32]
export const FONT_INK = '#141414'

export const GUIDE_FONTS = {
  sans: 'system-ui, "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: "'Space Mono', ui-monospace, monospace",
}

// Sensible starting metrics for a fresh grid. baseline sits on the bottom row
// (no descender room) which reproduces the old fixed behaviour; the drawer
// lowers it if they want tails on g/j/p/q/y.
export function defaultMetrics(gridSize) {
  return {
    baseline: gridSize,
    xHeight: Math.round(gridSize * 0.55),
    letterSpacing: 1,
    proportional: false,
  }
}

const DIGIT_NAMES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
const PUNCT_NAMES = {
  '.': 'period', ',': 'comma', '!': 'exclam', '?': 'question',
  "'": 'quotesingle', '"': 'quotedbl', '-': 'hyphen', ':': 'colon',
  ';': 'semicolon', '(': 'parenleft', ')': 'parenright', '/': 'slash',
  '&': 'ampersand', '@': 'at', '#': 'numbersign',
}

function glyphName(ch) {
  if (/[0-9]/.test(ch)) return DIGIT_NAMES[Number(ch)]
  if (PUNCT_NAMES[ch]) return PUNCT_NAMES[ch]
  return ch // A–Z and a–z: the bare char is a valid, unique glyph name
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

// Rightmost inked column, or -1 for a blank grid.
function rightmostInked(pixels) {
  let maxX = -1
  for (let y = 0; y < pixels.length; y++) {
    for (let x = pixels.length - 1; x > maxX; x--) {
      if (pixels[y][x]) {
        maxX = x
        break
      }
    }
  }
  return maxX
}

const UNITS_PER_EM = 1024

// Builds an opentype.js Path for one glyph's pixel grid. Each filled cell
// becomes its own square contour — TrueType's non-zero fill rule handles a
// pile of disjoint squares fine, which is how most bitmap-style pixel fonts
// are actually distributed (vector outlines of little blocks, not a real
// bitmap table). `baseline` is the grid row that maps to font y=0, so rows
// above it are positive (ascent) and rows below go negative (descent).
function gridToPath(opentype, pixels, pixelUnits, baseline) {
  const path = new opentype.Path()
  const size = pixels.length
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!pixels[y][x]) continue
      const left = x * pixelUnits
      const right = left + pixelUnits
      const top = (baseline - y) * pixelUnits
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
export function buildFont(opentype, { glyphs, gridSize, fontName, metrics }) {
  const m = { ...defaultMetrics(gridSize), ...(metrics || {}) }
  const pixelUnits = UNITS_PER_EM / gridSize
  const tracking = m.letterSpacing * pixelUnits
  const name = (fontName || '').trim() || 'MyPixelFont'
  const baseline = Math.max(1, Math.min(gridSize, m.baseline))

  const advanceFor = (pixels) => {
    if (!m.proportional) return gridSize * pixelUnits + tracking
    const maxX = rightmostInked(pixels)
    if (maxX < 0) return Math.round(gridSize * 0.4 * pixelUnits) + tracking
    return (maxX + 1) * pixelUnits + pixelUnits + tracking // +1 cell right bearing
  }

  const notdefGlyph = new opentype.Glyph({
    name: '.notdef',
    advanceWidth: gridSize * pixelUnits + tracking,
    path: new opentype.Path(),
  })
  const spaceGlyph = new opentype.Glyph({
    name: 'space',
    unicode: 32,
    advanceWidth: Math.round(UNITS_PER_EM * 0.5) + tracking,
    path: new opentype.Path(),
  })

  const letterGlyphs = GLYPH_CHARS.map((ch) => {
    const path = gridToPath(opentype, glyphs[ch], pixelUnits, baseline)
    return new opentype.Glyph({
      name: glyphName(ch),
      unicode: ch.charCodeAt(0),
      advanceWidth: advanceFor(glyphs[ch]),
      path,
    })
  })

  return new opentype.Font({
    familyName: name,
    styleName: 'Regular',
    unitsPerEm: UNITS_PER_EM,
    ascender: baseline * pixelUnits,
    descender: -(gridSize - baseline) * pixelUnits,
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

// Hi-DPI cap. The guide letterform is anti-aliased text, so unlike the blocky
// pixel grid it genuinely needs the extra backing-store resolution to not look
// fuzzy on retina screens.
const GUIDE_DPR =
  typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1

// Draws a faint reference letterform behind the pixel grid so there's
// something to trace over. `opts.family` picks the reference typeface
// (sans / serif / mono); when `opts.metrics` + `opts.showLines` are given it
// also draws the baseline + x-height rules and sits the letter on the
// baseline instead of centring it.
export function drawGuideToCanvas(canvas, char, gridSize, displayScale, opts = {}) {
  const { family = 'mono', metrics = null, showLines = false } = opts
  const size = gridSize * displayScale
  canvas.width = size * GUIDE_DPR
  canvas.height = size * GUIDE_DPR
  // Pin the CSS box to the logical size — without this the canvas lays out at
  // its (DPR-scaled) intrinsic width and overhangs the pixel grid it sits over.
  canvas.style.width = `${size}px`
  canvas.style.height = `${size}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(GUIDE_DPR, 0, 0, GUIDE_DPR, 0, 0)
  ctx.clearRect(0, 0, size, size)

  const fam = GUIDE_FONTS[family] || GUIDE_FONTS.mono
  const baselineRow = metrics ? Math.max(1, Math.min(gridSize, metrics.baseline)) : gridSize

  if (showLines && metrics) {
    const rule = (row, color, dash) => {
      // Clamp inside the canvas so a baseline sitting on the very bottom row
      // still shows a hairline instead of drawing off the edge.
      const y = Math.min(Math.round(row * displayScale), size - 1) + 0.5
      ctx.save()
      ctx.strokeStyle = color
      ctx.setLineDash(dash || [])
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(size, y)
      ctx.stroke()
      ctx.restore()
    }
    rule(baselineRow, 'rgba(255, 107, 157, .55)')
    rule(metrics.xHeight, 'rgba(78, 205, 196, .55)', [4, 4])
  }

  if (!char) return
  ctx.fillStyle = 'rgba(20, 20, 20, 0.16)'
  ctx.textAlign = 'center'

  if (showLines && metrics) {
    ctx.textBaseline = 'alphabetic'
    ctx.font = `700 ${Math.floor(baselineRow * displayScale * 0.98)}px ${fam}`
    ctx.fillText(char, size / 2, baselineRow * displayScale)
  } else {
    ctx.textBaseline = 'middle'
    ctx.font = `700 ${Math.floor(size * 0.78)}px ${fam}`
    ctx.fillText(char, size / 2, size / 2 + size * 0.04)
  }
}

const swapCase = (ch) =>
  ch === ch.toLowerCase() ? ch.toUpperCase() : ch.toLowerCase()

// Composites a sample string using the drawn glyph grids directly (not
// through the built font) — cheap enough to redraw on every keystroke for
// a live preview. A character with no glyph falls back to the other case
// (so a font with only capitals still previews lowercase input); anything
// still unknown just advances a blank gap.
export function drawPreviewToCanvas(canvas, text, glyphs, gridSize, scale = 4, opts = {}) {
  const { letterSpacing = 1, ink = FONT_INK } = opts
  const chars = text.split('')
  const gap = 1 + Math.max(0, letterSpacing)
  const glyphPx = gridSize * scale
  const gapPx = gap * scale
  const width = Math.max(1, chars.length * (glyphPx + gapPx))
  canvas.width = width
  canvas.height = glyphPx
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, width, glyphPx)
  ctx.fillStyle = ink

  chars.forEach((ch, i) => {
    const originX = i * (glyphPx + gapPx)
    const grid = glyphs[ch] || glyphs[swapCase(ch)]
    if (!grid) return
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (!grid[y][x]) continue
        ctx.fillRect(originX + x * scale, y * scale, scale, scale)
      }
    }
  })
}
