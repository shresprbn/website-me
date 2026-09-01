import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav'
import { outlineBtn, presetBtn, makeActivePreset } from '../lib/controlStyles'
import {
  MATERIAL_LIST,
  SAND,
  WATER,
  createWorld,
  clearWorld,
  frameWorld,
  paint,
  stepWorld,
  renderWorld,
} from '../lib/powderUtils'

const ACCENT = '#f2b705'
const activeBtn = makeActivePreset(ACCENT)
const SCALE = 4

function computeDims(width) {
  const avail = Math.min(width - 48, 880)
  const cols = Math.max(90, Math.min(200, Math.floor(avail / SCALE)))
  const rows = Math.max(70, Math.round(cols * 0.66))
  return { cols, rows }
}

export default function PowderToy() {
  const [{ cols, rows }] = useState(() => computeDims(window.innerWidth))

  const [material, setMaterial] = useState('sand')
  const [brush, setBrush] = useState(3)
  const [speed, setSpeed] = useState(1)
  const [running, setRunning] = useState(true)

  const canvasRef = useRef(null)
  const worldRef = useRef(null)
  const imageRef = useRef(null)
  const runningRef = useRef(true)
  const speedRef = useRef(speed)
  const matRef = useRef(0)
  const brushRef = useRef(brush)
  const paintingRef = useRef(false)
  const frameRef = useRef(0)

  runningRef.current = running
  speedRef.current = speed
  brushRef.current = brush
  matRef.current = MATERIAL_LIST.find((m) => m.id === material)?.mat ?? SAND

  const render = () => {
    const canvas = canvasRef.current
    if (!canvas || !worldRef.current || !imageRef.current) return
    renderWorld(worldRef.current, imageRef.current)
    canvas.getContext('2d').putImageData(imageRef.current, 0, 0)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    worldRef.current = createWorld(cols, rows)
    frameWorld(worldRef.current)
    imageRef.current = canvas.getContext('2d').createImageData(cols, rows)
    render()

    let raf
    const loop = () => {
      if (worldRef.current) {
        if (runningRef.current) {
          const iters = Math.max(1, Math.round(speedRef.current))
          for (let i = 0; i < iters; i++) {
            stepWorld(worldRef.current, frameRef.current++)
          }
        }
        // keep a held brush pouring even while the sim is paused
        render()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cellFromEvent = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const p = e.touches?.[0] || e
    return {
      x: Math.floor(((p.clientX - rect.left) / rect.width) * cols),
      y: Math.floor(((p.clientY - rect.top) / rect.height) * rows),
    }
  }

  const stroke = (e) => {
    if (!worldRef.current) return
    const { x, y } = cellFromEvent(e)
    paint(worldRef.current, x, y, matRef.current, brushRef.current)
    if (!runningRef.current) render()
  }

  const onPointerDown = (e) => {
    e.preventDefault()
    paintingRef.current = true
    stroke(e)
  }

  useEffect(() => {
    const onMove = (e) => {
      if (paintingRef.current) stroke(e)
    }
    const onUp = () => {
      paintingRef.current = false
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reset = () => {
    if (!worldRef.current) return
    clearWorld(worldRef.current)
    frameWorld(worldRef.current)
    render()
  }

  const dune = () => {
    if (!worldRef.current) return
    clearWorld(worldRef.current)
    frameWorld(worldRef.current)
    const w = worldRef.current
    for (let n = 0; n < cols * 6; n++) {
      paint(w, 1 + ((Math.random() * (cols - 2)) | 0), 1 + ((Math.random() * (rows * 0.3)) | 0), SAND, 1)
    }
    for (let n = 0; n < cols * 3; n++) {
      paint(w, 1 + ((Math.random() * (cols - 2)) | 0), 1 + ((Math.random() * 4) | 0), WATER, 1)
    }
    render()
  }

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'Space') {
        e.preventDefault()
        setRunning((r) => !r)
      } else if (e.key === 'c' || e.key === 'C') {
        reset()
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
          <div className="playground-eyebrow">// POWDER TOY</div>
          <h1 className="playground-title">Sand falls. Water flows. Fire spreads. Plants drink.</h1>
          <p className="playground-lede">
            A falling-sand sandbox. Pick a material, drag it in, watch it settle. Fire eats plants,
            water puts it out and makes steam, plants creep along anything wet.
          </p>
        </div>

        <div className="powder-controls">
          <button
            type="button"
            className="btn-pill dark"
            style={{ padding: '12px 24px', fontSize: 14, border: 'none', minWidth: 116 }}
            onClick={() => setRunning((r) => !r)}
          >
            {running ? 'pause ⏸' : 'play ▶'}
          </button>
          <button type="button" style={outlineBtn} onClick={reset}>
            clear ⌫
          </button>
          <button type="button" style={outlineBtn} onClick={dune}>
            dune ⚄
          </button>

          <div className="powder-mats">
            {MATERIAL_LIST.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`powder-mat${material === m.id ? ' selected' : ''}`}
                onClick={() => setMaterial(m.id)}
              >
                <span className="powder-mat-dot" style={{ background: m.swatch }} />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="powder-sliders">
          <label className="rd-slider">
            <span>brush · {brush}</span>
            <input type="range" min={1} max={8} step={1} value={brush} onChange={(e) => setBrush(Number(e.target.value))} />
          </label>
          <label className="rd-slider">
            <span>speed · {speed}×</span>
            <input type="range" min={1} max={5} step={1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
          </label>
        </div>

        <div className="rd-stage">
          <canvas
            ref={canvasRef}
            className="rd-canvas powder-canvas"
            width={cols}
            height={rows}
            style={{ width: cols * SCALE, height: rows * SCALE }}
            onMouseDown={onPointerDown}
            onTouchStart={onPointerDown}
          />
        </div>

        <div className="playground-stage-caption">
          {cols}×{rows} · drag to draw · space to pause · C to clear
        </div>
      </div>
    </div>
  )
}
