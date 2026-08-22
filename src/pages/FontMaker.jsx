import { useEffect, useRef, useState } from 'react'
import Nav from '../components/Nav'
import { useModal } from '../components/ModalProvider'
import {
  createEmptyGrid,
  hasContent,
  floodFill,
  drawGridToCanvas,
  cellFromPointer,
  pixelsToCanvas,
} from '../lib/pixelUtils'
import {
  GLYPH_CHARS,
  FONT_GRID_SIZES,
  FONT_INK,
  createEmptyFontGlyphs,
  anyGlyphHasContent,
  glyphCompletionCount,
  buildFont,
  downloadFont,
  drawPreviewToCanvas,
  drawGuideToCanvas,
} from '../lib/fontUtils'

const TOOLS = [
  { id: 'pencil', label: 'pencil', icon: '✎' },
  { id: 'eraser', label: 'eraser', icon: '⌫' },
  { id: 'fill', label: 'fill', icon: '▣' },
]

// Fixed tile size for the sheet view — every glyph gets the same size tile
// regardless of grid size, so the sheet lays out consistently either way.
const MINI_SIZE = 108

const outlineBtn = {
  background: 'transparent',
  color: '#8a8a8a',
  border: '2px solid #e0dbd0',
  borderRadius: 40,
  padding: '11px 22px',
  fontFamily: "'Space Mono', monospace",
  fontSize: 13,
  cursor: 'pointer',
}

const presetBtn = {
  background: '#faf8f3',
  color: '#141414',
  border: '1px solid #e8e3d8',
  borderRadius: 40,
  padding: '9px 18px',
  fontFamily: "'Space Mono', monospace",
  fontSize: 12,
  cursor: 'pointer',
}

const activePresetBtn = {
  ...presetBtn,
  border: '2px solid #ff6b9d',
  background: 'rgba(255, 107, 157, .08)',
}

function displayScaleForSize(gridSize) {
  return gridSize === 16 ? 20 : 11
}

function safeFileName(name) {
  const trimmed = (name || '').trim() || 'MyPixelFont'
  return trimmed.replace(/[^a-z0-9-_]+/gi, '-')
}

export default function FontMaker() {
  const { confirmAction } = useModal()
  // Big canvas — for precise editing of whichever glyph is focused.
  const canvasRef = useRef(null)
  const guideCanvasRef = useRef(null)
  // Sheet of small canvases — one per glyph, all drawable at once so you
  // don't have to click a picker, then click the canvas, over and over.
  const miniCanvasRefs = useRef({})
  const miniGuideRefs = useRef({})
  const previewCanvasRef = useRef(null)

  const drawingRef = useRef(false)
  const lastCellRef = useRef(null)
  const activeCharRef = useRef('A')
  const activeCanvasRef = useRef(null)
  const toolRef = useRef('pencil')
  const gridSizeRef = useRef(16)
  const selectedCharRef = useRef('A')

  const [gridSize, setGridSize] = useState(16)
  const [glyphs, setGlyphs] = useState(() => createEmptyFontGlyphs(16))
  const [selectedChar, setSelectedChar] = useState('A')
  const [tool, setTool] = useState('pencil')
  const [fontName, setFontName] = useState('My Pixel Font')
  const [previewText, setPreviewText] = useState('HELLO 123')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [showGuide, setShowGuide] = useState(true)
  const [zoomOpen, setZoomOpen] = useState(false)

  toolRef.current = tool
  gridSizeRef.current = gridSize
  selectedCharRef.current = selectedChar

  const displayScale = displayScaleForSize(gridSize)
  const miniScale = MINI_SIZE / gridSize
  const drawnCount = glyphCompletionCount(glyphs)

  // Big detail canvas — lives in the zoom modal, always mirrors whatever
  // glyph is currently focused. Re-runs when the modal opens too, since the
  // canvas element doesn't exist in the DOM until then.
  useEffect(() => {
    if (!zoomOpen) return
    const canvas = canvasRef.current
    const grid = glyphs[selectedChar]
    if (!canvas || !grid) return
    drawGridToCanvas(canvas, grid, displayScale)
  }, [glyphs, selectedChar, displayScale, zoomOpen])

  useEffect(() => {
    if (!zoomOpen) return
    const canvas = guideCanvasRef.current
    if (!canvas) return
    drawGuideToCanvas(canvas, showGuide ? selectedChar : null, gridSize, displayScale)
  }, [selectedChar, gridSize, displayScale, showGuide, zoomOpen])

  useEffect(() => {
    if (!zoomOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setZoomOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomOpen])

  // Sheet — every mini canvas redraws whenever any glyph changes. Cheap:
  // these are tiny grids, just a handful of fillRect calls each.
  useEffect(() => {
    for (const ch of GLYPH_CHARS) {
      const canvas = miniCanvasRefs.current[ch]
      if (canvas) drawGridToCanvas(canvas, glyphs[ch], miniScale)
    }
  }, [glyphs, miniScale])

  useEffect(() => {
    for (const ch of GLYPH_CHARS) {
      const canvas = miniGuideRefs.current[ch]
      if (canvas) drawGuideToCanvas(canvas, showGuide ? ch : null, gridSize, miniScale)
    }
  }, [gridSize, showGuide, miniScale])

  useEffect(() => {
    const canvas = previewCanvasRef.current
    if (!canvas) return
    drawPreviewToCanvas(canvas, previewText, glyphs, gridSize, gridSize === 16 ? 6 : 3)
    canvas.style.width = `${canvas.width}px`
    canvas.style.height = `${canvas.height}px`
  }, [previewText, glyphs, gridSize])

  const applyCell = (ch, x, y) => {
    const currentTool = toolRef.current
    setGlyphs((prev) => {
      const grid = prev[ch]
      let nextGrid = grid
      if (currentTool === 'fill') {
        nextGrid = floodFill(grid, x, y, FONT_INK)
      } else {
        const next = grid.map((row) => row.slice())
        if (currentTool === 'pencil') {
          if (next[y][x] === FONT_INK) return prev
          next[y][x] = FONT_INK
        } else if (currentTool === 'eraser') {
          if (next[y][x] === null) return prev
          next[y][x] = null
        }
        nextGrid = next
      }
      if (nextGrid === grid) return prev
      return { ...prev, [ch]: nextGrid }
    })
  }

  // Shared by the big canvas and every mini tile in the sheet — whichever
  // one you press down on becomes the active drawing target for the drag.
  const handleDrawPointerDown = (ch, e) => {
    e.preventDefault()
    const canvas = e.currentTarget
    const clientX = e.clientX ?? e.touches?.[0]?.clientX
    const clientY = e.clientY ?? e.touches?.[0]?.clientY
    if (clientX == null || clientY == null) return
    const cell = cellFromPointer(canvas, clientX, clientY, gridSizeRef.current)
    if (!cell) return

    activeCharRef.current = ch
    activeCanvasRef.current = canvas
    if (selectedCharRef.current !== ch) {
      selectedCharRef.current = ch
      setSelectedChar(ch)
    }
    drawingRef.current = true
    lastCellRef.current = `${cell.x},${cell.y}`
    applyCell(ch, cell.x, cell.y)
  }

  useEffect(() => {
    const onPointerUp = () => {
      drawingRef.current = false
      lastCellRef.current = null
    }
    const onPointerMove = (e) => {
      if (!drawingRef.current || toolRef.current === 'fill') return
      const canvas = activeCanvasRef.current
      const ch = activeCharRef.current
      if (!canvas || !ch) return
      const clientX = e.clientX ?? e.touches?.[0]?.clientX
      const clientY = e.clientY ?? e.touches?.[0]?.clientY
      if (clientX == null || clientY == null) return
      const cell = cellFromPointer(canvas, clientX, clientY, gridSizeRef.current)
      if (!cell) return
      const key = `${cell.x},${cell.y}`
      if (lastCellRef.current === key) return
      lastCellRef.current = key
      applyCell(ch, cell.x, cell.y)
    }
    window.addEventListener('mouseup', onPointerUp)
    window.addEventListener('touchend', onPointerUp)
    window.addEventListener('touchcancel', onPointerUp)
    window.addEventListener('mousemove', onPointerMove)
    window.addEventListener('touchmove', onPointerMove, { passive: false })
    return () => {
      window.removeEventListener('mouseup', onPointerUp)
      window.removeEventListener('touchend', onPointerUp)
      window.removeEventListener('touchcancel', onPointerUp)
      window.removeEventListener('mousemove', onPointerMove)
      window.removeEventListener('touchmove', onPointerMove)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stepZoomChar = (dir) => {
    const idx = GLYPH_CHARS.indexOf(selectedChar)
    const next = GLYPH_CHARS[(idx + dir + GLYPH_CHARS.length) % GLYPH_CHARS.length]
    setSelectedChar(next)
  }

  const changeGridSize = async (size) => {
    if (size === gridSize) return
    if (anyGlyphHasContent(glyphs)) {
      const ok = await confirmAction('Changing grid size will clear every letter you\'ve drawn. Continue?', { danger: true })
      if (!ok) return
    }
    setGridSize(size)
    setGlyphs(createEmptyFontGlyphs(size))
  }

  const clearGlyph = async () => {
    const grid = glyphs[selectedChar]
    if (!grid || !hasContent(grid)) return
    const ok = await confirmAction(`Clear "${selectedChar}"?`, { danger: true })
    if (!ok) return
    setGlyphs((prev) => ({ ...prev, [selectedChar]: createEmptyGrid(gridSize) }))
  }

  const clearAll = async () => {
    if (!anyGlyphHasContent(glyphs)) return
    const ok = await confirmAction('Clear every letter and number?', { danger: true })
    if (!ok) return
    setGlyphs(createEmptyFontGlyphs(gridSize))
  }

  const handleExportFont = async () => {
    if (!anyGlyphHasContent(glyphs)) return
    setExporting(true)
    setExportError('')
    try {
      const opentypeMod = await import('opentype.js')
      const opentype = opentypeMod.default ?? opentypeMod
      const font = buildFont(opentype, { glyphs, gridSize, fontName })
      downloadFont(font, `${safeFileName(fontName)}.ttf`)
    } catch (err) {
      console.error(err)
      setExportError("Couldn't build the font file — try again.")
    } finally {
      setExporting(false)
    }
  }

  const downloadSpritesheet = () => {
    const scale = gridSize === 16 ? 8 : 4
    const cols = 6
    const rows = Math.ceil(GLYPH_CHARS.length / cols)
    const cell = gridSize * scale
    const gap = Math.round(scale * 1.5)
    const sheet = document.createElement('canvas')
    sheet.width = cols * cell + (cols - 1) * gap
    sheet.height = rows * cell + (rows - 1) * gap
    const ctx = sheet.getContext('2d')
    if (!ctx) return
    GLYPH_CHARS.forEach((ch, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const glyphCanvas = pixelsToCanvas(glyphs[ch], scale)
      ctx.drawImage(glyphCanvas, col * (cell + gap), row * (cell + gap))
    })
    sheet.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeFileName(fontName)}-spritesheet.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />

      <div className="container pixel-maker-page">
        <div className="playground-header">
          <div className="playground-eyebrow">// FONT MAKER</div>
          <h1 className="playground-title">Draw a pixel font, letter by letter.</h1>
          <p className="playground-lede">
            A–Z, 0–9. Draw straight on the sheet below — every letter's its own little canvas — or
            zoom into one for detail work. Export a real font file when you're done.
          </p>
        </div>

        <div className="pixel-maker-toolbar">
          <div className="pixel-maker-size-group">
            {FONT_GRID_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                style={gridSize === size ? activePresetBtn : presetBtn}
                onClick={() => changeGridSize(size)}
              >
                {size}×{size}
              </button>
            ))}
            <input
              type="text"
              value={fontName}
              onChange={(e) => setFontName(e.target.value)}
              placeholder="font name"
              className="font-maker-name-input"
              maxLength={40}
            />
          </div>
          <div className="pixel-maker-actions">
            <button type="button" style={outlineBtn} onClick={clearGlyph}>
              clear letter ⌫
            </button>
            <button type="button" style={outlineBtn} onClick={clearAll}>
              clear all ↻
            </button>
            <button type="button" style={outlineBtn} onClick={downloadSpritesheet}>
              spritesheet PNG ↓
            </button>
            <button
              type="button"
              className="btn-pill dark"
              style={{ padding: '11px 22px', fontSize: 13, border: 'none' }}
              onClick={handleExportFont}
              disabled={exporting || !anyGlyphHasContent(glyphs)}
            >
              {exporting ? 'building…' : 'download font (.ttf) ↓'}
            </button>
          </div>
        </div>
        {exportError && <p className="save-to-gallery-error">{exportError}</p>}

        <div className="font-maker-progress">// {drawnCount} / {GLYPH_CHARS.length} DRAWN</div>

        <div className="font-maker-tools-row">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              style={tool === t.id ? activePresetBtn : presetBtn}
              onClick={() => setTool(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
          <button
            type="button"
            style={showGuide ? activePresetBtn : presetBtn}
            onClick={() => setShowGuide((g) => !g)}
          >
            👁 guide
          </button>
        </div>

        <div className="font-maker-sheet">
          {GLYPH_CHARS.map((ch) => (
            <div key={ch} className="font-maker-mini">
              <div
                className={`font-maker-mini-stack${selectedChar === ch ? ' active' : ''}`}
                style={{ width: MINI_SIZE, height: MINI_SIZE }}
              >
                <canvas
                  ref={(el) => { miniGuideRefs.current[ch] = el }}
                  className="font-maker-mini-guide"
                />
                <canvas
                  ref={(el) => { miniCanvasRefs.current[ch] = el }}
                  className="font-maker-mini-draw"
                  onMouseDown={(e) => handleDrawPointerDown(ch, e)}
                  onTouchStart={(e) => handleDrawPointerDown(ch, e)}
                />
                {hasContent(glyphs[ch]) && <span className="font-maker-mini-dot" />}
                <button
                  type="button"
                  className="font-maker-mini-expand"
                  aria-label={`Zoom in on ${ch}`}
                  title="Zoom in"
                  onClick={() => {
                    setSelectedChar(ch)
                    setZoomOpen(true)
                  }}
                >
                  ⤢
                </button>
              </div>
              <div className="font-maker-mini-label">{ch}</div>
            </div>
          ))}
        </div>

        {zoomOpen && (
          <div className="save-modal-overlay" onClick={() => setZoomOpen(false)}>
            <div
              className="save-modal font-maker-zoom-modal"
              role="dialog"
              aria-modal="true"
              aria-label={`Zoomed editor for ${selectedChar}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="font-maker-zoom-header">
                <button type="button" style={outlineBtn} onClick={() => stepZoomChar(-1)} aria-label="Previous letter">
                  ◀
                </button>
                <div className="font-maker-zoom-title">{selectedChar}</div>
                <button type="button" style={outlineBtn} onClick={() => stepZoomChar(1)} aria-label="Next letter">
                  ▶
                </button>
              </div>

              <div className="font-maker-tools-row">
                {TOOLS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    style={tool === t.id ? activePresetBtn : presetBtn}
                    onClick={() => setTool(t.id)}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
                <button
                  type="button"
                  style={showGuide ? activePresetBtn : presetBtn}
                  onClick={() => setShowGuide((g) => !g)}
                >
                  👁 guide
                </button>
              </div>

              <div className="pixel-maker-stage">
                <div className="pixel-maker-canvas-wrap">
                  <div
                    className="font-maker-canvas-stack"
                    style={{ width: gridSize * displayScale, height: gridSize * displayScale }}
                  >
                    <canvas ref={guideCanvasRef} className="font-maker-guide-canvas" />
                    <canvas
                      ref={canvasRef}
                      className="pixel-maker-canvas font-maker-draw-canvas"
                      onMouseDown={(e) => handleDrawPointerDown(selectedChar, e)}
                      onTouchStart={(e) => handleDrawPointerDown(selectedChar, e)}
                    />
                  </div>
                </div>
                <div className="playground-stage-caption">
                  {gridSize}×{gridSize} · {tool}
                </div>
              </div>

              <div className="save-modal-actions">
                <button type="button" className="save-modal-cancel" onClick={() => setZoomOpen(false)}>
                  close
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="font-maker-preview">
          <div className="pixel-maker-panel-label">// PREVIEW</div>
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="type something…"
            className="font-maker-name-input"
            maxLength={60}
          />
          <div className="font-maker-preview-canvas-wrap">
            <canvas ref={previewCanvasRef} className="font-maker-preview-canvas" />
          </div>
        </div>
      </div>
    </div>
  )
}
