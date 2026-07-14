import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'
import Nav from '../components/Nav'
import tinkerer from '../assets/tinkerer_big.png'

const BALL_TYPES = [
  { name: 'sunball', color: '#ffd23f', instrument: 'sine' },
  { name: 'blushball', color: '#ff6b9d', instrument: 'triangle' },
  { name: 'tealball', color: '#4ecdc4', instrument: 'square' },
  { name: 'inkball', color: '#141414', instrument: 'sawtooth' },
]

const NOTE_FREQS = { A: 440.0, B: 493.88, C: 523.25, D: 587.33, E: 659.25, F: 698.46, G: 783.99 }
const NOTE_NAMES = Object.keys(NOTE_FREQS)
const BY_NAME = Object.fromEntries(BALL_TYPES.map((t) => [t.name, t]))
const LINE_COLORS = { line: '#141414', random: '#ff6b9d', boost: '#ffd23f' }

const MAX_BOUNCE_STEPS = 12
const BALL_RADIUS = 13
const BALL_LIFESPAN_MS = 60000
const MIN_LEN = 50
const MAX_LEN = 420
const SPINNER_RADIUS = 28

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

export default function Playground() {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const apiRef = useRef(null)
  const selectedToolRef = useRef(null)
  const [selectedTool, setSelectedTool] = useState(null)
  const [tunesOpen, setTunesOpen] = useState(false)
  const [shapesOpen, setShapesOpen] = useState(false)
  selectedToolRef.current = selectedTool

  useEffect(() => {
    const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint, Events, Body } = Matter
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    let audioCtx = null
    const playTone = (freq, waveform) => {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext
        if (!AC) return
        audioCtx = new AC()
      }
      if (audioCtx.state === 'suspended') audioCtx.resume()
      const now = audioCtx.currentTime
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = waveform || 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start(now)
      osc.stop(now + 0.3)
    }

    const engine = Engine.create()
    engine.gravity.y = 0.5

    const getSize = () => ({
      w: Math.max(1, wrap.clientWidth),
      h: Math.max(1, wrap.clientHeight),
    })
    let { w, h } = getSize()

    const render = Render.create({
      canvas,
      engine,
      options: {
        width: w,
        height: h,
        wireframes: false,
        background: 'transparent',
        pixelRatio: 1,
      },
    })
    Render.run(render)
    const runner = Runner.create()
    Runner.run(runner, engine)

    const wallOpts = { isStatic: true, render: { visible: false } }
    let ceiling = Bodies.rectangle(w / 2, -20, w * 2, 40, wallOpts)
    let leftWall = Bodies.rectangle(-20, h / 2, 40, h * 2, wallOpts)
    let rightWall = Bodies.rectangle(w + 20, h / 2, 40, h * 2, wallOpts)
    Composite.add(engine.world, [ceiling, leftWall, rightWall])

    const rand = (a, b) => a + Math.random() * (b - a)
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

    let lines = []
    let spinners = []
    const presetTimers = []

    Events.on(engine, 'afterUpdate', () => {
      const now = Date.now()
      Composite.allBodies(engine.world)
        .filter((b) => !b.isStatic)
        .forEach((b) => {
          const expired = b.plugin?.isBall && b.plugin.bornAt && now - b.plugin.bornAt > BALL_LIFESPAN_MS
          if (b.position.y > h + 80 || expired) {
            Composite.remove(engine.world, b)
            return
          }
          if (b.plugin?.isBall) {
            const speed = Math.hypot(b.velocity.x, b.velocity.y)
            if (speed < 0.12) {
              Body.setVelocity(b, {
                x: b.velocity.x + rand(-0.6, 0.6),
                y: b.velocity.y - rand(0.3, 0.7),
              })
            }
          }
        })
    })

    const addBall = (overrideType, overrideNote) => {
      if (w < 40 || h < 80) return
      const type = overrideType || pick(BALL_TYPES)
      const note = overrideNote || pick(NOTE_NAMES)
      const fixedPitch = !!(overrideType || overrideNote)
      const spawnX = Math.min(w - 30, Math.max(30, w / 2 + rand(-24, 24)))
      const spawnY = Math.min(h * 0.15, 56)
      const body = Bodies.circle(spawnX, spawnY, BALL_RADIUS, {
        restitution: 0.96,
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0.0005,
        render: { fillStyle: type.color },
        plugin: {
          isBall: true,
          ballType: type.name,
          instrument: type.instrument,
          note,
          baseFreq: NOTE_FREQS[note],
          bounceCount: 0,
          lastBounceAt: 0,
          bornAt: Date.now(),
          fixedPitch,
        },
      })
      Composite.add(engine.world, body)
    }

    const runPreset = (steps, intervalMs) => {
      presetTimers.forEach(clearTimeout)
      presetTimers.length = 0
      steps.forEach((step, i) => {
        const t = setTimeout(() => addBall(BY_NAME[step.type], step.note), i * intervalMs)
        presetTimers.push(t)
      })
    }

    const makeLineBody = (cx, cy, length, angle, kind) =>
      Bodies.rectangle(cx, cy, length, 10, {
        isStatic: true,
        angle,
        friction: 0,
        frictionStatic: 0,
        restitution: kind === 'boost' ? 0.5 : kind === 'random' ? 0.6 : 0.5,
        chamfer: { radius: 5 },
        render: { fillStyle: LINE_COLORS[kind] },
        plugin: {
          isObstacle: true,
          isLine: true,
          isRandomizer: kind === 'random',
          isBooster: kind === 'boost',
          length,
        },
      })

    const addLine = (x, y, kind) => {
      const length = 110
      const angle = rand(-0.3, 0.3)
      const body = makeLineBody(x, y, length, angle, kind)
      Composite.add(engine.world, body)
      lines.push({ body, length, kind })
    }

    const addSpinner = (x, y) => {
      const spinSpeed = (Math.random() < 0.5 ? -1 : 1) * rand(0.05, 0.09)
      const body = Bodies.circle(x, y, SPINNER_RADIUS, {
        isStatic: true,
        friction: 0,
        frictionStatic: 0,
        restitution: 0.6,
        render: {
          sprite: {
            texture: tinkerer,
            xScale: (SPINNER_RADIUS * 2) / 256,
            yScale: (SPINNER_RADIUS * 2) / 256,
          },
        },
        plugin: { isObstacle: true, isSpinner: true, spinSpeed, lastKickAt: 0 },
      })
      Composite.add(engine.world, body)
      spinners.push({ body, radius: SPINNER_RADIUS })
    }

    const placeShape = (type, x, y) => {
      if (type === 'line' || type === 'random' || type === 'boost') addLine(x, y, type)
      else if (type === 'spin') addSpinner(x, y)
    }

    Events.on(engine, 'beforeUpdate', () => {
      spinners.forEach(({ body }) => Body.setAngle(body, body.angle + body.plugin.spinSpeed))
    })

    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        ;[pair.bodyA, pair.bodyB].forEach((body) => {
          if (!body.plugin?.isBall) return
          const t = Date.now()
          if (t - body.plugin.lastBounceAt < 60) return
          body.plugin.lastBounceAt = t
          let freq = body.plugin.baseFreq
          if (!body.plugin.fixedPitch) {
            body.plugin.bounceCount = Math.min(body.plugin.bounceCount + 1, MAX_BOUNCE_STEPS)
            freq = body.plugin.baseFreq * Math.pow(2, body.plugin.bounceCount / 12)
          }
          playTone(freq, body.plugin.instrument)
        })

        const a = pair.bodyA
        const b = pair.bodyB

        const randomizer = a.plugin?.isRandomizer ? a : b.plugin?.isRandomizer ? b : null
        const rBall = randomizer === a ? b : a
        if (randomizer && rBall && !rBall.isStatic) {
          setTimeout(() => {
            const v = rBall.velocity
            const speed = Math.hypot(v.x, v.y)
            if (speed < 0.5) return
            const angle = Math.atan2(v.y, v.x)
            const deflect = rand(-0.6, 0.6)
            const newAngle = angle + deflect
            Body.setVelocity(rBall, {
              x: Math.cos(newAngle) * speed,
              y: Math.sin(newAngle) * speed,
            })
          }, 0)
        }

        const booster = a.plugin?.isBooster ? a : b.plugin?.isBooster ? b : null
        const bBall = booster === a ? b : a
        if (booster && bBall && !bBall.isStatic) {
          const t = Date.now()
          if (t - (bBall.plugin.lastBoostAt || 0) > 120) {
            bBall.plugin.lastBoostAt = t
            let nx = -Math.sin(booster.angle)
            let ny = Math.cos(booster.angle)
            const dx = bBall.position.x - booster.position.x
            const dy = bBall.position.y - booster.position.y
            if (dx * nx + dy * ny < 0) {
              nx = -nx
              ny = -ny
            }
            const BOOST = 9
            Body.setVelocity(bBall, {
              x: bBall.velocity.x + nx * BOOST,
              y: bBall.velocity.y + ny * BOOST,
            })
          }
        }

        const spinner = a.plugin?.isSpinner ? a : b.plugin?.isSpinner ? b : null
        const sBall = spinner === a ? b : a
        if (spinner && sBall && !sBall.isStatic) {
          const t = Date.now()
          if (t - (sBall.plugin.lastBoostAt || 0) > 120) {
            sBall.plugin.lastBoostAt = t
            const dx = sBall.position.x - spinner.position.x
            const dy = sBall.position.y - spinner.position.y
            const len = Math.hypot(dx, dy) || 1
            const nx = dx / len
            const ny = dy / len
            const spin =
              spinner.plugin.spinSpeed > 0 ? { x: -ny, y: nx } : { x: ny, y: -nx }
            const KICK = 7
            Body.setVelocity(sBall, {
              x: sBall.velocity.x + spin.x * KICK,
              y: sBall.velocity.y + spin.y * KICK,
            })
          }
        }
      })
    })

    const hitTestLine = (x, y) => {
      const grabThresh = 20
      for (const entry of lines) {
        const { body, length } = entry
        const dx = x - body.position.x
        const dy = y - body.position.y
        const c = Math.cos(body.angle)
        const s = Math.sin(body.angle)
        const lx = dx * c + dy * s
        const ly = dy * c - dx * s
        const halfLen = length / 2
        if (Math.abs(ly) > 18 || Math.abs(lx) > halfLen + grabThresh) continue
        if (lx > halfLen - grabThresh) {
          return {
            entry,
            mode: 'resize',
            fixedEnd: {
              x: body.position.x - Math.cos(body.angle) * halfLen,
              y: body.position.y - Math.sin(body.angle) * halfLen,
            },
          }
        }
        if (lx < -(halfLen - grabThresh)) {
          return {
            entry,
            mode: 'resize',
            fixedEnd: {
              x: body.position.x + Math.cos(body.angle) * halfLen,
              y: body.position.y + Math.sin(body.angle) * halfLen,
            },
          }
        }
        return {
          entry,
          mode: 'move',
          grabOffset: { x: body.position.x - x, y: body.position.y - y },
        }
      }
      return null
    }

    const hitTestSpinner = (x, y) => {
      for (const entry of spinners) {
        const dx = x - entry.body.position.x
        const dy = y - entry.body.position.y
        if (Math.hypot(dx, dy) <= entry.radius) {
          return {
            entry,
            mode: 'spin-move',
            grabOffset: { x: entry.body.position.x - x, y: entry.body.position.y - y },
          }
        }
      }
      return null
    }

    let dragState = null

    const toCanvasXY = (e) => {
      const point = e.touches?.[0] || e.changedTouches?.[0] || e
      const rect = canvas.getBoundingClientRect()
      return { x: point.clientX - rect.left, y: point.clientY - rect.top }
    }

    const applyDrag = (x, y) => {
      if (!dragState) return
      const { entry, mode } = dragState
      if (mode === 'move' || mode === 'spin-move') {
        Body.setPosition(entry.body, {
          x: x + dragState.grabOffset.x,
          y: y + dragState.grabOffset.y,
        })
      } else if (mode === 'resize') {
        const { fixedEnd } = dragState
        const newAngle = Math.atan2(y - fixedEnd.y, x - fixedEnd.x)
        const rawLen = Math.hypot(x - fixedEnd.x, y - fixedEnd.y)
        const newLength = Math.max(MIN_LEN, Math.min(MAX_LEN, rawLen))
        const newCenter = {
          x: fixedEnd.x + (Math.cos(newAngle) * newLength) / 2,
          y: fixedEnd.y + (Math.sin(newAngle) * newLength) / 2,
        }
        Composite.remove(engine.world, entry.body)
        const newBody = makeLineBody(newCenter.x, newCenter.y, newLength, newAngle, entry.kind)
        Composite.add(engine.world, newBody)
        entry.body = newBody
        entry.length = newLength
      }
    }

    const onPointerDown = (e) => {
      const { x, y } = toCanvasXY(e)
      const tool = selectedToolRef.current
      if (tool) {
        placeShape(tool, x, y)
        selectedToolRef.current = null
        apiRef.current?.clearSelection?.()
        e.preventDefault()
        return
      }
      const hit = hitTestLine(x, y) || hitTestSpinner(x, y)
      if (hit) {
        dragState = hit
        e.preventDefault()
      }
    }

    const onPointerMove = (e) => {
      if (!dragState) return
      e.preventDefault()
      const { x, y } = toCanvasXY(e)
      applyDrag(x, y)
    }

    const onPointerUp = () => {
      dragState = null
    }

    const onHoverCursor = (e) => {
      if (dragState) {
        canvas.style.cursor = 'grabbing'
        return
      }
      if (selectedToolRef.current) {
        canvas.style.cursor = 'copy'
        return
      }
      const { x, y } = toCanvasXY(e)
      canvas.style.cursor = hitTestLine(x, y) || hitTestSpinner(x, y) ? 'grab' : 'default'
    }

    const onDragOver = (e) => e.preventDefault()
    const onDrop = (e) => {
      e.preventDefault()
      const type = e.dataTransfer.getData('text/plain')
      const rect = canvas.getBoundingClientRect()
      placeShape(type, e.clientX - rect.left, e.clientY - rect.top)
    }

    canvas.addEventListener('mousedown', onPointerDown)
    canvas.addEventListener('touchstart', onPointerDown, { passive: false })
    canvas.addEventListener('mousemove', onHoverCursor)
    canvas.addEventListener('dragover', onDragOver)
    canvas.addEventListener('drop', onDrop)
    window.addEventListener('mousemove', onPointerMove)
    window.addEventListener('mouseup', onPointerUp)
    window.addEventListener('touchmove', onPointerMove, { passive: false })
    window.addEventListener('touchend', onPointerUp)
    window.addEventListener('touchcancel', onPointerUp)

    const mouse = Mouse.create(canvas)
    mouse.pixelRatio = 1
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    })
    Composite.add(engine.world, mouseConstraint)
    render.mouse = mouse

    apiRef.current = {
      addBall: () => addBall(),
      clearBalls: () => {
        Composite.allBodies(engine.world)
          .filter((b) => !b.isStatic)
          .forEach((b) => Composite.remove(engine.world, b))
      },
      clearObstacles: () => {
        Composite.allBodies(engine.world)
          .filter((b) => b.isStatic && b.plugin?.isObstacle)
          .forEach((b) => Composite.remove(engine.world, b))
        lines = []
        spinners = []
      },
      twinkle: () => {
        const notes = ['C', 'C', 'G', 'G', 'A', 'A', 'G']
        runPreset(
          notes.map((note) => ({ type: 'sunball', note })),
          420,
        )
      },
      ascend: () => {
        const notes = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
        runPreset(
          notes.map((note) => ({ type: 'blushball', note })),
          320,
        )
      },
      arpeggio: () => {
        const pattern = [
          { type: 'sunball', note: 'A' },
          { type: 'blushball', note: 'C' },
          { type: 'tealball', note: 'E' },
          { type: 'inkball', note: 'A' },
          { type: 'sunball', note: 'C' },
          { type: 'blushball', note: 'E' },
          { type: 'tealball', note: 'A' },
          { type: 'inkball', note: 'C' },
        ]
        runPreset(pattern, 260)
      },
      clearSelection: () => setSelectedTool(null),
    }

    let seeded = false
    const syncSize = () => {
      const size = getSize()
      if (size.w < 40 || size.h < 80) return
      if (Math.abs(size.w - w) < 1 && Math.abs(size.h - h) < 1 && seeded) return

      w = size.w
      h = size.h
      render.options.width = w
      render.options.height = h
      render.bounds.min.x = 0
      render.bounds.min.y = 0
      render.bounds.max.x = w
      render.bounds.max.y = h
      render.canvas.width = w
      render.canvas.height = h
      render.canvas.style.width = '100%'
      render.canvas.style.height = '100%'
      mouse.pixelRatio = 1

      Composite.remove(engine.world, [ceiling, leftWall, rightWall])
      ceiling = Bodies.rectangle(w / 2, -20, w * 2, 40, wallOpts)
      leftWall = Bodies.rectangle(-20, h / 2, 40, h * 2, wallOpts)
      rightWall = Bodies.rectangle(w + 20, h / 2, 40, h * 2, wallOpts)
      Composite.add(engine.world, [ceiling, leftWall, rightWall])

      if (!seeded) {
        seeded = true
        addBall()
        addBall()
        addBall()
      }
    }

    syncSize()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncSize) : null
    ro?.observe(wrap)
    window.addEventListener('resize', syncSize)

    return () => {
      apiRef.current = null
      presetTimers.forEach(clearTimeout)
      ro?.disconnect()
      window.removeEventListener('resize', syncSize)
      window.removeEventListener('mousemove', onPointerMove)
      window.removeEventListener('mouseup', onPointerUp)
      window.removeEventListener('touchmove', onPointerMove)
      window.removeEventListener('touchend', onPointerUp)
      window.removeEventListener('touchcancel', onPointerUp)
      canvas.removeEventListener('mousedown', onPointerDown)
      canvas.removeEventListener('touchstart', onPointerDown)
      canvas.removeEventListener('mousemove', onHoverCursor)
      canvas.removeEventListener('dragover', onDragOver)
      canvas.removeEventListener('drop', onDrop)
      Render.stop(render)
      Runner.stop(runner)
      Composite.clear(engine.world, false)
      Engine.clear(engine)
      if (audioCtx) audioCtx.close()
    }
  }, [])

  const call = (fn) => () => apiRef.current?.[fn]?.()

  const onLibDragStart = (type) => (e) => {
    e.dataTransfer.setData('text/plain', type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const onLibSelect = (type) => (e) => {
    // Touch phones: tap selects. Desktop keeps drag-and-drop.
    if (window.matchMedia('(pointer: coarse)').matches) {
      e.preventDefault()
      setSelectedTool((cur) => (cur === type ? null : type))
    }
  }

  const libClass = (type) =>
    `playground-lib-item${selectedTool === type ? ' selected' : ''}`

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />

      <div className="container playground-page">
        <div className="playground-header">
          <div className="playground-eyebrow">// PLAYGROUND</div>
          <h1 className="playground-title">Drop stuff. Drag stuff. Watch it bounce.</h1>
          <p className="playground-lede">
            A little physics sandbox because the blog needed one thing that isn&apos;t an essay. Drag
            any shape around — let go and it flies.
          </p>
        </div>

        <div className="playground-controls">
          <button
            type="button"
            className="btn-pill dark"
            style={{ padding: '13px 22px', fontSize: 14, border: 'none' }}
            onClick={call('addBall')}
          >
            drop a ball ⬤
          </button>
          <button type="button" style={outlineBtn} onClick={call('clearObstacles')}>
            clear course ⌫
          </button>
          <button type="button" className="ml-auto" style={outlineBtn} onClick={call('clearBalls')}>
            clear balls ↻
          </button>
        </div>

        <div className={`playground-panel playground-panel--presets${tunesOpen ? ' open' : ''}`}>
          <button
            type="button"
            className="playground-panel-toggle"
            aria-expanded={tunesOpen}
            onClick={() => setTunesOpen((o) => !o)}
          >
            <span>// PLAY A TUNE</span>
            <span className="playground-panel-chevron">▾</span>
          </button>
          <div className="playground-panel-body">
            <div className="playground-presets">
              <span className="playground-presets-label">// PLAY A TUNE</span>
              <button type="button" style={presetBtn} onClick={call('twinkle')}>
                twinkle twinkle ✦
              </button>
              <button type="button" style={presetBtn} onClick={call('ascend')}>
                ascending scale ↑
              </button>
              <button type="button" style={presetBtn} onClick={call('arpeggio')}>
                arpeggio round ♪
              </button>
            </div>
          </div>
        </div>

        <div className="playground-stage-row">
          <div className={`playground-panel playground-panel--shapes${shapesOpen ? ' open' : ''}`}>
            <button
              type="button"
              className="playground-panel-toggle"
              aria-expanded={shapesOpen}
              onClick={() => setShapesOpen((o) => !o)}
            >
              <span>// SHAPES</span>
              <span className="playground-panel-chevron">▾</span>
            </button>
            <div className="playground-panel-body">
              <div className="playground-library">
                <div className="playground-library-label">// SHAPES</div>

                <div
                  className={libClass('line')}
                  draggable
                  onDragStart={onLibDragStart('line')}
                  onClick={onLibSelect('line')}
                >
                  <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 'min(70px, 85%)', height: 6, background: '#141414', borderRadius: 3 }} />
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#666', marginTop: 6 }}>
                    line
                  </div>
                </div>

                <div
                  className={libClass('random')}
                  draggable
                  onDragStart={onLibDragStart('random')}
                  onClick={onLibSelect('random')}
                >
                  <div
                    style={{
                      height: 44,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 3,
                    }}
                  >
                    <div style={{ width: 14, height: 6, background: '#ff6b9d', borderRadius: 3 }} />
                    <div
                      style={{
                        width: 14,
                        height: 6,
                        background: '#ff6b9d',
                        borderRadius: 3,
                        transform: 'translateY(-4px)',
                      }}
                    />
                    <div
                      style={{
                        width: 14,
                        height: 6,
                        background: '#ff6b9d',
                        borderRadius: 3,
                        transform: 'translateY(4px)',
                      }}
                    />
                    <div style={{ width: 14, height: 6, background: '#ff6b9d', borderRadius: 3 }} />
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#666', marginTop: 6 }}>
                    bounce
                  </div>
                </div>

                <div
                  className={libClass('boost')}
                  draggable
                  onDragStart={onLibDragStart('boost')}
                  onClick={onLibSelect('boost')}
                >
                  <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div
                      style={{
                        width: 'min(70px, 85%)',
                        height: 6,
                        background: '#ffd23f',
                        borderRadius: 3,
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: -7,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 0,
                          height: 0,
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderBottom: '8px solid #ffd23f',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#666', marginTop: 6 }}>
                    boost
                  </div>
                </div>

                <div
                  className={libClass('spin')}
                  draggable
                  onDragStart={onLibDragStart('spin')}
                  onClick={onLibSelect('spin')}
                >
                  <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#4ecdc4',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          width: 26,
                          height: 3,
                          background: '#0d2e2b',
                          transform: 'translate(-50%, -50%) rotate(20deg)',
                          borderRadius: 2,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          width: 26,
                          height: 3,
                          background: '#0d2e2b',
                          transform: 'translate(-50%, -50%) rotate(-60deg)',
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#666', marginTop: 6 }}>
                    spin
                  </div>
                </div>

                <div className="playground-lib-hint">
                  drag onto the board.
                  <br />
                  lines: grab the middle to move,
                  <br />
                  an end to stretch &amp; angle.
                  <br />
                  spinner: drag to reposition.
                </div>
                <div className="playground-lib-hint-mobile">
                  {selectedTool
                    ? 'tap the board to place · tap shape again to cancel'
                    : 'tap a shape, then tap the board to place'}
                </div>
              </div>

              <div className="playground-mobile-clears">
                <button type="button" style={outlineBtn} onClick={call('clearObstacles')}>
                  clear course ⌫
                </button>
                <button type="button" style={outlineBtn} onClick={call('clearBalls')}>
                  clear balls ↻
                </button>
              </div>
            </div>
          </div>

          <div
            ref={wrapRef}
            className={`playground-stage${selectedTool ? ' place-mode' : ''}`}
          >
            <canvas ref={canvasRef} />
            <button
              type="button"
              className="playground-drop-fab"
              onClick={call('addBall')}
            >
              drop a ball ⬤
            </button>
            <div className="playground-stage-caption">
              {selectedTool ? '// tap to place' : '// grab & fling'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
