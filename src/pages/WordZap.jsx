import { useEffect, useRef, useState } from 'react'
import Nav from '../components/Nav'
import { useWindowWidth } from '../hooks/useWindowWidth'
import {
  STARTING_LIVES,
  MAX_CONCURRENT_WORDS,
  pointsForWord,
  pickWeightedWord,
  fallSpeedAt,
  spawnIntervalAt,
} from '../lib/wordZapUtils'
import { LEADERBOARD_ENABLED, SCORES_ENABLED, fetchTopScores, startSession, submitScore } from '../lib/wordZap'

const BEST_KEY = 'word-zap-best-score'
const NAME_KEY = 'word-zap-player-name'
const BOARD_HEIGHT = 440
const ZAP_EFFECT_MS = 220
const POPUP_MS = 700
const MISS_FLASH_MS = 180

export default function WordZap() {
  const width = useWindowWidth()
  const boardWidth = Math.max(300, Math.min(640, width - 48))

  const [status, setStatus] = useState('idle') // idle | playing | over
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [lives, setLives] = useState(STARTING_LIVES)
  const [words, setWords] = useState([])
  const [lockedWordId, setLockedWordId] = useState(null)
  const [zapEffects, setZapEffects] = useState([])
  const [popups, setPopups] = useState([])
  const [missFlash, setMissFlash] = useState(false)
  const [playerName, setPlayerName] = useState(() => localStorage.getItem(NAME_KEY) || '')
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardStatus, setLeaderboardStatus] = useState('idle')
  const [submitStatus, setSubmitStatus] = useState('idle') // idle | saving | saved | error
  const [sessionReady, setSessionReady] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)

  const nameInputRef = useRef(null)
  const boardWidthRef = useRef(boardWidth)
  boardWidthRef.current = boardWidth

  const statusRef = useRef(status)
  const scoreRef = useRef(score)
  const livesRef = useRef(lives)
  const wordsRef = useRef([])
  const lockedWordIdRef = useRef(null)
  const playerNameRef = useRef(playerName)
  const sessionRef = useRef(null)
  const attemptRef = useRef(0)
  const nextWordIdRef = useRef(1)
  const nextEffectIdRef = useRef(1)
  const gameStartAtRef = useRef(0)
  const lastSpawnAtRef = useRef(0)

  statusRef.current = status
  scoreRef.current = score
  livesRef.current = lives
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
    if (saveModalOpen) {
      const t = setTimeout(() => nameInputRef.current?.focus(), 10)
      return () => clearTimeout(t)
    }
  }, [saveModalOpen])

  // ── Spawning + the falling/typing game loop ──────────────────────────
  const spawnWord = () => {
    const existing = new Set(wordsRef.current.map((w) => w.text))
    const text = pickWeightedWord(existing)
    const approxWidth = Math.max(64, text.length * 15 + 28)
    const maxX = Math.max(8, boardWidthRef.current - approxWidth)
    const x = Math.random() * maxX
    const word = { id: nextWordIdRef.current++, text, x, y: -28, matchedLen: 0 }
    wordsRef.current = [...wordsRef.current, word]
  }

  const spawnZapEffect = (word) => {
    const originX = boardWidthRef.current / 2
    const originY = BOARD_HEIGHT
    const id = nextEffectIdRef.current++
    const wordCenterX = word.x + Math.max(32, word.text.length * 7.5)
    setZapEffects((prev) => [...prev, { id, x1: originX, y1: originY, x2: wordCenterX, y2: word.y }])
    setPopups((prev) => [...prev, { id: `p${id}`, x: wordCenterX, y: word.y, text: `+${pointsForWord(word.text)}` }])
    setTimeout(() => setZapEffects((prev) => prev.filter((e) => e.id !== id)), ZAP_EFFECT_MS)
    setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== `p${id}`)), POPUP_MS)
  }

  const flashMiss = () => {
    setMissFlash(true)
    setTimeout(() => setMissFlash(false), MISS_FLASH_MS)
  }

  const zapWord = (word) => {
    scoreRef.current += pointsForWord(word.text)
    setScore(scoreRef.current)
    wordsRef.current = wordsRef.current.filter((w) => w.id !== word.id)
    setWords(wordsRef.current)
    lockedWordIdRef.current = null
    setLockedWordId(null)
    spawnZapEffect(word)
  }

  const triggerGameOver = () => {
    statusRef.current = 'over'
    setStatus('over')
    const finalScore = scoreRef.current
    setBest((prevBest) => {
      if (finalScore > prevBest) {
        localStorage.setItem(BEST_KEY, String(finalScore))
        return finalScore
      }
      return prevBest
    })
  }

  const missWord = (word) => {
    if (lockedWordIdRef.current === word.id) {
      lockedWordIdRef.current = null
      setLockedWordId(null)
    }
    livesRef.current = Math.max(0, livesRef.current - 1)
    setLives(livesRef.current)
    if (livesRef.current <= 0) triggerGameOver()
  }

  useEffect(() => {
    let raf
    let lastTime = performance.now()

    const loop = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now

      if (statusRef.current === 'playing') {
        const elapsedMs = now - gameStartAtRef.current
        const speed = fallSpeedAt(elapsedMs)
        const interval = spawnIntervalAt(elapsedMs)

        if (now - lastSpawnAtRef.current >= interval && wordsRef.current.length < MAX_CONCURRENT_WORDS) {
          spawnWord()
          lastSpawnAtRef.current = now
        }

        const missed = []
        wordsRef.current.forEach((w) => {
          w.y += speed * dt
          if (w.y >= BOARD_HEIGHT) missed.push(w)
        })
        if (missed.length) {
          const missedIds = new Set(missed.map((w) => w.id))
          wordsRef.current = wordsRef.current.filter((w) => !missedIds.has(w.id))
          missed.forEach(missWord)
        }
        setWords([...wordsRef.current])
      }

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Typing ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if (statusRef.current !== 'playing') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const ch = e.key.toLowerCase()
      if (!/^[a-z]$/.test(ch)) return

      const lockedId = lockedWordIdRef.current
      if (lockedId) {
        const w = wordsRef.current.find((x) => x.id === lockedId)
        if (w) {
          if (w.text[w.matchedLen] === ch) {
            w.matchedLen += 1
            setWords([...wordsRef.current])
            if (w.matchedLen === w.text.length) zapWord(w)
          } else {
            flashMiss()
          }
          return
        }
        lockedWordIdRef.current = null
      }

      const candidates = wordsRef.current.filter((w) => w.text[0] === ch)
      if (!candidates.length) {
        flashMiss()
        return
      }
      candidates.sort((a, b) => b.y - a.y)
      const target = candidates[0]
      target.matchedLen = 1
      lockedWordIdRef.current = target.id
      setLockedWordId(target.id)
      setWords([...wordsRef.current])
      if (target.matchedLen === target.text.length) zapWord(target)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const startGame = () => {
    setSaveModalOpen(false)

    wordsRef.current = []
    lockedWordIdRef.current = null
    scoreRef.current = 0
    livesRef.current = STARTING_LIVES
    sessionRef.current = null
    gameStartAtRef.current = performance.now()
    lastSpawnAtRef.current = performance.now()
    statusRef.current = 'playing'

    setWords([])
    setLockedWordId(null)
    setScore(0)
    setLives(STARTING_LIVES)
    setZapEffects([])
    setPopups([])
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

  const isNewBest = status === 'over' && score > 0 && score >= best

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />
      <div className="container word-zap-page">
        <div className="playground-header">
          <div className="playground-eyebrow">// WORD ZAP</div>
          <h1 className="playground-title">Type fast. Zap the words. Don't miss.</h1>
          <p className="playground-lede">Just start typing — the closest matching word locks in. Longer words score more.</p>
        </div>

        <div className="word-zap-hud">
          <span className="word-zap-stat">score <strong>{score}</strong></span>
          <span className="word-zap-stat">best <strong>{best}</strong></span>
          <span className="word-zap-lives" aria-label={`${lives} lives left`}>
            {Array.from({ length: STARTING_LIVES }).map((_, i) => (
              <span key={i} className={i < lives ? 'word-zap-heart' : 'word-zap-heart word-zap-heart--lost'}>
                {i < lives ? '❤' : '♡'}
              </span>
            ))}
          </span>
          {status !== 'idle' && (
            <button type="button" className="garbage-run-restart" onClick={startGame}>
              restart ↻
            </button>
          )}
        </div>

        <div className="word-zap-layout">
          <div className="word-zap-main-col">
            <div
              className={`word-zap-board${missFlash ? ' word-zap-board--miss' : ''}`}
              style={{ width: boardWidth, height: BOARD_HEIGHT }}
            >
              {words.map((w) => {
                const isLocked = w.id === lockedWordId
                const matched = w.text.slice(0, w.matchedLen)
                const rest = w.text.slice(w.matchedLen)
                return (
                  <span
                    key={w.id}
                    className={`word-zap-word${isLocked ? ' word-zap-word--locked' : ''}`}
                    style={{ left: w.x, top: w.y }}
                  >
                    <span className="word-zap-word-matched">{matched}</span>
                    <span className="word-zap-word-rest">{rest}</span>
                  </span>
                )
              })}

              <svg className="word-zap-fx" width={boardWidth} height={BOARD_HEIGHT}>
                {zapEffects.map((fx) => (
                  <line key={fx.id} className="word-zap-zap-line" x1={fx.x1} y1={fx.y1} x2={fx.x2} y2={fx.y2} />
                ))}
              </svg>

              {popups.map((p) => (
                <span key={p.id} className="word-zap-popup" style={{ left: p.x, top: p.y }}>
                  {p.text}
                </span>
              ))}

              {status === 'idle' && (
                <div className="garbage-run-overlay">
                  <p>words fall — type them before they hit the floor</p>
                  <button type="button" className="btn-pill pink" style={{ border: 'none', padding: '11px 24px', fontSize: 13 }} onClick={startGame}>
                    ▶ start
                  </button>
                </div>
              )}

              {status === 'over' && (
                <div className="garbage-run-overlay garbage-run-overlay--crashed">
                  <p className="garbage-run-crash-title" style={{ color: '#fff' }}>⚡ zapped out!</p>
                  <p className="garbage-run-overlay-score" style={{ color: '#fff' }}>
                    score {score}
                    {isNewBest ? ' — new best!' : ''}
                  </p>

                  {SCORES_ENABLED && submitStatus !== 'saved' && !saveModalOpen && (
                    <button type="button" className="garbage-run-restart" onClick={() => setSaveModalOpen(true)}>
                      save score ↑
                    </button>
                  )}
                  {submitStatus === 'saved' && <p className="garbage-run-submit-status" style={{ color: '#fff' }}>saved to leaderboard ✓</p>}

                  <button
                    type="button"
                    className="btn-pill pink"
                    style={{ border: 'none', padding: '11px 24px', fontSize: 13 }}
                    onClick={startGame}
                  >
                    play again ↻
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="garbage-run-leaderboard word-zap-leaderboard">
            <div className="garbage-run-leaderboard-label">// TOP SCORES</div>
            {!LEADERBOARD_ENABLED && <p className="gallery-empty">leaderboard isn't configured</p>}
            {leaderboardStatus === 'loading' && <p className="gallery-empty">loading…</p>}
            {leaderboardStatus === 'error' && <p className="gallery-empty">couldn't load the leaderboard</p>}
            {leaderboardStatus === 'ready' && leaderboard.length === 0 && (
              <p className="gallery-empty">no scores yet — be the first</p>
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
        </div>

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
                  onClick={startGame}
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
