import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav'
import { outlineBtn, presetBtn, makeActivePreset } from '../lib/controlStyles'
import { linePoints } from '../lib/pixelUtils'
import {
  PATTERNS,
  createGrid,
  randomGrid,
  step,
  population,
  stampPattern,
} from '../lib/lifeUtils'

const ACCENT = '#4ecdc4'
const activeBtn = makeActivePreset(ACCENT)

const CELL = 13
const DPR = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1

const SPEEDS = [
  { id: 'slow', label: 'slow', ms: 220 },
  { id: 'med', label: 'med', ms: 110 },
  { id: 'fast', label: 'fast', ms: 55 },
  { id: 'max', label: 'max', ms: 16 },
]

function computeDims(width) {
  const avail = Math.min(width - 48, 1120)
  const cols = Math.max(30, Math.min(110, Math.floor(avail / CELL)))
  const rows = Math.max(24, Math.min(64, Math.round(cols * 0.62)))
  return { cols, rows }
}

export default function GameOfLife() {
  // Locked on mount so a resize doesn't wipe the board.
  const [{ cols, rows }] = useState(() => computeDims(window.innerWidth))

  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState('med')
  const [wrap, setWrap] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [generation, setGeneration] = useState(0)
  const [pop, setPop] = useState(0)

  const canvasRef = useRef(null)
  const gridRef = useRef(null)
  const runningRef = useRef(false)
  const speedRef = useRef(speed)
  const wrapRef = useRef(wrap)
  const showGridRef = useRef(showGrid)
  const drawingRef = useRef(false)
  const paintValRef = useRef(1)
  const lastCellRef = useRef(null)

  runningRef.current = running
  speedRef.current = speed
  wrapRef.current = wrap
  showGridRef.current = showGrid

  const boardW = cols * CELL
  const boardH = rows * CELL

  // ── Drawing ───────────────────────────────────────────────────────
  const draw = () => {
    const canvas = canvasRef.current
    const grid = gridRef.current
    if (!canvas || !grid) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    ctx.clearRect(0, 0, boardW, boardH)

    ctx.fillStyle = '#faf8f3'
    ctx.fillRect(0, 0, boardW, boardH)

    if (showGridRef.current) {
      ctx.strokeStyle = 'rgba(20, 20, 20, .06)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = 0; x <= cols; x++) {
        ctx.moveTo(x * CELL + 0.5, 0)
        ctx.lineTo(x * CELL + 0.5, boardH)
      }
      for (let y = 0; y <= rows; y++) {
        ctx.moveTo(0, y * CELL + 0.5)
        ctx.lineTo(boardW, y * CELL + 0.5)
      }
      ctx.stroke()
    }

    ctx.fillStyle = ACCENT
    for (let y = 0; y < rows; y++) {
      const row = grid[y]
      for (let x = 0; x < cols; x++) {
        if (row[x]) ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2)
      }
    }
  }

  const syncStats = () => {
    setPop(population(gridRef.current))
  }

  // ── Sim ───────────────────────────────────────────────────────────
  const tick = () => {
    gridRef.current = step(gridRef.current, cols, rows, wrapRef.current)
    setGeneration((g) => g + 1)
    syncStats()
    draw()
  }

  useEffect(() => {
    gridRef.current = stampPattern(cols, rows, PATTERNS.find((p) => p.id === 'gun').cells, { anchor: 'left' })
    syncStats()
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!running) return
    const ms = SPEEDS.find((s) => s.id === speed)?.ms ?? 110
    const id = setInterval(tick, ms)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, speed])

  useEffect(() => {
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGrid])

  // ── Board ops ─────────────────────────────────────────────────────
  const clear = () => {
    gridRef.current = createGrid(cols, rows)
    setGeneration(0)
    setRunning(false)
    syncStats()
    draw()
  }

  const randomize = () => {
    gridRef.current = randomGrid(cols, rows, 0.32)
    setGeneration(0)
    syncStats()
    draw()
  }

  const loadPattern = (cells, id) => {
    gridRef.current = stampPattern(cols, rows, cells, { anchor: id === 'gun' ? 'left' : 'center' })
    setGeneration(0)
    setRunning(false)
    syncStats()
    draw()
  }

  const stepOnce = () => {
    setRunning(false)
    tick()
  }

  // ── Pointer painting ──────────────────────────────────────────────
  const cellAt = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.floor(((clientX - rect.left) / rect.width) * cols)
    const y = Math.floor(((clientY - rect.top) / rect.height) * rows)
    if (x < 0 || y < 0 || x >= cols || y >= rows) return null
    return { x, y }
  }

  const paintCell = (x, y) => {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return
    if (gridRef.current[y][x] !== paintValRef.current) {
      gridRef.current[y][x] = paintValRef.current
    }
  }

  const onPointerDown = (e) => {
    e.preventDefault()
    const p = e.touches?.[0] || e
    const cell = cellAt(p.clientX, p.clientY)
    if (!cell) return
    // Click a live cell → erase mode for this stroke; a dead cell → paint mode.
    paintValRef.current = gridRef.current[cell.y][cell.x] ? 0 : 1
    drawingRef.current = true
    lastCellRef.current = cell
    paintCell(cell.x, cell.y)
    syncStats()
    draw()
  }

  useEffect(() => {
    const onMove = (e) => {
      if (!drawingRef.current) return
      const p = e.touches?.[0] || e
      const cell = cellAt(p.clientX, p.clientY)
      if (!cell) return
      const last = lastCellRef.current
      if (last && last.x === cell.x && last.y === cell.y) return
      const path = last ? linePoints(last.x, last.y, cell.x, cell.y) : [cell]
      for (const c of path) paintCell(c.x, c.y)
      lastCellRef.current = cell
      syncStats()
      draw()
    }
    const onUp = () => {
      drawingRef.current = false
      lastCellRef.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    window.addEventListener('touchcancel', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
      window.removeEventListener('touchcancel', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Keyboard ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'Space') {
        e.preventDefault()
        setRunning((r) => !r)
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        stepOnce()
      } else if (e.key === 'c' || e.key === 'C') {
        clear()
      } else if (e.key === 'r' || e.key === 'R') {
        randomize()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />

      <div className="container playground-page">
        <Link to="/playground" className="gallery-back-link">
          ← back to playground
        </Link>
        <div className="playground-header">
          <div className="playground-eyebrow">// GAME OF LIFE</div>
          <h1 className="playground-title">A few rules, and it takes on a life of its own.</h1>
          <p className="playground-lede">
            Conway&apos;s cellular automaton. Draw some cells, hit play, watch them breed and starve.
            Drag on the grid to draw — click a live cell to rub it out.
          </p>
        </div>

        <div className="life-hud">
          <span className="life-stat">gen <strong>{generation}</strong></span>
          <span className="life-stat">alive <strong>{pop}</strong></span>
        </div>

        <div className="playground-controls life-controls">
          <button
            type="button"
            className="btn-pill dark"
            style={{ padding: '12px 24px', fontSize: 14, border: 'none', minWidth: 116 }}
            onClick={() => setRunning((r) => !r)}
          >
            {running ? 'pause ⏸' : 'play ▶'}
          </button>
          <button type="button" style={outlineBtn} onClick={stepOnce} disabled={running}>
            step ⏭
          </button>
          <button type="button" style={outlineBtn} onClick={randomize}>
            random ⚄
          </button>
          <button type="button" style={outlineBtn} onClick={clear}>
            clear ⌫
          </button>

          <div className="life-seg">
            {SPEEDS.map((s) => (
              <button
                key={s.id}
                type="button"
                style={speed === s.id ? activeBtn : presetBtn}
                onClick={() => setSpeed(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            style={wrap ? activeBtn : presetBtn}
            onClick={() => setWrap((v) => !v)}
            aria-pressed={wrap}
          >
            {wrap ? 'edges: wrap' : 'edges: walls'}
          </button>
          <button
            type="button"
            style={showGrid ? activeBtn : presetBtn}
            onClick={() => setShowGrid((v) => !v)}
            aria-pressed={showGrid}
          >
            ▦ grid
          </button>
        </div>

        <div className="life-stage">
          <canvas
            ref={canvasRef}
            className="life-canvas"
            width={boardW * DPR}
            height={boardH * DPR}
            style={{ width: boardW, height: boardH }}
            onMouseDown={onPointerDown}
            onTouchStart={onPointerDown}
          />
        </div>

        <div className="life-patterns">
          <span className="life-patterns-label">// DROP A PATTERN</span>
          {PATTERNS.map((p) => (
            <button
              key={p.id}
              type="button"
              style={presetBtn}
              onClick={() => loadPattern(p.cells, p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="playground-stage-caption">
          {cols}×{rows} · space to run · S step · C clear · R random
        </div>
      </div>
    </div>
  )
}
