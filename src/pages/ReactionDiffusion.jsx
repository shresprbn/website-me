import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav'
import SaveToGallery from '../components/SaveToGallery'
import { outlineBtn, presetBtn, makeActivePreset } from '../lib/controlStyles'
import {
  RD_PRESETS,
  RD_PALETTES,
  createField,
  seedField,
  splat,
  stepField,
  renderField,
  exportUpscaledPng,
  canvasToBlob,
} from '../lib/reactionDiffusion'

const ACCENT = '#7c6cf0'
const activeBtn = makeActivePreset(ACCENT)
const SCALE = 3 // CSS px per grid cell

function computeDims(width) {
  const avail = Math.min(width - 48, 900)
  const cols = Math.max(120, Math.min(240, Math.floor(avail / SCALE)))
  const rows = Math.max(80, Math.round(cols * 0.62))
  return { cols, rows }
}

export default function ReactionDiffusion() {
  const [{ cols, rows }] = useState(() => computeDims(window.innerWidth))

  const [preset, setPreset] = useState('mitosis')
  const [feed, setFeed] = useState(RD_PRESETS[0].feed)
  const [kill, setKill] = useState(RD_PRESETS[0].kill)
  const [speed, setSpeed] = useState(10)
  const [paletteId, setPaletteId] = useState('teal')
  const [running, setRunning] = useState(true)

  const canvasRef = useRef(null)
  const fieldRef = useRef(null)
  const imageRef = useRef(null)
  const runningRef = useRef(true)
  const feedRef = useRef(feed)
  const killRef = useRef(kill)
  const speedRef = useRef(speed)
  const paletteRef = useRef(RD_PALETTES.find((p) => p.id === paletteId))
  const paintingRef = useRef(false)

  runningRef.current = running
  feedRef.current = feed
  killRef.current = kill
  speedRef.current = speed
  paletteRef.current = RD_PALETTES.find((p) => p.id === paletteId) || RD_PALETTES[0]

  const render = () => {
    const canvas = canvasRef.current
    if (!canvas || !fieldRef.current || !imageRef.current) return
    renderField(fieldRef.current, imageRef.current, paletteRef.current)
    canvas.getContext('2d').putImageData(imageRef.current, 0, 0)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    fieldRef.current = createField(cols, rows)
    seedField(fieldRef.current)
    imageRef.current = canvas.getContext('2d').createImageData(cols, rows)
    render()

    let raf
    const loop = () => {
      if (runningRef.current && fieldRef.current) {
        const iters = Math.max(1, Math.round(speedRef.current))
        for (let i = 0; i < iters; i++) {
          stepField(fieldRef.current, feedRef.current, killRef.current)
        }
        render()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-render immediately when the palette changes even while paused.
  useEffect(() => {
    render()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteId])

  const applyPreset = (id) => {
    const p = RD_PRESETS.find((x) => x.id === id)
    if (!p) return
    setPreset(id)
    setFeed(p.feed)
    setKill(p.kill)
  }

  const reseed = () => {
    if (fieldRef.current) {
      seedField(fieldRef.current)
      render()
    }
  }

  const cellFromEvent = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const p = e.touches?.[0] || e
    const x = Math.floor(((p.clientX - rect.left) / rect.width) * cols)
    const y = Math.floor(((p.clientY - rect.top) / rect.height) * rows)
    return { x, y }
  }

  const poke = (e) => {
    if (!fieldRef.current) return
    const { x, y } = cellFromEvent(e)
    splat(fieldRef.current, x, y, Math.max(4, Math.round(cols / 40)))
    if (!runningRef.current) render()
  }

  const onPointerDown = (e) => {
    e.preventDefault()
    paintingRef.current = true
    poke(e)
  }

  useEffect(() => {
    const onMove = (e) => {
      if (paintingRef.current) poke(e)
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

  const downloadPng = () => {
    if (canvasRef.current) exportUpscaledPng(canvasRef.current, 5, 'reaction-diffusion.png')
  }

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />

      <div className="container playground-page">
        <Link to="/playground" className="gallery-back-link">
          ← back to playground
        </Link>
        <div className="playground-header">
          <div className="playground-eyebrow">// REACTION–DIFFUSION</div>
          <h1 className="playground-title">Two chemicals, a few numbers, endless patterns.</h1>
          <p className="playground-lede">
            The Gray-Scott model. A feeds in, B gets removed, and where they meet they react —
            nudge <em>feed</em> and <em>kill</em> a hair and it flips between spots, worms, mazes,
            cells dividing. Drag on it to poke.
          </p>
        </div>

        <div className="rd-controls">
          <button
            type="button"
            className="btn-pill dark"
            style={{ padding: '12px 24px', fontSize: 14, border: 'none', minWidth: 116 }}
            onClick={() => setRunning((r) => !r)}
          >
            {running ? 'pause ⏸' : 'play ▶'}
          </button>
          <button type="button" style={outlineBtn} onClick={reseed}>
            reseed ⚄
          </button>
          <button
            type="button"
            className="btn-pill dark"
            style={{ padding: '12px 20px', fontSize: 13, border: 'none' }}
            onClick={downloadPng}
          >
            download PNG ↓
          </button>
          <SaveToGallery
            kind="reaction"
            hasContent={() => true}
            getData={() => ({ feed, kill, palette: paletteId })}
            getThumbnailBlob={() => canvasToBlob(canvasRef.current, 3)}
          />

          <div className="rd-seg">
            {RD_PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.label}
                className="rd-palette-swatch"
                aria-pressed={paletteId === p.id}
                style={{
                  background: `linear-gradient(135deg, ${p.stops
                    .map((c) => `rgb(${c.join(',')})`)
                    .join(', ')})`,
                  outline: paletteId === p.id ? `2px solid ${ACCENT}` : '1px solid #e0dbd0',
                }}
                onClick={() => setPaletteId(p.id)}
              />
            ))}
          </div>
        </div>

        <div className="rd-preset-row">
          {RD_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              style={preset === p.id ? activeBtn : presetBtn}
              onClick={() => applyPreset(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="rd-sliders">
          <label className="rd-slider">
            <span>feed · {feed.toFixed(4)}</span>
            <input
              type="range"
              min={0.005}
              max={0.09}
              step={0.0005}
              value={feed}
              onChange={(e) => {
                setFeed(Number(e.target.value))
                setPreset('custom')
              }}
            />
          </label>
          <label className="rd-slider">
            <span>kill · {kill.toFixed(4)}</span>
            <input
              type="range"
              min={0.04}
              max={0.075}
              step={0.0005}
              value={kill}
              onChange={(e) => {
                setKill(Number(e.target.value))
                setPreset('custom')
              }}
            />
          </label>
          <label className="rd-slider">
            <span>speed · {speed}×</span>
            <input
              type="range"
              min={1}
              max={24}
              step={1}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="rd-stage">
          <canvas
            ref={canvasRef}
            className="rd-canvas"
            width={cols}
            height={rows}
            style={{ width: cols * SCALE, height: rows * SCALE }}
            onMouseDown={onPointerDown}
            onTouchStart={onPointerDown}
          />
        </div>

        <div className="playground-stage-caption">
          {cols}×{rows} · drag to poke · reseed for a fresh start
        </div>
      </div>
    </div>
  )
}
