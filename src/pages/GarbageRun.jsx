import { useEffect, useRef, useState } from 'react'
import Nav from '../components/Nav'
import { useWindowWidth } from '../hooks/useWindowWidth'
import { SPRITES } from '../lib/snakeSprites'
import {
  GRID_COLS,
  GRID_ROWS,
  DIRS,
  OPPOSITE,
  SCORE_PER_FOOD,
  createInitialSnake,
  segmentSpriteKey,
  randomEmptyCell,
  isOutOfBounds,
} from '../lib/snakeUtils'
import { LEADERBOARD_ENABLED, SCORES_ENABLED, fetchRank, fetchTopScores, startSession, submitScore } from '../lib/garbageRun'
import { DINO_WALK_FRAMES, DINO_IDLE_FRAMES, DINO_PASSPHRASE } from '../lib/dinoSprites'
import Leaderboard from '../components/Leaderboard'
import SaveScoreModal from '../components/SaveScoreModal'

const BEST_KEY = 'garbage-run-best-score'
const NAME_KEY = 'garbage-run-player-name'
const MUTE_KEY = 'garbage-run-muted'
const DIFF_KEY = 'garbage-run-difficulty'
const WRAP_KEY = 'garbage-run-wrap'
const CELL_MAX = 30
const DINO_WALK_FRAME_MS = 110
const DINO_SPEED_PX_PER_SEC = 140
const DINO_SIZE = 100
const MAX_DINOS = 8

// Difficulty maps to how fast the truck ticks and how hard it ramps.
const DIFFICULTIES = {
  chill: { label: 'chill', startMs: 170, minMs: 105, stepMs: 2 },
  normal: { label: 'normal', startMs: 140, minMs: 70, stepMs: 3 },
  manic: { label: 'manic', startMs: 108, minMs: 52, stepMs: 4 },
}
const DIFFICULTY_IDS = ['chill', 'normal', 'manic']
const COUNTDOWN_FROM = 3

export default function GarbageRun() {
  const width = useWindowWidth()
  const cellSize = Math.max(14, Math.min(CELL_MAX, Math.floor(Math.min(width - 48, GRID_COLS * CELL_MAX) / GRID_COLS)))
  const boardPx = cellSize * GRID_COLS

  const [difficulty, setDifficulty] = useState(() => {
    const saved = localStorage.getItem(DIFF_KEY)
    return DIFFICULTIES[saved] ? saved : 'normal'
  })
  const [wrap, setWrap] = useState(() => localStorage.getItem(WRAP_KEY) === '1')
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === '1')

  const [snake, setSnake] = useState(createInitialSnake)
  const [direction, setDirection] = useState('right')
  const [food, setFood] = useState(null)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [status, setStatus] = useState('idle') // idle | countdown | playing | paused | over
  const [countdownN, setCountdownN] = useState(COUNTDOWN_FROM)
  const [tickMs, setTickMs] = useState(DIFFICULTIES.normal.startMs)
  const [rank, setRank] = useState(null)
  const [playerName, setPlayerName] = useState(() => localStorage.getItem(NAME_KEY) || '')
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardStatus, setLeaderboardStatus] = useState('idle')
  const [submitStatus, setSubmitStatus] = useState('idle') // idle | saving | saved | error
  const [sessionReady, setSessionReady] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)

  // dinodaur easter egg — always listening for the passphrase, spawns a new
  // dino each time it's typed, click-and-drag any of them around the screen.
  const [dinos, setDinos] = useState([]) // { id, x, y, duration, moving, facing, frame }
  const [dragLine, setDragLine] = useState(null) // { x1, y1, x2, y2 } while dragging

  const boardRef = useRef(null)
  const dinosRef = useRef([])
  const nextDinoIdRef = useRef(1)

  const snakeRef = useRef(snake)
  const directionRef = useRef(direction)
  const nextDirectionRef = useRef(direction)
  const foodRef = useRef(food)
  const scoreRef = useRef(score)
  const tickMsRef = useRef(tickMs)
  const statusRef = useRef(status)
  const playerNameRef = useRef(playerName)
  const sessionRef = useRef(null)
  const attemptRef = useRef(0)
  const wrapRef = useRef(wrap)
  const mutedRef = useRef(muted)
  const difficultyRef = useRef(difficulty)
  const audioCtxRef = useRef(null)
  const touchStartRef = useRef(null)
  const countdownTimerRef = useRef(null)

  snakeRef.current = snake
  directionRef.current = direction
  foodRef.current = food
  scoreRef.current = score
  tickMsRef.current = tickMs
  statusRef.current = status
  playerNameRef.current = playerName
  wrapRef.current = wrap
  mutedRef.current = muted
  difficultyRef.current = difficulty
  dinosRef.current = dinos

  // ── Sound ─────────────────────────────────────────────────────────
  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return null
      audioCtxRef.current = new Ctx()
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
    return audioCtxRef.current
  }
  const blip = (freq, dur = 0.08, type = 'square', when = 0) => {
    if (mutedRef.current) return
    const ctx = audioCtxRef.current
    if (!ctx) return
    const t = ctx.currentTime + when
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + dur + 0.03)
  }
  const playPickup = () => {
    blip(620, 0.07, 'square')
    blip(930, 0.09, 'square', 0.05)
  }
  const playCrash = () => {
    ;[240, 170, 120].forEach((f, i) => blip(f, 0.2, 'sawtooth', i * 0.06))
  }
  const toggleMute = () => {
    setMuted((m) => {
      const next = !m
      localStorage.setItem(MUTE_KEY, next ? '1' : '0')
      return next
    })
  }

  useEffect(() => {
    const saved = Number(localStorage.getItem(BEST_KEY) || 0)
    if (Number.isFinite(saved)) setBest(saved)
  }, [])

  const loadLeaderboard = () => {
    if (!LEADERBOARD_ENABLED) {
      setLeaderboardStatus('unconfigured')
      return
    }
    setLeaderboardStatus('loading')
    fetchTopScores(10)
      .then((rows) => {
        setLeaderboard(rows)
        setLeaderboardStatus('ready')
      })
      .catch(() => setLeaderboardStatus('error'))
  }

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const updatePlayerName = (value) => {
    setPlayerName(value)
    localStorage.setItem(NAME_KEY, value)
  }

  const closeSaveModal = () => {
    if (submitStatus === 'saving') return
    setSaveModalOpen(false)
  }

  useEffect(() => {
    if (submitStatus === 'saved') setSaveModalOpen(false)
  }, [submitStatus])

  // Open the save-score modal the moment you crash — no extra click needed.
  useEffect(() => {
    if (status === 'over' && SCORES_ENABLED && scoreRef.current > 0) {
      setSaveModalOpen(true)
    }
  }, [status])

  const endGame = () => {
    statusRef.current = 'over'
    setStatus('over')
    setSubmitStatus('idle')
    playCrash()
    setBest((prevBest) => {
      if (scoreRef.current > prevBest) {
        localStorage.setItem(BEST_KEY, String(scoreRef.current))
        return scoreRef.current
      }
      return prevBest
    })
    setRank(null)
    if (LEADERBOARD_ENABLED && scoreRef.current > 0) {
      fetchRank(scoreRef.current).then(setRank).catch(() => {})
    }
  }

  const setDifficultyPref = (id) => {
    if (!DIFFICULTIES[id]) return
    setDifficulty(id)
    localStorage.setItem(DIFF_KEY, id)
  }
  const toggleWrap = () => {
    setWrap((w) => {
      const next = !w
      localStorage.setItem(WRAP_KEY, next ? '1' : '0')
      return next
    })
  }

  const togglePause = () => {
    if (statusRef.current === 'playing') {
      statusRef.current = 'paused'
      setStatus('paused')
    } else if (statusRef.current === 'paused') {
      statusRef.current = 'playing'
      setStatus('playing')
    }
  }

  // Walks a fresh dino in from off-screen each time the passphrase is typed.
  // Position is viewport-relative (position: fixed) — the whole screen is
  // its home, not just the board. Capped so the page doesn't fill up.
  const summonDino = () => {
    if (dinosRef.current.length >= MAX_DINOS) return
    const w = window.innerWidth
    const h = window.innerHeight
    const dinoW = DINO_SIZE
    const rowY = Math.min(h - dinoW * 1.4, Math.max(20, h * (0.35 + Math.random() * 0.5) - dinoW))
    const enterX = w * (0.1 + Math.random() * 0.25)
    const id = nextDinoIdRef.current++

    const dino = { id, x: -dinoW, y: rowY, duration: 0, moving: true, facing: 'right', frame: 0 }
    setDinos((list) => [...list, dino])

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDinos((list) => list.map((d) => (d.id === id ? { ...d, x: enterX, duration: 1100 } : d)))
      })
    })
  }

  // Sends a specific dino walking to an arbitrary point on screen — the
  // actual "ask the dino to move to a spot" easter-egg interaction.
  const moveDinoTo = (id, x, y) => {
    setDinos((list) =>
      list.map((d) => {
        if (d.id !== id) return d
        const dx = x - d.x
        const dy = y - d.y
        const dist = Math.hypot(dx, dy)
        const duration = Math.max(300, Math.min(2400, (dist / DINO_SPEED_PX_PER_SEC) * 1000))
        const facing = Math.abs(dx) > 4 ? (dx < 0 ? 'left' : 'right') : d.facing
        return { ...d, x, y, duration, moving: true, facing }
      })
    )
  }

  const handleDinoArrive = (id) => {
    setDinos((list) => list.map((d) => (d.id === id ? { ...d, moving: false } : d)))
  }

  // Click-and-drag a dino: grab it, drag shows a dotted line from its spot
  // to the cursor, release sends it walking to the drop point.
  const startDinoDrag = (id, downEvent) => {
    downEvent.preventDefault()
    const dino = dinosRef.current.find((d) => d.id === id)
    if (!dino) return
    const originX = dino.x + DINO_SIZE / 2
    const originY = dino.y + DINO_SIZE * 0.65

    const handleMove = (e) => {
      setDragLine({ x1: originX, y1: originY, x2: e.clientX, y2: e.clientY })
    }
    const handleUp = (e) => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      setDragLine(null)
      const dinoW = DINO_SIZE
      const targetX = Math.max(0, Math.min(window.innerWidth - dinoW, e.clientX - dinoW / 2))
      const targetY = Math.max(0, Math.min(window.innerHeight - dinoW, e.clientY - dinoW / 2))
      moveDinoTo(id, targetX, targetY)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    setDragLine({ x1: originX, y1: originY, x2: downEvent.clientX, y2: downEvent.clientY })
  }

  const saveScore = () => {
    const session = sessionRef.current
    const finalScore = scoreRef.current
    if (!SCORES_ENABLED || !session || finalScore <= 0) return
    if (submitStatus === 'saving' || submitStatus === 'saved') return

    setSubmitStatus('saving')
    submitScore({ sessionId: session.sessionId, score: finalScore, playerName: playerNameRef.current.trim() })
      .then(() => {
        setSubmitStatus('saved')
        loadLeaderboard()
      })
      .catch(() => setSubmitStatus('error'))
  }

  const runCountdown = () => {
    clearTimeout(countdownTimerRef.current)
    let n = COUNTDOWN_FROM
    setCountdownN(n)
    blip(440, 0.09, 'sine')
    const step = () => {
      n -= 1
      if (n > 0) {
        setCountdownN(n)
        blip(440, 0.09, 'sine')
        countdownTimerRef.current = setTimeout(step, 650)
      } else {
        setCountdownN(0) // shows "GO"
        blip(880, 0.16, 'sine')
        countdownTimerRef.current = setTimeout(() => {
          if (statusRef.current === 'countdown') {
            statusRef.current = 'playing'
            setStatus('playing')
          }
        }, 420)
      }
    }
    countdownTimerRef.current = setTimeout(step, 650)
  }

  const startGame = (requestedDir = 'right') => {
    setSaveModalOpen(false)
    clearTimeout(countdownTimerRef.current)
    ensureAudio()

    const initial = createInitialSnake()
    const initialDir = requestedDir === OPPOSITE.right ? 'right' : requestedDir
    const startMs = DIFFICULTIES[difficultyRef.current].startMs

    snakeRef.current = initial
    directionRef.current = initialDir
    nextDirectionRef.current = initialDir
    scoreRef.current = 0
    tickMsRef.current = startMs
    sessionRef.current = null

    const initialFood = randomEmptyCell(initial)
    foodRef.current = initialFood

    setSnake(initial)
    setDirection(initialDir)
    setScore(0)
    setTickMs(startMs)
    setFood(initialFood)
    setRank(null)
    setSubmitStatus('idle')
    statusRef.current = 'countdown'
    setStatus('countdown')
    runCountdown()

    // Dinos are left alone on purpose — they live on the page, not the run,
    // so a new game shouldn't clear them out.

    setSessionReady(false)
    if (SCORES_ENABLED) {
      const attempt = ++attemptRef.current
      startSession()
        .then((session) => {
          if (attemptRef.current !== attempt) return
          sessionRef.current = session
          setSessionReady(true)
        })
        .catch(() => {})
    }
  }

  useEffect(() => () => clearTimeout(countdownTimerRef.current), [])

  const handleDirection = (dir) => {
    if (statusRef.current === 'playing' || statusRef.current === 'countdown') {
      if (dir !== OPPOSITE[directionRef.current]) {
        nextDirectionRef.current = dir
      }
      return
    }
    if (statusRef.current === 'idle') {
      startGame(dir)
    }
  }

  const tick = () => {
    const snakeNow = snakeRef.current
    const dir = nextDirectionRef.current
    directionRef.current = dir
    setDirection(dir)

    const head = snakeNow[0]
    const newHead = { x: head.x + DIRS[dir].x, y: head.y + DIRS[dir].y }

    if (wrapRef.current) {
      newHead.x = (newHead.x + GRID_COLS) % GRID_COLS
      newHead.y = (newHead.y + GRID_ROWS) % GRID_ROWS
    } else if (isOutOfBounds(newHead)) {
      endGame()
      return
    }

    const foodNow = foodRef.current
    const ateFood = !!foodNow && newHead.x === foodNow.x && newHead.y === foodNow.y
    const bodyToCheck = ateFood ? snakeNow : snakeNow.slice(0, -1)
    if (bodyToCheck.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
      endGame()
      return
    }

    const newSnake = [newHead, ...snakeNow]
    if (!ateFood) newSnake.pop()
    snakeRef.current = newSnake
    setSnake(newSnake)

    if (ateFood) {
      playPickup()
      const newScore = scoreRef.current + SCORE_PER_FOOD
      scoreRef.current = newScore
      setScore(newScore)

      const diff = DIFFICULTIES[difficultyRef.current]
      const nextTick = Math.max(diff.minMs, tickMsRef.current - diff.stepMs)
      tickMsRef.current = nextTick
      setTickMs(nextTick)

      const nextFood = randomEmptyCell(newSnake)
      foodRef.current = nextFood
      setFood(nextFood)
      if (!nextFood) {
        endGame()
      }
    }
  }

  useEffect(() => {
    if (status !== 'playing') return
    const id = setInterval(tick, tickMs)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, tickMs])

  useEffect(() => {
    const KEY_MAP = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right',
      W: 'up', S: 'down', A: 'left', D: 'right',
    }
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const dir = KEY_MAP[e.key]
      if (dir) {
        e.preventDefault()
        handleDirection(dir)
        return
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (statusRef.current === 'playing' || statusRef.current === 'paused') {
          e.preventDefault()
          togglePause()
        }
        return
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (statusRef.current === 'idle' || statusRef.current === 'over') startGame('right')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Silent passphrase listener — same buffered-keystroke pattern as the
  // notes/gallery debug mode. Only fires once the score threshold unlocks it.
  useEffect(() => {
    // No focus guard here on purpose — the hint lives inside the save-score
    // modal next to an autofocused text field, so typing it while that
    // field is focused still has to count.
    let buffer = ''
    const onKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key.length !== 1 || !/[a-z]/i.test(e.key)) return

      buffer = (buffer + e.key.toLowerCase()).slice(-DINO_PASSPHRASE.length)
      if (buffer === DINO_PASSPHRASE) {
        buffer = ''
        summonDino()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cycle walk/idle frames for every dino on screen, each on its own clock.
  useEffect(() => {
    if (dinos.length === 0) return
    const id = setInterval(() => {
      setDinos((list) =>
        list.map((d) => {
          const frames = d.moving ? DINO_WALK_FRAMES : DINO_IDLE_FRAMES
          return { ...d, frame: (d.frame + 1) % frames.length }
        })
      )
    }, DINO_WALK_FRAME_MS)
    return () => clearInterval(id)
  }, [dinos.length])

  // Swipe the board itself to steer — the D-pad stays for tap control.
  const onBoardTouchStart = (e) => {
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY }
  }
  const onBoardTouchEnd = (e) => {
    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.hypot(dx, dy) < 24) return
    if (Math.abs(dx) > Math.abs(dy)) handleDirection(dx > 0 ? 'right' : 'left')
    else handleDirection(dy > 0 ? 'down' : 'up')
  }

  const isNewBest = status === 'over' && score > 0 && score >= best

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />
      <div className="container garbage-run-page">
        <div className="playground-header">
          <div className="playground-eyebrow">// GARBAGE RUN</div>
          <h1 className="playground-title">Drive around, eat garbage, don't crash.</h1>
          <p className="playground-lede">Arrow keys or WASD. Grows every pickup — watch the tail.</p>
        </div>

        <div className="garbage-run-hud">
          <span className="garbage-run-stat">score <strong>{score}</strong></span>
          <span className="garbage-run-stat">best <strong>{best}</strong></span>
          {(status === 'playing' || status === 'paused') && (
            <button type="button" className="garbage-run-restart" onClick={togglePause}>
              {status === 'paused' ? 'resume ▶' : 'pause ⏸'}
            </button>
          )}
          {status !== 'idle' && (
            <button type="button" className="garbage-run-restart" onClick={() => startGame('right')}>
              restart ↻
            </button>
          )}
          <button
            type="button"
            className="garbage-run-restart garbage-run-mute"
            onClick={toggleMute}
            aria-pressed={muted}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        <div className="garbage-run-layout">
          <div className="garbage-run-main-col">
            <div
              ref={boardRef}
              className={`garbage-run-board${status === 'over' ? ' garbage-run-board--shake' : ''}${wrap ? ' garbage-run-board--wrap' : ''}`}
              style={{ width: boardPx, height: boardPx, touchAction: 'none' }}
              onTouchStart={onBoardTouchStart}
              onTouchEnd={onBoardTouchEnd}
            >
              {food && (
                <img
                  src={SPRITES.food}
                  alt=""
                  className="garbage-run-food"
                  style={{ width: cellSize, height: cellSize, left: food.x * cellSize, top: food.y * cellSize }}
                />
              )}

              {snake.map((seg, i) => {
                let src
                if (i === 0) {
                  src = SPRITES.head[direction]
                } else {
                  const info = segmentSpriteKey(snake, i)
                  src = info.kind === 'tail' ? SPRITES.tail[info.dir] : SPRITES[info.key]
                }
                return (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="garbage-run-segment"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      left: seg.x * cellSize,
                      top: seg.y * cellSize,
                    }}
                  />
                )
              })}

              {status === 'idle' && (
                <div className="garbage-run-overlay">
                  <p>arrow keys / wasd · swipe or tap below</p>
                  <div className="garbage-run-settings">
                    <div className="garbage-run-setting-row">
                      {DIFFICULTY_IDS.map((id) => (
                        <button
                          key={id}
                          type="button"
                          className={`garbage-run-chip${difficulty === id ? ' active' : ''}`}
                          onClick={() => setDifficultyPref(id)}
                        >
                          {DIFFICULTIES[id].label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={`garbage-run-chip${wrap ? ' active' : ''}`}
                      onClick={toggleWrap}
                    >
                      {wrap ? 'walls: wrap around' : 'walls: solid'}
                    </button>
                  </div>
                  <button type="button" className="btn-pill pink" style={{ border: 'none', padding: '11px 24px', fontSize: 13 }} onClick={() => startGame('right')}>
                    ▶ start
                  </button>
                </div>
              )}

              {status === 'countdown' && (
                <div className="garbage-run-overlay garbage-run-overlay--countdown">
                  <span className="garbage-run-countdown">{countdownN > 0 ? countdownN : 'GO'}</span>
                </div>
              )}

              {status === 'paused' && (
                <div className="garbage-run-overlay">
                  <p>paused</p>
                  <button type="button" className="btn-pill pink" style={{ border: 'none', padding: '11px 24px', fontSize: 13 }} onClick={togglePause}>
                    ▶ resume
                  </button>
                </div>
              )}

              {status === 'over' && (
                <div className="garbage-run-overlay garbage-run-overlay--crashed">
                  <span className="garbage-run-crashed-glyph">💥</span>
                </div>
              )}
            </div>

            {status !== 'over' && (
              <div className="garbage-run-dpad" aria-hidden={false}>
                <span />
                <button type="button" className="garbage-run-dpad-btn" onClick={() => handleDirection('up')} aria-label="Up">▲</button>
                <span />
                <button type="button" className="garbage-run-dpad-btn" onClick={() => handleDirection('left')} aria-label="Left">◀</button>
                <span className="garbage-run-dpad-center" />
                <button type="button" className="garbage-run-dpad-btn" onClick={() => handleDirection('right')} aria-label="Right">▶</button>
                <span />
                <button type="button" className="garbage-run-dpad-btn" onClick={() => handleDirection('down')} aria-label="Down">▼</button>
                <span />
              </div>
            )}

            {status === 'over' && (
              <div className="garbage-run-crash-panel">
                <p className="garbage-run-crash-title">💥 crashed!</p>
                <p className="garbage-run-overlay-score">
                  score {score}
                  {isNewBest ? ' — new best!' : ''}
                </p>
                {rank && (
                  <p className="garbage-run-rank">
                    you placed <strong>#{rank.rank}</strong> of {rank.total}
                  </p>
                )}

                <div className="garbage-run-settings garbage-run-settings--panel">
                  <div className="garbage-run-setting-row">
                    {DIFFICULTY_IDS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className={`garbage-run-chip${difficulty === id ? ' active' : ''}`}
                        onClick={() => setDifficultyPref(id)}
                      >
                        {DIFFICULTIES[id].label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`garbage-run-chip${wrap ? ' active' : ''}`}
                      onClick={toggleWrap}
                    >
                      {wrap ? 'wrap' : 'solid'}
                    </button>
                  </div>
                </div>

                {SCORES_ENABLED && submitStatus !== 'saved' && !saveModalOpen && (
                  <button type="button" className="garbage-run-restart" onClick={() => setSaveModalOpen(true)}>
                    save score ↑
                  </button>
                )}
                {submitStatus === 'saved' && <p className="garbage-run-submit-status" role="status">saved to leaderboard ✓</p>}

                <button
                  type="button"
                  className="btn-pill dark"
                  style={{ border: 'none', padding: '11px 24px', fontSize: 13 }}
                  onClick={() => startGame('right')}
                >
                  play again ↻
                </button>
              </div>
            )}
          </div>

          <Leaderboard
            label="// TOP RUNS"
            enabled={LEADERBOARD_ENABLED}
            status={leaderboardStatus}
            rows={leaderboard}
            emptyText="no runs yet — be the first"
            highlightName={playerName}
          />
        </div>

        {saveModalOpen && (
          <SaveScoreModal
            score={score}
            playerName={playerName}
            onNameChange={updatePlayerName}
            onSubmit={saveScore}
            onClose={closeSaveModal}
            onPlayAgain={() => startGame('right')}
            submitStatus={submitStatus}
            sessionReady={sessionReady}
          >
            <p className="garbage-run-dino-hint">
              🦖 psst — type <strong>{DINO_PASSPHRASE}</strong> and see what happens
            </p>
          </SaveScoreModal>
        )}
      </div>

      {dragLine && (
        <svg className="garbage-run-drag-line">
          <line x1={dragLine.x1} y1={dragLine.y1} x2={dragLine.x2} y2={dragLine.y2} />
        </svg>
      )}

      {dinos.map((dino) => {
        const frames = dino.moving ? DINO_WALK_FRAMES : DINO_IDLE_FRAMES
        return (
          <img
            key={dino.id}
            src={frames[dino.frame % frames.length]}
            alt=""
            draggable={false}
            className="garbage-run-dino"
            onMouseDown={(e) => startDinoDrag(dino.id, e)}
            onTransitionEnd={() => handleDinoArrive(dino.id)}
            style={{
              width: DINO_SIZE,
              left: dino.x,
              top: dino.y,
              transitionDuration: `${dino.duration}ms`,
              transform: dino.facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
            }}
          />
        )
      })}
    </div>
  )
}
