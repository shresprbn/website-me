import { useEffect, useRef, useState } from 'react'
import Nav from '../components/Nav'
import { useModal } from '../components/ModalProvider'
import { outlineBtn, presetBtn, makeActivePreset } from '../lib/controlStyles'
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
  GLYPH_GROUPS,
  FONT_GRID_SIZES,
  FONT_INK,
  GUIDE_FONTS,
  defaultMetrics,
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

const GUIDE_FONT_OPTIONS = [
  { id: 'sans', label: 'sans' },
  { id: 'serif', label: 'serif' },
  { id: 'mono', label: 'mono' },
]

const PREVIEW_BGS = [
  { id: 'light', label: 'light' },
  { id: 'dark', label: 'dark' },
  { id: 'grid', label: 'grid' },
]

const HISTORY_LIMIT = 60

// Fixed tile size for the sheet view — every glyph gets the same size tile
// regardless of grid size, so the sheet lays out consistently either way.
const MINI_SIZE = 108

const activePresetBtn = makeActivePreset('#ff6b9d', 0.08)

function displayScaleForSize(gridSize) {
  return gridSize === 16 ? 20 : 11
}

function safeFileName(name) {
  const trimmed = (name || '').trim() || 'MyPixelFont'
  return trimmed.replace(/[^a-z0-9-_]+/gi, '-')
}

// A readable label for a glyph key — the char itself, but spelled out for the
// ones that don't render well in a tiny button.
function charLabel(ch) {
  if (ch === ' ') return 'space'
  return ch
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
  const glyphsRef = useRef(null)
  const pastRef = useRef([])
  const futureRef = useRef([])
  const preStrokeRef = useRef(null)
  const didChangeRef = useRef(false)

  const [gridSize, setGridSize] = useState(16)
  const [glyphs, setGlyphs] = useState(() => createEmptyFontGlyphs(16))
  const [selectedChar, setSelectedChar] = useState('A')
  const [tool, setTool] = useState('pencil')
  const [fontName, setFontName] = useState('My Pixel Font')
  const [previewText, setPreviewText] = useState('Handgloves 123')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [showGuide, setShowGuide] = useState(true)
  const [guideFont, setGuideFont] = useState('mono')
  const [zoomOpen, setZoomOpen] = useState(false)
  const [metrics, setMetrics] = useState(() => defaultMetrics(16))
  const [metricsOpen, setMetricsOpen] = useState(false)
  const [previewScale, setPreviewScale] = useState(6)
  const [previewBg, setPreviewBg] = useState('light')
  const [clipboard, setClipboard] = useState(null)
  const [past, setPast] = useState([])
  const [future, setFuture] = useState([])

  toolRef.current = tool
  gridSizeRef.current = gridSize
  selectedCharRef.current = selectedChar
  glyphsRef.current = glyphs
  pastRef.current = past
  futureRef.current = future

  const displayScale = displayScaleForSize(gridSize)
  const miniScale = MINI_SIZE / gridSize
  const drawnCount = glyphCompletionCount(glyphs)

  // ── History ────────────────────────────────────────────────────────
  const snapshot = () => ({
    glyphs: structuredClone(glyphsRef.current),
    gridSize: gridSizeRef.current,
    metrics: { ...metrics },
  })

  const commitHistory = (snap) => {
    setPast((p) => [...p, snap].slice(-HISTORY_LIMIT))
    setFuture([])
  }

  const restore = (snap) => {
    gridSizeRef.current = snap.gridSize
    glyphsRef.current = snap.glyphs
    setGridSize(snap.gridSize)
    setGlyphs(snap.glyphs)
    if (snap.metrics) setMetrics(snap.metrics)
  }

  const undo = () => {
    const p = pastRef.current
    if (!p.length) return
    const current = snapshot()
    setFuture((f) => [current, ...f].slice(0, HISTORY_LIMIT))
    setPast(p.slice(0, -1))
    restore(p[p.length - 1])
  }

  const redo = () => {
    const f = futureRef.current
    if (!f.length) return
    const current = snapshot()
    setPast((p) => [...p, current].slice(-HISTORY_LIMIT))
    setFuture(f.slice(1))
    restore(f[0])
  }

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 'z') {
        e.preventDefault()
        e.shiftKey ? redo() : undo()
      } else if (k === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Canvas rendering ───────────────────────────────────────────────
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
    drawGuideToCanvas(canvas, showGuide ? selectedChar : null, gridSize, displayScale, {
      family: guideFont,
      metrics,
      showLines: showGuide,
    })
  }, [selectedChar, gridSize, displayScale, showGuide, guideFont, metrics, zoomOpen])

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
      if (canvas) {
        drawGuideToCanvas(canvas, showGuide ? ch : null, gridSize, miniScale, { family: guideFont })
      }
    }
  }, [gridSize, showGuide, guideFont, miniScale])

  useEffect(() => {
    const canvas = previewCanvasRef.current
    if (!canvas) return
    drawPreviewToCanvas(canvas, previewText, glyphs, gridSize, previewScale, {
      letterSpacing: metrics.letterSpacing,
      ink: previewBg === 'dark' ? '#faf8f3' : FONT_INK,
    })
    canvas.style.width = `${canvas.width}px`
    canvas.style.height = `${canvas.height}px`
  }, [previewText, glyphs, gridSize, previewScale, previewBg, metrics.letterSpacing])

  // ── Drawing ────────────────────────────────────────────────────────
  // Every glyph mutation goes through here so glyphsRef stays in lock-step with
  // React state — a fast drag, and the pre-stroke history snapshot taken on the
  // *next* pointer-down, both need the current grid, not a pending render.
  const commitGlyphs = (next) => {
    glyphsRef.current = next
    setGlyphs(next)
  }

  const applyCell = (ch, x, y) => {
    const currentTool = toolRef.current
    const prev = glyphsRef.current
    const grid = prev[ch]
    let nextGrid = grid
    if (currentTool === 'fill') {
      nextGrid = floodFill(grid, x, y, FONT_INK)
    } else {
      const next = grid.map((row) => row.slice())
      if (currentTool === 'pencil') {
        if (next[y][x] === FONT_INK) return
        next[y][x] = FONT_INK
      } else if (currentTool === 'eraser') {
        if (next[y][x] === null) return
        next[y][x] = null
      }
      nextGrid = next
    }
    if (nextGrid === grid) return
    didChangeRef.current = true
    commitGlyphs({ ...prev, [ch]: nextGrid })
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
    preStrokeRef.current = snapshot()
    didChangeRef.current = false
    drawingRef.current = true
    lastCellRef.current = `${cell.x},${cell.y}`
    applyCell(ch, cell.x, cell.y)
  }

  useEffect(() => {
    const onPointerUp = () => {
      if (didChangeRef.current && preStrokeRef.current) commitHistory(preStrokeRef.current)
      preStrokeRef.current = null
      didChangeRef.current = false
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

  // ── Glyph clipboard + transforms (operate on the focused glyph) ─────
  const copyGlyph = () => {
    setClipboard(structuredClone(glyphsRef.current[selectedChar]))
  }

  const pasteGlyph = () => {
    if (!clipboard) return
    const target = glyphsRef.current[selectedChar]
    if (!target || clipboard.length !== target.length) return
    commitHistory(snapshot())
    commitGlyphs({ ...glyphsRef.current, [selectedChar]: structuredClone(clipboard) })
  }

  const flipGlyph = (axis) => {
    const grid = glyphsRef.current[selectedChar]
    if (!grid || !hasContent(grid)) return
    commitHistory(snapshot())
    const next = grid.map((row) => row.slice())
    if (axis === 'h') next.forEach((row) => row.reverse())
    else next.reverse()
    commitGlyphs({ ...glyphsRef.current, [selectedChar]: next })
  }

  const changeGridSize = async (size) => {
    if (size === gridSize) return
    if (anyGlyphHasContent(glyphs)) {
      const ok = await confirmAction('Changing grid size will clear every letter you\'ve drawn. Continue?', { danger: true })
      if (!ok) return
    }
    commitHistory(snapshot())
    gridSizeRef.current = size
    setGridSize(size)
    commitGlyphs(createEmptyFontGlyphs(size))
    setMetrics(defaultMetrics(size))
    setPreviewScale(size === 16 ? 6 : 3)
  }

  const clearGlyph = async () => {
    const grid = glyphs[selectedChar]
    if (!grid || !hasContent(grid)) return
    const ok = await confirmAction(`Clear "${charLabel(selectedChar)}"?`, { danger: true })
    if (!ok) return
    commitHistory(snapshot())
    commitGlyphs({ ...glyphsRef.current, [selectedChar]: createEmptyGrid(gridSize) })
  }

  const clearAll = async () => {
    if (!anyGlyphHasContent(glyphs)) return
    const ok = await confirmAction('Clear every glyph?', { danger: true })
    if (!ok) return
    commitHistory(snapshot())
    commitGlyphs(createEmptyFontGlyphs(gridSize))
  }

  const setMetric = (key, value) => {
    setMetrics((m) => ({ ...m, [key]: value }))
  }

  const handleExportFont = async () => {
    if (!anyGlyphHasContent(glyphs)) return
    setExporting(true)
    setExportError('')
    try {
      const opentypeMod = await import('opentype.js')
      const opentype = opentypeMod.default ?? opentypeMod
      const font = buildFont(opentype, { glyphs, gridSize, fontName, metrics })
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
    const cols = 10
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

  const glyphActions = (
    <div className="font-maker-glyph-actions">
      <span className="font-maker-glyph-actions-label">{charLabel(selectedChar)}</span>
      <button type="button" style={outlineBtn} onClick={copyGlyph} title="Copy this glyph">
        copy ⧉
      </button>
      <button type="button" style={outlineBtn} onClick={pasteGlyph} disabled={!clipboard} title="Paste onto this glyph">
        paste ⇲
      </button>
      <button type="button" style={outlineBtn} onClick={() => flipGlyph('h')} title="Flip left–right">
        flip ⇋
      </button>
      <button type="button" style={outlineBtn} onClick={() => flipGlyph('v')} title="Flip top–bottom">
        flip ⥯
      </button>
    </div>
  )

  const toolsRow = (
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
      {GUIDE_FONT_OPTIONS.map((g) => (
        <button
          key={g.id}
          type="button"
          style={guideFont === g.id ? activePresetBtn : presetBtn}
          onClick={() => setGuideFont(g.id)}
          title={`Trace over a ${g.label} letterform`}
        >
          {g.label}
        </button>
      ))}
    </div>
  )

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />

      <div className="container pixel-maker-page">
        <div className="playground-header">
          <div className="playground-eyebrow">// FONT MAKER</div>
          <h1 className="playground-title">Draw a pixel font, letter by letter.</h1>
          <p className="playground-lede">
            Digits, upper &amp; lowercase, punctuation. Draw straight on the sheet — every glyph's its
            own little canvas — or zoom in for detail. Copy a finished glyph onto the next one, set
            the metrics, export a real font file.
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
            <button type="button" style={outlineBtn} onClick={undo} disabled={!past.length} title="Undo (Ctrl+Z)">
              undo ↶
            </button>
            <button type="button" style={outlineBtn} onClick={redo} disabled={!future.length} title="Redo (Ctrl+Shift+Z)">
              redo ↷
            </button>
            <button type="button" style={outlineBtn} onClick={clearGlyph}>
              clear glyph ⌫
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
        {exportError && <p className="save-to-gallery-error" role="alert">{exportError}</p>}

        <div className="font-maker-progress">// {drawnCount} / {GLYPH_CHARS.length} DRAWN</div>

        {toolsRow}

        <div className={`font-maker-panel${metricsOpen ? ' open' : ''}`}>
          <button
            type="button"
            className="playground-panel-toggle"
            aria-expanded={metricsOpen}
            onClick={() => setMetricsOpen((o) => !o)}
          >
            <span>
              // METRICS — baseline {metrics.baseline}, x-height {metrics.xHeight}, spacing{' '}
              {metrics.letterSpacing}, {metrics.proportional ? 'proportional' : 'monospace'}
            </span>
            <span className="playground-panel-chevron">▾</span>
          </button>
          <div className="font-maker-metrics">
            <label className="font-maker-metric">
              <span>baseline · {metrics.baseline}</span>
              <input
                type="range"
                min={Math.round(gridSize / 2)}
                max={gridSize}
                value={metrics.baseline}
                onChange={(e) => setMetric('baseline', Number(e.target.value))}
              />
              <span className="font-maker-metric-hint">rows below it become descenders (g, j, p, y)</span>
            </label>
            <label className="font-maker-metric">
              <span>x-height · {metrics.xHeight}</span>
              <input
                type="range"
                min={2}
                max={gridSize - 1}
                value={metrics.xHeight}
                onChange={(e) => setMetric('xHeight', Number(e.target.value))}
              />
              <span className="font-maker-metric-hint">guide line only — where lowercase tops sit</span>
            </label>
            <label className="font-maker-metric">
              <span>letter spacing · {metrics.letterSpacing}</span>
              <input
                type="range"
                min={-2}
                max={8}
                value={metrics.letterSpacing}
                onChange={(e) => setMetric('letterSpacing', Number(e.target.value))}
              />
              <span className="font-maker-metric-hint">extra cells of tracking between glyphs</span>
            </label>
            <label className="font-maker-metric font-maker-metric--check">
              <input
                type="checkbox"
                checked={metrics.proportional}
                onChange={(e) => setMetric('proportional', e.target.checked)}
              />
              <span>
                proportional widths
                <span className="font-maker-metric-hint">
                  narrow glyphs (i, ., !) get a tight advance instead of a full cell
                </span>
              </span>
            </label>
          </div>
        </div>

        {GLYPH_GROUPS.map((group) => (
          <div key={group.id} className="font-maker-group">
            <div className="font-maker-group-label">// {group.label.toUpperCase()}</div>
            <div className="font-maker-sheet">
              {group.chars.map((ch) => (
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
                      aria-label={`Zoom in on ${charLabel(ch)}`}
                      title="Zoom in"
                      onClick={() => {
                        setSelectedChar(ch)
                        setZoomOpen(true)
                      }}
                    >
                      ⤢
                    </button>
                  </div>
                  <div className="font-maker-mini-label">{charLabel(ch)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {zoomOpen && (
          <div className="save-modal-overlay" onClick={() => setZoomOpen(false)}>
            <div
              className="save-modal font-maker-zoom-modal"
              role="dialog"
              aria-modal="true"
              aria-label={`Zoomed editor for ${charLabel(selectedChar)}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="font-maker-zoom-header">
                <button type="button" style={outlineBtn} onClick={() => stepZoomChar(-1)} aria-label="Previous glyph">
                  ◀
                </button>
                <div className="font-maker-zoom-title">{charLabel(selectedChar)}</div>
                <button type="button" style={outlineBtn} onClick={() => stepZoomChar(1)} aria-label="Next glyph">
                  ▶
                </button>
              </div>

              {toolsRow}
              {glyphActions}

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
                  {gridSize}×{gridSize} · {tool} · baseline {metrics.baseline}
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
          <div className="font-maker-preview-head">
            <div className="pixel-maker-panel-label">// PREVIEW</div>
            <label className="font-maker-preview-size">
              size
              <input
                type="range"
                min={2}
                max={gridSize === 16 ? 12 : 8}
                value={previewScale}
                onChange={(e) => setPreviewScale(Number(e.target.value))}
              />
            </label>
            <div className="font-maker-preview-bgs">
              {PREVIEW_BGS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  style={previewBg === b.id ? activePresetBtn : presetBtn}
                  onClick={() => setPreviewBg(b.id)}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="type something…"
            className="font-maker-name-input"
            maxLength={60}
          />
          <div className={`font-maker-preview-canvas-wrap font-maker-preview-canvas-wrap--${previewBg}`}>
            <canvas ref={previewCanvasRef} className="font-maker-preview-canvas" />
          </div>
        </div>
      </div>
    </div>
  )
}
