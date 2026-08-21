import { useEffect, useRef, useState } from 'react'
import Nav from '../components/Nav'
import { useWindowWidth } from '../hooks/useWindowWidth'
import { SPRITES } from '../lib/snakeSprites'
import {
  GRID_COLS,
  DIRS,
  OPPOSITE,
  TICK_START_MS,
  TICK_MIN_MS,
  TICK_STEP_MS,
  SCORE_PER_FOOD,
  createInitialSnake,
  segmentSpriteKey,
  randomEmptyCell,
  isOutOfBounds,
} from '../lib/snakeUtils'
import { LEADERBOARD_ENABLED, SCORES_ENABLED, fetchTopScores, startSession, submitScore } from '../lib/garbageRun'

const BEST_KEY = 'garbage-run-best-score'
const NAME_KEY = 'garbage-run-player-name'
const CELL_MAX = 30

export default function GarbageRun() {
  const width = useWindowWidth()
  const cellSize = Math.max(14, Math.min(CELL_MAX, Math.floor(Math.min(width - 48, GRID_COLS * CELL_MAX) / GRID_COLS)))
  const boardPx = cellSize * GRID_COLS

  const [snake, setSnake] = useState(createInitialSnake)
  const [direction, setDirection] = useState('right')
  const [food, setFood] = useState(null)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [status, setStatus] = useState('idle') // idle | playing | over
  const [tickMs, setTickMs] = useState(TICK_START_MS)
  const [playerName, setPlayerName] = useState(() => localStorage.getItem(NAME_KEY) || '')
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardStatus, setLeaderboardStatus] = useState('idle')
  const [submitStatus, setSubmitStatus] = useState('idle') // idle | saving | saved | error
  const [sessionReady, setSessionReady] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const nameInputRef = useRef(null)

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

  snakeRef.current = snake
  directionRef.current = direction
  foodRef.current = food
  scoreRef.current = score
  tickMsRef.current = tickMs
  statusRef.current = status
  playerNameRef.current = playerName

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
    if (!saveModalOpen) return
    const t = setTimeout(() => nameInputRef.current?.focus(), 10)
    const onKey = (e) => {
      if (e.key === 'Escape') closeSaveModal()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveModalOpen])

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
    setStatus('over')
    setSubmitStatus('idle')
    setBest((prevBest) => {
      if (scoreRef.current > prevBest) {
        localStorage.setItem(BEST_KEY, String(scoreRef.current))
        return scoreRef.current
      }
      return prevBest
    })
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

  const startGame = (requestedDir = 'right') => {
    setSaveModalOpen(false)

    const initial = createInitialSnake()
    const initialDir = requestedDir === OPPOSITE.right ? 'right' : requestedDir

    snakeRef.current = initial
    directionRef.current = initialDir
    nextDirectionRef.current = initialDir
    scoreRef.current = 0
    tickMsRef.current = TICK_START_MS
    sessionRef.current = null

    const initialFood = randomEmptyCell(initial)
    foodRef.current = initialFood

    setSnake(initial)
    setDirection(initialDir)
    setScore(0)
    setTickMs(TICK_START_MS)
    setFood(initialFood)
    setStatus('playing')
    setSubmitStatus('idle')

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

  const handleDirection = (dir) => {
    if (statusRef.current === 'playing') {
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

    if (isOutOfBounds(newHead)) {
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
      const newScore = scoreRef.current + SCORE_PER_FOOD
      scoreRef.current = newScore
      setScore(newScore)

      const nextTick = Math.max(TICK_MIN_MS, tickMsRef.current - TICK_STEP_MS)
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
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (statusRef.current !== 'playing') startGame('right')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          {status !== 'idle' && (
            <button type="button" className="garbage-run-restart" onClick={() => startGame('right')}>
              restart ↻
            </button>
          )}
        </div>

        <div className="garbage-run-board" style={{ width: boardPx, height: boardPx }}>
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
                style={{ width: cellSize, height: cellSize, left: seg.x * cellSize, top: seg.y * cellSize }}
              />
            )
          })}

          {status === 'idle' && (
            <div className="garbage-run-overlay">
              <p>arrow keys / wasd — or tap a direction below</p>
              <button type="button" className="btn-pill pink" style={{ border: 'none', padding: '11px 24px', fontSize: 13 }} onClick={() => startGame('right')}>
                ▶ start
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
          <div className="garbage-run-crash-row">
            <div className="garbage-run-leaderboard">
              <div className="garbage-run-leaderboard-label">// TOP RUNS</div>
              {!LEADERBOARD_ENABLED && <p className="gallery-empty">leaderboard isn't configured</p>}
              {leaderboardStatus === 'loading' && <p className="gallery-empty">loading…</p>}
              {leaderboardStatus === 'error' && <p className="gallery-empty">couldn't load the leaderboard</p>}
              {leaderboardStatus === 'ready' && leaderboard.length === 0 && (
                <p className="gallery-empty">no runs yet — be the first</p>
              )}
              {leaderboardStatus === 'ready' && leaderboard.length > 0 && (
                <ol className="garbage-run-leaderboard-list">
                  {leaderboard.map((row, i) => (
                    <li key={row.id}>
                      <span className="garbage-run-leaderboard-rank">#{i + 1}</span>
                      <span className="garbage-run-leaderboard-name">{row.player_name || 'anonymous'}</span>
                      <span className="garbage-run-leaderboard-score">{row.score}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="garbage-run-crash-panel">
              <p className="garbage-run-crash-title">💥 crashed!</p>
              <p className="garbage-run-overlay-score">
                score {score}
                {isNewBest ? ' — new best!' : ''}
              </p>

              {SCORES_ENABLED && submitStatus !== 'saved' && !saveModalOpen && (
                <button type="button" className="garbage-run-restart" onClick={() => setSaveModalOpen(true)}>
                  save score ↑
                </button>
              )}
              {submitStatus === 'saved' && <p className="garbage-run-submit-status">saved to leaderboard ✓</p>}

              <button
                type="button"
                className="btn-pill dark"
                style={{ border: 'none', padding: '11px 24px', fontSize: 13 }}
                onClick={() => startGame('right')}
              >
                play again ↻
              </button>
            </div>
          </div>
        )}

        {saveModalOpen && (
          <div className="save-modal-overlay" onClick={closeSaveModal}>
            <div className="save-modal" role="dialog" aria-modal="true" aria-label="Save score" onClick={(e) => e.stopPropagation()}>
              <div className="save-modal-label">// SAVE SCORE</div>
              <p className="save-modal-copy">
                score {score}. Add your name if you want credit on the leaderboard — or leave it blank.
              </p>
              <input
                ref={nameInputRef}
                type="text"
                placeholder="your name (optional)"
                value={playerName}
                onChange={(e) => updatePlayerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveScore()
                }}
                className="save-modal-input"
                maxLength={30}
              />
              {submitStatus === 'error' && <p className="save-to-gallery-error">couldn't save that run — try again</p>}
              <div className="save-modal-actions">
                <button type="button" className="save-modal-cancel" onClick={closeSaveModal} disabled={submitStatus === 'saving'}>
                  cancel
                </button>
                <button
                  type="button"
                  className="btn-pill dark"
                  style={{ padding: '10px 20px', fontSize: 13, border: 'none' }}
                  onClick={() => startGame('right')}
                  disabled={submitStatus === 'saving'}
                >
                  play again ↻
                </button>
                <button
                  type="button"
                  className="btn-pill pink"
                  style={{ padding: '10px 20px', fontSize: 13, border: 'none' }}
                  onClick={saveScore}
                  disabled={submitStatus === 'saving' || !sessionReady}
                >
                  {submitStatus === 'saving' ? 'saving…' : sessionReady ? 'save ↑' : 'connecting…'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
