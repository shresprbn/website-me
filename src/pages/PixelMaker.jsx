import { useEffect, useMemo, useRef, useState } from 'react'
import Nav from '../components/Nav'
import {
  GRID_SIZES,
  MAX_LAYERS,
  DEFAULT_PALETTE,
  createEmptyGrid,
  createLayer,
  createDefaultLayers,
  hasContent,
  hasContentInLayers,
  compositeLayers,
  floodFill,
  exportPng,
  pixelsToBlob,
  drawLayersToCanvas,
  cellFromPointer,
  linePoints,
  rectCells,
  ellipseCells,
} from '../lib/pixelUtils'
import SaveToGallery from '../components/SaveToGallery'
import { useModal } from '../components/ModalProvider'
import { outlineBtn, presetBtn, makeActivePreset } from '../lib/controlStyles'

const TOOLS = [
  { id: 'pencil', label: 'pencil', icon: '✎', key: 'B' },
  { id: 'eraser', label: 'eraser', icon: '⌫', key: 'E' },
  { id: 'fill', label: 'fill', icon: '▣', key: 'G' },
  { id: 'eyedropper', label: 'eyedropper', icon: '◉', key: 'I' },
  { id: 'line', label: 'line', icon: '╱', key: 'L' },
  { id: 'rect', label: 'rect', icon: '▭', key: 'R' },
  { id: 'ellipse', label: 'ellipse', icon: '◯', key: 'O' },
]
const SHAPE_TOOLS = new Set(['line', 'rect', 'ellipse'])

const MAX_PALETTE = 24
const HISTORY_LIMIT = 60
const ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2, 3, 4, 6]
const EXPORT_SCALES = [1, 4, 8, 16]
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/

const activePresetBtn = makeActivePreset('#ff6b9d', 0.08)

const smallBtn = {
  background: 'transparent',
  border: '1px solid #e8e3d8',
  borderRadius: 6,
  padding: '4px 7px',
  fontFamily: "'Space Mono', monospace",
  fontSize: 11,
  color: '#666',
  cursor: 'pointer',
  lineHeight: 1,
}

function displayScaleForSize(gridSize) {
  if (gridSize === 16) return 20
  if (gridSize === 32) return 12
  return 8
}

function nextLayerName(layers) {
  let n = layers.length + 1
  const names = new Set(layers.map((l) => l.name))
  while (names.has(`Layer ${n}`)) n += 1
  return `Layer ${n}`
}

export default function PixelMaker() {
  const { confirmAction, alertUser } = useModal()
  const initial = createDefaultLayers(32)

  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const drawingRef = useRef(false)
  const lastCellRef = useRef(null)
  const toolRef = useRef('pencil')
  const activeColorRef = useRef(DEFAULT_PALETTE[0])
  const gridSizeRef = useRef(32)
  const layersRef = useRef(initial.layers)
  const activeLayerIdRef = useRef(initial.activeLayerId)
  const compositeRef = useRef(compositeLayers(initial.layers))
  const paletteRef = useRef(DEFAULT_PALETTE)
  const mirrorXRef = useRef(false)
  const mirrorYRef = useRef(false)
  const panModeRef = useRef(false)
  const shapeAnchorRef = useRef(null)
  const shapeEndRef = useRef(null)
  const preStrokeRef = useRef(null)
  const didChangeRef = useRef(false)
  const pastRef = useRef([])
  const futureRef = useRef([])
  const panStartRef = useRef(null)

  const [gridSize, setGridSize] = useState(32)
  const [layers, setLayers] = useState(initial.layers)
  const [activeLayerId, setActiveLayerId] = useState(initial.activeLayerId)
  const [palette, setPalette] = useState(DEFAULT_PALETTE)
  const [activeColor, setActiveColor] = useState(DEFAULT_PALETTE[0])
  const [pickerColor, setPickerColor] = useState(DEFAULT_PALETTE[0])
  const [pickerColorText, setPickerColorText] = useState(DEFAULT_PALETTE[0])
  const [tool, setTool] = useState('pencil')
  const [toolsOpen, setToolsOpen] = useState(false)
  const [layersOpen, setLayersOpen] = useState(false)
  const [renameDraft, setRenameDraft] = useState('')
  const [mirrorX, setMirrorX] = useState(false)
  const [mirrorY, setMirrorY] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [onionSkin, setOnionSkin] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [exportScale, setExportScale] = useState(8)
  const [previewCells, setPreviewCells] = useState([])
  const [panMode, setPanMode] = useState(false)
  const [past, setPast] = useState([])
  const [future, setFuture] = useState([])

  toolRef.current = tool
  activeColorRef.current = activeColor
  gridSizeRef.current = gridSize
  layersRef.current = layers
  activeLayerIdRef.current = activeLayerId
  paletteRef.current = palette
  mirrorXRef.current = mirrorX
  mirrorYRef.current = mirrorY
  panModeRef.current = panMode
  pastRef.current = past
  futureRef.current = future

  const activeLayer = layers.find((l) => l.id === activeLayerId) ?? layers[0]
  const composite = useMemo(() => compositeLayers(layers), [layers])
  compositeRef.current = composite

  const displayScale = displayScaleForSize(gridSize) * zoom

  useEffect(() => {
    if (activeLayer) setRenameDraft(activeLayer.name)
  }, [activeLayer?.id, activeLayer?.name])

  useEffect(() => {
    setPickerColorText(pickerColor)
  }, [pickerColor])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawLayersToCanvas(canvas, layers, displayScale, {
      activeLayerId,
      onionSkin,
      preview: previewCells.length ? { cells: previewCells, color: activeColor } : null,
    })
  }, [layers, displayScale, activeLayerId, onionSkin, previewCells, activeColor])

  // ── History ────────────────────────────────────────────────────────
  const snapshot = () => ({
    gridSize: gridSizeRef.current,
    layers: structuredClone(layersRef.current),
    activeLayerId: activeLayerIdRef.current,
  })

  const commitHistory = (snap) => {
    setPast((p) => [...p, snap].slice(-HISTORY_LIMIT))
    setFuture([])
  }

  const restore = (snap) => {
    gridSizeRef.current = snap.gridSize
    layersRef.current = snap.layers
    activeLayerIdRef.current = snap.activeLayerId
    setGridSize(snap.gridSize)
    setLayers(snap.layers)
    setActiveLayerId(snap.activeLayerId)
  }

  const undo = () => {
    const p = pastRef.current
    if (!p.length) return
    // Snapshot the current doc *before* restore() mutates the refs — a lazy
    // snapshot() inside the setState updater would run post-restore and capture
    // the wrong (already-reverted) state.
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

  const zoomBy = (dir) => {
    setZoom((z) => {
      const i = ZOOM_STEPS.indexOf(z)
      const from = i < 0 ? ZOOM_STEPS.indexOf(1) : i
      return ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, from + dir))]
    })
  }

  // ── Writing pixels ─────────────────────────────────────────────────
  const expandMirror = (cells, size) => {
    if (!mirrorXRef.current && !mirrorYRef.current) return cells
    const out = []
    const seen = new Set()
    for (const { x, y } of cells) {
      const variants = [{ x, y }]
      if (mirrorXRef.current) variants.push({ x: size - 1 - x, y })
      if (mirrorYRef.current) variants.push({ x, y: size - 1 - y })
      if (mirrorXRef.current && mirrorYRef.current)
        variants.push({ x: size - 1 - x, y: size - 1 - y })
      for (const v of variants) {
        const k = `${v.x},${v.y}`
        if (!seen.has(k)) {
          seen.add(k)
          out.push(v)
        }
      }
    }
    return out
  }

  // Computes the next active-layer grid synchronously and writes it, keeping
  // layersRef in step so successive segments of one stroke stack correctly
  // instead of each starting from a stale grid.
  const writeCells = (cells, erase) => {
    const size = gridSizeRef.current
    const activeId = activeLayerIdRef.current
    const layer = layersRef.current.find((l) => l.id === activeId)
    if (!layer) return
    const val = erase ? null : activeColorRef.current
    const nextPixels = layer.pixels.map((row) => row.slice())
    let changed = false
    for (const { x, y } of expandMirror(cells, size)) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue
      if (nextPixels[y][x] !== val) {
        nextPixels[y][x] = val
        changed = true
      }
    }
    if (!changed) return
    didChangeRef.current = true
    layersRef.current = layersRef.current.map((l) =>
      l.id === activeId ? { ...l, pixels: nextPixels } : l,
    )
    setLayers(layersRef.current)
  }

  const applyStroke = (from, to) => {
    const erase = toolRef.current === 'eraser'
    writeCells(from ? linePoints(from.x, from.y, to.x, to.y) : [to], erase)
  }

  const shapeCells = (a, b) => {
    if (!a || !b) return []
    const t = toolRef.current
    if (t === 'line') return linePoints(a.x, a.y, b.x, b.y)
    if (t === 'rect') return rectCells(a.x, a.y, b.x, b.y)
    if (t === 'ellipse') return ellipseCells(a.x, a.y, b.x, b.y)
    return []
  }

  // ── Pointer handling (draw + shapes) ───────────────────────────────
  useEffect(() => {
    const endStroke = () => {
      const t = toolRef.current
      if (SHAPE_TOOLS.has(t) && shapeAnchorRef.current) {
        writeCells(shapeCells(shapeAnchorRef.current, shapeEndRef.current || shapeAnchorRef.current), false)
        shapeAnchorRef.current = null
        shapeEndRef.current = null
        setPreviewCells([])
      }
      if (didChangeRef.current && preStrokeRef.current) commitHistory(preStrokeRef.current)
      preStrokeRef.current = null
      didChangeRef.current = false
      drawingRef.current = false
      lastCellRef.current = null
    }

    const onMove = (e) => {
      if (!drawingRef.current) return
      const t = toolRef.current
      if (t === 'fill' || t === 'eyedropper') return
      const canvas = canvasRef.current
      if (!canvas) return
      const clientX = e.clientX ?? e.touches?.[0]?.clientX
      const clientY = e.clientY ?? e.touches?.[0]?.clientY
      if (clientX == null || clientY == null) return
      const cell = cellFromPointer(canvas, clientX, clientY, gridSizeRef.current)
      if (!cell) return

      if (SHAPE_TOOLS.has(t)) {
        const end = shapeEndRef.current
        if (end && end.x === cell.x && end.y === cell.y) return
        shapeEndRef.current = cell
        setPreviewCells(shapeCells(shapeAnchorRef.current, cell))
        return
      }

      const last = lastCellRef.current
      if (last && last.x === cell.x && last.y === cell.y) return
      applyStroke(last, cell)
      lastCellRef.current = cell
    }

    window.addEventListener('mouseup', endStroke)
    window.addEventListener('touchend', endStroke)
    window.addEventListener('touchcancel', endStroke)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onMove, { passive: false })
    return () => {
      window.removeEventListener('mouseup', endStroke)
      window.removeEventListener('touchend', endStroke)
      window.removeEventListener('touchcancel', endStroke)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onMove)
    }
  }, [])

  // ── Keyboard: tool shortcuts + undo/redo + zoom ────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        e.shiftKey ? redo() : undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        zoomBy(1)
        return
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        zoomBy(-1)
        return
      }
      if (e.key === '0') {
        e.preventDefault()
        setZoom(1)
        return
      }

      const map = { b: 'pencil', e: 'eraser', g: 'fill', i: 'eyedropper', l: 'line', r: 'rect', o: 'ellipse' }
      const next = map[e.key.toLowerCase()]
      if (next) {
        e.preventDefault()
        setTool(next)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Space-to-pan ──────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      if (e.code !== 'Space') return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      setPanMode(true)
    }
    const up = (e) => {
      if (e.code === 'Space') setPanMode(false)
    }
    const onMove = (e) => {
      const start = panStartRef.current
      const w = wrapRef.current
      if (!start || !w) return
      w.scrollLeft = start.sl - (e.clientX - start.x)
      w.scrollTop = start.st - (e.clientY - start.y)
    }
    const onUp = () => {
      panStartRef.current = null
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  // Switching tools mid-gesture: drop any half-drawn shape preview.
  useEffect(() => {
    setPreviewCells([])
    shapeAnchorRef.current = null
    shapeEndRef.current = null
    drawingRef.current = false
  }, [tool])

  const onWrapMouseDown = (e) => {
    if (!panModeRef.current || !wrapRef.current) return
    e.preventDefault()
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      sl: wrapRef.current.scrollLeft,
      st: wrapRef.current.scrollTop,
    }
  }

  const updateLayers = (mapper) => setLayers((prev) => mapper(prev))

  const updateActiveLayerPixels = (updater) => {
    const id = activeLayerIdRef.current
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === id ? { ...layer, pixels: updater(layer.pixels) } : layer,
      ),
    )
  }

  const handlePointerDown = async (e) => {
    if (panModeRef.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    const clientX = e.clientX ?? e.touches?.[0]?.clientX
    const clientY = e.clientY ?? e.touches?.[0]?.clientY
    if (clientX == null || clientY == null) return

    const size = gridSizeRef.current
    const cell = cellFromPointer(canvas, clientX, clientY, size)
    if (!cell) return

    const currentTool = toolRef.current
    const color = activeColorRef.current

    if (currentTool === 'eyedropper') {
      const picked = compositeRef.current[cell.y]?.[cell.x]
      if (picked) {
        setActiveColor(picked)
        setPickerColor(picked)
        if (!paletteRef.current.includes(picked)) {
          const add = await confirmAction('Add this color to your palette?')
          if (add && paletteRef.current.length < MAX_PALETTE) {
            setPalette((p) => [...p, picked])
          }
        }
      }
      return
    }

    if (currentTool === 'fill') {
      const activeId = activeLayerIdRef.current
      const layer = layersRef.current.find((l) => l.id === activeId)
      if (!layer) return
      const filled = floodFill(layer.pixels, cell.x, cell.y, color)
      if (filled === layer.pixels) return
      commitHistory(snapshot())
      layersRef.current = layersRef.current.map((l) =>
        l.id === activeId ? { ...l, pixels: filled } : l,
      )
      setLayers(layersRef.current)
      return
    }

    preStrokeRef.current = snapshot()
    didChangeRef.current = false
    drawingRef.current = true

    if (SHAPE_TOOLS.has(currentTool)) {
      shapeAnchorRef.current = cell
      shapeEndRef.current = cell
      setPreviewCells(shapeCells(cell, cell))
      return
    }

    lastCellRef.current = cell
    applyStroke(null, cell)
  }

  const changeGridSize = async (size) => {
    if (size === gridSize) return
    if (hasContentInLayers(layers)) {
      const ok = await confirmAction('Changing grid size will clear your art. Continue?', { danger: true })
      if (!ok) return
    }
    commitHistory(snapshot())
    const next = createDefaultLayers(size)
    setGridSize(size)
    setLayers(next.layers)
    setActiveLayerId(next.activeLayerId)
    setZoom(1)
  }

  const clearLayer = async () => {
    if (!activeLayer || !hasContent(activeLayer.pixels)) return
    const ok = await confirmAction(`Clear ${activeLayer.name}?`, { danger: true })
    if (!ok) return
    commitHistory(snapshot())
    updateActiveLayerPixels(() => createEmptyGrid(gridSize))
  }

  const clearAll = async () => {
    if (!hasContentInLayers(layers)) return
    const ok = await confirmAction('Clear all layers?', { danger: true })
    if (!ok) return
    commitHistory(snapshot())
    const next = createDefaultLayers(gridSize)
    setLayers(next.layers)
    setActiveLayerId(next.activeLayerId)
  }

  const addLayer = async () => {
    if (layers.length >= MAX_LAYERS) {
      await alertUser(`Max ${MAX_LAYERS} layers.`)
      return
    }
    commitHistory(snapshot())
    const layer = createLayer(gridSize, nextLayerName(layers))
    setLayers((prev) => [...prev, layer])
    setActiveLayerId(layer.id)
  }

  const deleteLayer = async (id) => {
    if (layers.length <= 1) return
    const layer = layers.find((l) => l.id === id)
    if (!layer) return
    if (hasContent(layer.pixels)) {
      const ok = await confirmAction(`Delete ${layer.name}?`, { danger: true })
      if (!ok) return
    }
    commitHistory(snapshot())
    const idx = layers.findIndex((l) => l.id === id)
    const next = layers.filter((l) => l.id !== id)
    setLayers(next)
    if (activeLayerId === id) {
      setActiveLayerId(next[Math.max(0, idx - 1)]?.id ?? next[0].id)
    }
  }

  const toggleVisibility = (id) => {
    commitHistory(snapshot())
    updateLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    )
  }

  const moveLayer = (id, direction) => {
    const idx = layers.findIndex((l) => l.id === id)
    const target = idx + direction
    if (idx < 0 || target < 0 || target >= layers.length) return
    commitHistory(snapshot())
    updateLayers((prev) => {
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  const saveRename = () => {
    const trimmed = renameDraft.trim()
    if (!trimmed || !activeLayer || trimmed === activeLayer.name) return
    commitHistory(snapshot())
    updateLayers((prev) =>
      prev.map((l) => (l.id === activeLayer.id ? { ...l, name: trimmed } : l)),
    )
  }

  const addToPalette = async () => {
    const normalized = pickerColor.toLowerCase()
    if (palette.includes(normalized)) {
      setActiveColor(normalized)
      return
    }
    if (palette.length >= MAX_PALETTE) {
      await alertUser(`Palette is full (max ${MAX_PALETTE} colors).`)
      return
    }
    setPalette((p) => [...p, normalized])
    setActiveColor(normalized)
  }

  const removeFromPalette = () => {
    if (palette.length <= 1) return
    const idx = palette.indexOf(activeColor)
    const next = palette.filter((c) => c !== activeColor)
    setPalette(next)
    setActiveColor(next[Math.max(0, idx - 1)] ?? next[0])
    setPickerColor(next[Math.max(0, idx - 1)] ?? next[0])
  }

  const selectSwatch = (color) => {
    setActiveColor(color)
    setPickerColor(color)
  }

  const onHexInput = (raw) => {
    let v = raw.trim().toLowerCase()
    if (v && !v.startsWith('#')) v = `#${v}`
    setPickerColorText(v)
    if (HEX_RE.test(v)) setPickerColor(v)
  }

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />

      <div className="container pixel-maker-page">
        <div className="playground-header">
          <div className="playground-eyebrow">// PIXEL MAKER</div>
          <h1 className="playground-title">Paint tiny things.</h1>
          <p className="playground-lede">
            A small grid editor — layers, palette, shape tools, export a PNG.
          </p>
        </div>

        <div className="pixel-maker-toolbar">
          <div className="pixel-maker-size-group">
            {GRID_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                style={gridSize === size ? activePresetBtn : presetBtn}
                onClick={() => changeGridSize(size)}
              >
                {size}×{size}
              </button>
            ))}
          </div>
          <div className="pixel-maker-actions">
            <button type="button" style={outlineBtn} onClick={undo} disabled={!past.length} title="Undo (Ctrl+Z)">
              undo ↶
            </button>
            <button type="button" style={outlineBtn} onClick={redo} disabled={!future.length} title="Redo (Ctrl+Shift+Z)">
              redo ↷
            </button>
            <button type="button" style={outlineBtn} onClick={clearLayer}>
              clear layer ⌫
            </button>
            <button type="button" style={outlineBtn} onClick={clearAll}>
              clear all ↻
            </button>
            <div className="pixel-maker-export-scale" role="group" aria-label="PNG export scale">
              <span className="pixel-maker-panel-label" style={{ margin: 0 }}>PNG</span>
              {EXPORT_SCALES.map((s) => (
                <button
                  key={s}
                  type="button"
                  style={s === exportScale ? activePresetBtn : presetBtn}
                  onClick={() => setExportScale(s)}
                >
                  {s}×
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn-pill dark"
              style={{ padding: '11px 22px', fontSize: 13, border: 'none' }}
              onClick={() => exportPng(composite, exportScale)}
            >
              download PNG ↓
            </button>
            <SaveToGallery
              kind="pixel"
              hasContent={() => hasContentInLayers(layers)}
              getData={() => ({ gridSize, layers })}
              getThumbnailBlob={() => pixelsToBlob(composite, 8)}
            />
          </div>
        </div>

        <div className="pixel-maker-stage-row">
          <aside className={`pixel-maker-sidebar pixel-maker-sidebar--left${toolsOpen ? ' open' : ''}`}>
            <button
              type="button"
              className="playground-panel-toggle"
              aria-expanded={toolsOpen}
              onClick={() => setToolsOpen((o) => !o)}
            >
              <span>// TOOLS & PALETTE</span>
              <span className="playground-panel-chevron">▾</span>
            </button>

            <div className="pixel-maker-sidebar-body">
              <div className="pixel-maker-panel">
                <div className="pixel-maker-panel-label">// TOOLS</div>
                <div className="pixel-maker-tools">
                  {TOOLS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`pixel-maker-tool${tool === t.id ? ' selected' : ''}`}
                      title={`${t.label} (${t.key})`}
                      onClick={() => setTool(t.id)}
                    >
                      <span className="pixel-maker-tool-icon">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="pixel-maker-toggles">
                  <button
                    type="button"
                    style={mirrorX ? activePresetBtn : presetBtn}
                    onClick={() => setMirrorX((v) => !v)}
                    aria-pressed={mirrorX}
                  >
                    ⟷ mirror x
                  </button>
                  <button
                    type="button"
                    style={mirrorY ? activePresetBtn : presetBtn}
                    onClick={() => setMirrorY((v) => !v)}
                    aria-pressed={mirrorY}
                  >
                    ↕ mirror y
                  </button>
                  <button
                    type="button"
                    style={showGrid ? activePresetBtn : presetBtn}
                    onClick={() => setShowGrid((v) => !v)}
                    aria-pressed={showGrid}
                  >
                    ▦ grid
                  </button>
                  <button
                    type="button"
                    style={onionSkin ? activePresetBtn : presetBtn}
                    onClick={() => setOnionSkin((v) => !v)}
                    aria-pressed={onionSkin}
                  >
                    ◍ onion
                  </button>
                </div>

                <div className="pixel-maker-hint">
                  B pencil · E eraser · G fill · I eyedropper · L/R/O line/rect/ellipse
                  <br />
                  Ctrl+Z undo · +/− zoom · hold Space to pan
                </div>
              </div>

              <div className="pixel-maker-panel">
                <div className="pixel-maker-panel-label">// PALETTE</div>
                <div className="pixel-maker-swatches">
                  {palette.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`pixel-maker-swatch${activeColor === color ? ' selected' : ''}`}
                      style={{ background: color }}
                      title={color}
                      onClick={() => selectSwatch(color)}
                    />
                  ))}
                </div>
                <div className="pixel-maker-palette-controls">
                  <input
                    type="color"
                    value={pickerColor}
                    onChange={(e) => setPickerColor(e.target.value.toLowerCase())}
                    className="pixel-maker-color-input"
                    aria-label="Pick color"
                  />
                  <input
                    type="text"
                    value={pickerColorText}
                    onChange={(e) => onHexInput(e.target.value)}
                    className="pixel-maker-hex-input"
                    aria-label="Hex color"
                    spellCheck={false}
                    maxLength={7}
                  />
                  <button type="button" style={presetBtn} onClick={addToPalette}>
                    + add
                  </button>
                  <button
                    type="button"
                    style={outlineBtn}
                    onClick={removeFromPalette}
                    disabled={palette.length <= 1}
                  >
                    × remove
                  </button>
                </div>
                <div className="pixel-maker-active-color">
                  active: <span style={{ color: activeColor }}>{activeColor}</span>
                </div>
              </div>
            </div>
          </aside>

          <div className="pixel-maker-stage">
            <div className="pixel-maker-zoombar">
              <button type="button" style={smallBtn} onClick={() => zoomBy(-1)} aria-label="Zoom out">
                −
              </button>
              <span style={{ minWidth: 38, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
              <button type="button" style={smallBtn} onClick={() => zoomBy(1)} aria-label="Zoom in">
                +
              </button>
              <button type="button" style={smallBtn} onClick={() => setZoom(1)}>
                reset
              </button>
            </div>
            <div
              className="pixel-maker-canvas-wrap"
              ref={wrapRef}
              onMouseDown={onWrapMouseDown}
              style={panMode ? { cursor: 'grab' } : undefined}
            >
              <div
                className="pixel-maker-canvas-stack"
                style={{ width: gridSize * displayScale, height: gridSize * displayScale }}
              >
                <canvas
                  ref={canvasRef}
                  className="pixel-maker-canvas"
                  onMouseDown={handlePointerDown}
                  onTouchStart={handlePointerDown}
                />
                {showGrid && (
                  <div
                    className="pixel-maker-grid-overlay"
                    style={{ backgroundSize: `${displayScale}px ${displayScale}px` }}
                  />
                )}
              </div>
            </div>
            <div className="playground-stage-caption">
              {gridSize}×{gridSize} · {tool} · {Math.round(zoom * 100)}%
              {mirrorX || mirrorY ? ` · mirror ${mirrorX ? 'x' : ''}${mirrorY ? 'y' : ''}` : ''} ·{' '}
              {activeLayer?.name ?? 'Layer'}
              {activeLayer && !activeLayer.visible ? ' (hidden)' : ''}
            </div>
          </div>

          <aside className={`pixel-maker-sidebar pixel-maker-sidebar--right${layersOpen ? ' open' : ''}`}>
            <button
              type="button"
              className="playground-panel-toggle"
              aria-expanded={layersOpen}
              onClick={() => setLayersOpen((o) => !o)}
            >
              <span>// LAYERS</span>
              <span className="playground-panel-chevron">▾</span>
            </button>

            <div className="pixel-maker-sidebar-body">
              <div className="pixel-maker-panel">
                <div className="pixel-maker-panel-header">
                  <div className="pixel-maker-panel-label">// LAYERS</div>
                  <button type="button" style={presetBtn} onClick={addLayer}>
                    + add
                  </button>
                </div>
                <div className="pixel-maker-layers">
                  {[...layers].reverse().map((layer) => {
                    const idx = layers.findIndex((l) => l.id === layer.id)
                    const isActive = layer.id === activeLayerId
                    const isTop = idx === layers.length - 1
                    const isBottom = idx === 0
                    return (
                      <div
                        key={layer.id}
                        className={`pixel-maker-layer-row${isActive ? ' active' : ''}${layer.visible ? '' : ' hidden-layer'}`}
                        onClick={() => setActiveLayerId(layer.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setActiveLayerId(layer.id)
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="pixel-maker-layer-main">
                          {isActive ? (
                            <input
                              type="text"
                              className="pixel-maker-layer-name-input"
                              value={renameDraft}
                              onChange={(e) => setRenameDraft(e.target.value)}
                              onBlur={saveRename}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  saveRename()
                                  e.currentTarget.blur()
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="pixel-maker-layer-name">{layer.name}</span>
                          )}
                        </div>
                        <div
                          className="pixel-maker-layer-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            style={smallBtn}
                            title={layer.visible ? 'Hide layer' : 'Show layer'}
                            onClick={() => toggleVisibility(layer.id)}
                          >
                            {layer.visible ? '👁' : '○'}
                          </button>
                          <button
                            type="button"
                            style={smallBtn}
                            title="Move up"
                            disabled={isTop}
                            onClick={() => moveLayer(layer.id, 1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            style={smallBtn}
                            title="Move down"
                            disabled={isBottom}
                            onClick={() => moveLayer(layer.id, -1)}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            style={smallBtn}
                            title="Delete layer"
                            disabled={layers.length <= 1}
                            onClick={() => deleteLayer(layer.id)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
