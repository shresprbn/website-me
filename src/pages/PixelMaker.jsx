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
  drawGridToCanvas,
  cellFromPointer,
} from '../lib/pixelUtils'

const TOOLS = [
  { id: 'pencil', label: 'pencil', icon: '✎' },
  { id: 'eraser', label: 'eraser', icon: '⌫' },
  { id: 'fill', label: 'fill', icon: '▣' },
  { id: 'eyedropper', label: 'eyedropper', icon: '◉' },
]

const MAX_PALETTE = 24

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
  const initial = createDefaultLayers(32)

  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastCellRef = useRef(null)
  const toolRef = useRef('pencil')
  const activeColorRef = useRef(DEFAULT_PALETTE[0])
  const gridSizeRef = useRef(32)
  const layersRef = useRef(initial.layers)
  const activeLayerIdRef = useRef(initial.activeLayerId)
  const compositeRef = useRef(compositeLayers(initial.layers))
  const paletteRef = useRef(DEFAULT_PALETTE)

  const [gridSize, setGridSize] = useState(32)
  const [layers, setLayers] = useState(initial.layers)
  const [activeLayerId, setActiveLayerId] = useState(initial.activeLayerId)
  const [palette, setPalette] = useState(DEFAULT_PALETTE)
  const [activeColor, setActiveColor] = useState(DEFAULT_PALETTE[0])
  const [pickerColor, setPickerColor] = useState(DEFAULT_PALETTE[0])
  const [tool, setTool] = useState('pencil')
  const [toolsOpen, setToolsOpen] = useState(false)
  const [layersOpen, setLayersOpen] = useState(false)
  const [renameDraft, setRenameDraft] = useState('')

  toolRef.current = tool
  activeColorRef.current = activeColor
  gridSizeRef.current = gridSize
  layersRef.current = layers
  activeLayerIdRef.current = activeLayerId
  paletteRef.current = palette

  const activeLayer = layers.find((l) => l.id === activeLayerId) ?? layers[0]
  const composite = useMemo(() => compositeLayers(layers), [layers])
  compositeRef.current = composite

  const displayScale = displayScaleForSize(gridSize)

  useEffect(() => {
    if (activeLayer) setRenameDraft(activeLayer.name)
  }, [activeLayer?.id, activeLayer?.name])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawGridToCanvas(canvas, composite, displayScale)
  }, [composite, displayScale])

  const updateLayers = (mapper) => setLayers((prev) => mapper(prev))

  const updateActiveLayerPixels = (updater) => {
    const id = activeLayerIdRef.current
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === id ? { ...layer, pixels: updater(layer.pixels) } : layer,
      ),
    )
  }

  const applyCell = (x, y) => {
    const currentTool = toolRef.current
    const color = activeColorRef.current
    updateActiveLayerPixels((prev) => {
      const next = prev.map((row) => row.slice())
      if (currentTool === 'pencil') {
        if (next[y][x] === color) return prev
        next[y][x] = color
      } else if (currentTool === 'eraser') {
        if (next[y][x] === null) return prev
        next[y][x] = null
      }
      return next
    })
  }

  useEffect(() => {
    const onPointerUp = () => {
      drawingRef.current = false
      lastCellRef.current = null
    }

    const onPointerMove = (e) => {
      const currentTool = toolRef.current
      if (!drawingRef.current || currentTool === 'fill' || currentTool === 'eyedropper') return
      const canvas = canvasRef.current
      if (!canvas) return

      const clientX = e.clientX ?? e.touches?.[0]?.clientX
      const clientY = e.clientY ?? e.touches?.[0]?.clientY
      if (clientX == null || clientY == null) return

      const cell = cellFromPointer(canvas, clientX, clientY, gridSizeRef.current)
      if (!cell) return

      const key = `${cell.x},${cell.y}`
      if (lastCellRef.current === key) return
      lastCellRef.current = key
      applyCell(cell.x, cell.y)
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
  }, [])

  const handlePointerDown = (e) => {
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
    const currentLayers = layersRef.current
    const activeId = activeLayerIdRef.current
    const currentComposite = compositeRef.current
    const currentPalette = paletteRef.current
    const active = currentLayers.find((l) => l.id === activeId)

    if (currentTool === 'fill' && active) {
      updateActiveLayerPixels((pixels) => floodFill(pixels, cell.x, cell.y, color))
      return
    }

    if (currentTool === 'eyedropper') {
      const picked = currentComposite[cell.y][cell.x]
      if (picked) {
        setActiveColor(picked)
        setPickerColor(picked)
        if (!currentPalette.includes(picked)) {
          const add = window.confirm('Add this color to your palette?')
          if (add && currentPalette.length < MAX_PALETTE) {
            setPalette((p) => [...p, picked])
          }
        }
      }
      return
    }

    drawingRef.current = true
    lastCellRef.current = `${cell.x},${cell.y}`
    applyCell(cell.x, cell.y)
  }

  const changeGridSize = (size) => {
    if (size === gridSize) return
    if (hasContentInLayers(layers)) {
      const ok = window.confirm('Changing grid size will clear your art. Continue?')
      if (!ok) return
    }
    const next = createDefaultLayers(size)
    setGridSize(size)
    setLayers(next.layers)
    setActiveLayerId(next.activeLayerId)
  }

  const clearLayer = () => {
    if (!activeLayer || !hasContent(activeLayer.pixels)) return
    const ok = window.confirm(`Clear ${activeLayer.name}?`)
    if (!ok) return
    updateActiveLayerPixels(() => createEmptyGrid(gridSize))
  }

  const clearAll = () => {
    if (!hasContentInLayers(layers)) return
    const ok = window.confirm('Clear all layers?')
    if (!ok) return
    const next = createDefaultLayers(gridSize)
    setLayers(next.layers)
    setActiveLayerId(next.activeLayerId)
  }

  const addLayer = () => {
    if (layers.length >= MAX_LAYERS) {
      window.alert(`Max ${MAX_LAYERS} layers.`)
      return
    }
    const layer = createLayer(gridSize, nextLayerName(layers))
    setLayers((prev) => [...prev, layer])
    setActiveLayerId(layer.id)
  }

  const deleteLayer = (id) => {
    if (layers.length <= 1) return
    const layer = layers.find((l) => l.id === id)
    if (!layer) return
    if (hasContent(layer.pixels)) {
      const ok = window.confirm(`Delete ${layer.name}?`)
      if (!ok) return
    }
    const idx = layers.findIndex((l) => l.id === id)
    const next = layers.filter((l) => l.id !== id)
    setLayers(next)
    if (activeLayerId === id) {
      setActiveLayerId(next[Math.max(0, idx - 1)]?.id ?? next[0].id)
    }
  }

  const toggleVisibility = (id) => {
    updateLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    )
  }

  const moveLayer = (id, direction) => {
    updateLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id)
      const target = idx + direction
      if (idx < 0 || target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  const saveRename = () => {
    const trimmed = renameDraft.trim()
    if (!trimmed || !activeLayer) return
    updateLayers((prev) =>
      prev.map((l) => (l.id === activeLayer.id ? { ...l, name: trimmed } : l)),
    )
  }

  const addToPalette = () => {
    const normalized = pickerColor.toLowerCase()
    if (palette.includes(normalized)) {
      setActiveColor(normalized)
      return
    }
    if (palette.length >= MAX_PALETTE) {
      window.alert(`Palette is full (max ${MAX_PALETTE} colors).`)
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

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />

      <div className="container pixel-maker-page">
        <div className="playground-header">
          <div className="playground-eyebrow">// PIXEL MAKER</div>
          <h1 className="playground-title">Paint tiny things.</h1>
          <p className="playground-lede">
            A small grid editor — layers, palette, export a PNG.
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
            <button type="button" style={outlineBtn} onClick={clearLayer}>
              clear layer ⌫
            </button>
            <button type="button" style={outlineBtn} onClick={clearAll}>
              clear all ↻
            </button>
            <button
              type="button"
              className="btn-pill dark"
              style={{ padding: '11px 22px', fontSize: 13, border: 'none' }}
              onClick={() => exportPng(composite)}
            >
              download PNG ↓
            </button>
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
                      onClick={() => setTool(t.id)}
                    >
                      <span className="pixel-maker-tool-icon">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
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
            <div className="pixel-maker-canvas-wrap">
              <canvas
                ref={canvasRef}
                className="pixel-maker-canvas"
                onMouseDown={handlePointerDown}
                onTouchStart={handlePointerDown}
              />
            </div>
            <div className="playground-stage-caption">
              {gridSize}×{gridSize} · {tool} · {activeLayer?.name ?? 'Layer'}
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
