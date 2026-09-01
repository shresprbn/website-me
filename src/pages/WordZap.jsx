import { useEffect, useRef, useState } from 'react'
import Nav from '../components/Nav'
import { useWindowWidth, useWindowHeight } from '../hooks/useWindowWidth'
import {
  STARTING_LIVES,
  MAX_CONCURRENT_WORDS,
  DIFFICULTIES,
  DIFFICULTY_IDS,
  comboMultiplier,
  pointsForWord,
  pickWeightedWord,
  fallSpeedAt,
  spawnIntervalAt,
} from '../lib/wordZapUtils'
import { LEADERBOARD_ENABLED, SCORES_ENABLED, fetchTopScores, startSession, submitScore } from '../lib/wordZap'
import Leaderboard from '../components/Leaderboard'
import SaveScoreModal from '../components/SaveScoreModal'

const BEST_KEY = 'word-zap-best-score'
const NAME_KEY = 'word-zap-player-name'
const MUTE_KEY = 'word-zap-muted'
const DIFF_KEY = 'word-zap-difficulty'
const ZAP_EFFECT_MS = 220
const POPUP_MS = 700
const MISS_FLASH_MS = 180

export default function WordZap() {
  const width = useWindowWidth()
  const windowHeight = useWindowHeight()
  const boardWidth = Math.max(300, Math.min(640, width - 48))
  const boardHeight = Math.max(340, Math.min(560, Math.round(windowHeight * 0.56)))

  const [status, setStatus] = useState('idle') // idle | playing | paused | over
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [lives, setLives] = useState(STARTING_LIVES)
  const [maxLives, setMaxLives] = useState(STARTING_LIVES)
  const [streak, setStreak] = useState(0)
  const [stats, setStats] = useState(null) // { wpm, accuracy, seconds }
  const [words, setWords] = useState([])
  const [lockedWordId, setLockedWordId] = useState(null)
  const [zapEffects, setZapEffects] = useState([])
  const [popups, setPopups] = useState([])
  const [missFlash, setMissFlash] = useState(false)
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === '1')
  const [difficulty, setDifficulty] = useState(() => {
    const saved = localStorage.getItem(DIFF_KEY)
    return DIFFICULTIES[saved] ? saved : 'normal'
  })
  const [playerName, setPlayerName] = useState(() => localStorage.getItem(NAME_KEY) || '')
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardStatus, setLeaderboardStatus] = useState('idle')
  const [submitStatus, setSubmitStatus] = useState('idle') // idle | saving | saved | error
  const [sessionReady, setSessionReady] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)

  const boardWidthRef = useRef(boardWidth)
  const boardHeightRef = useRef(boardHeight)
  boardWidthRef.current = boardWidth
  boardHeightRef.current = boardHeight

  const statusRef = useRef(status)
  const scoreRef = useRef(score)
  const livesRef = useRef(lives)
  const streakRef = useRef(0)
  const wordsRef = useRef([])
  const lockedWordIdRef = useRef(null)
  const playerNameRef = useRef(playerName)
  const mutedRef = useRef(muted)
  const difficultyRef = useRef(difficulty)
  const sessionRef = useRef(null)
  const attemptRef = useRef(0)
  const nextWordIdRef = useRef(1)
  const nextEffectIdRef = useRef(1)
  const gameStartAtRef = useRef(0)
  const lastSpawnAtRef = useRef(0)
  const charsTypedRef = useRef(0)
  const missKeysRef = useRef(0)
  const audioCtxRef = useRef(null)
  const hiddenInputRef = useRef(null)

  statusRef.current = status
  scoreRef.current = score
  livesRef.current = lives
  playerNameRef.current = playerName
  mutedRef.current = muted
  difficultyRef.current = difficulty

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
  const blip = (freq, dur = 0.08, type = 'square', when = 0, endFreq = null) => {
    if (mutedRef.current) return
    const ctx = audioCtxRef.current
    if (!ctx) return
    const t = ctx.currentTime + when
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.14, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + dur + 0.03)
  }
  const playZap = () => blip(880, 0.12, 'sawtooth', 0, 220)
  const playMiss = () => blip(150, 0.09, 'square')
  const playOver = () => {
    ;[440, 330, 247].forEach((f, i) => blip(f, 0.25, 'triangle', i * 0.12))
  }
  const toggleMute = () => {
    setMuted((m) => {
      const next = !m
      localStorage.setItem(MUTE_KEY, next ? '1' : '0')
      return next
    })
  }

  const setDifficultyPref = (id) => {
    if (!DIFFICULTIES[id]) return
    setDifficulty(id)
    localStorage.setItem(DIFF_KEY, id)
  }

  const togglePause = () => {
    if (statusRef.current === 'playing') {
      statusRef.current = 'paused'
      setStatus('paused')
    } else if (statusRef.current === 'paused') {
      statusRef.current = 'playing'
      setStatus('playing')
      hiddenInputRef.current?.focus()
    }
  }

  const breakStreak = () => {
    if (streakRef.current !== 0) {
      streakRef.current = 0
      setStreak(0)
    }
  }

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

  const spawnZapEffect = (word, gained) => {
    const originX = boardWidthRef.current / 2
    const originY = boardHeightRef.current
    const id = nextEffectIdRef.current++
    const wordCenterX = word.x + Math.max(32, word.text.length * 7.5)
    setZapEffects((prev) => [...prev, { id, x1: originX, y1: originY, x2: wordCenterX, y2: word.y }])
    setPopups((prev) => [...prev, { id: `p${id}`, x: wordCenterX, y: word.y, text: `+${gained}` }])
    setTimeout(() => setZapEffects((prev) => prev.filter((e) => e.id !== id)), ZAP_EFFECT_MS)
    setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== `p${id}`)), POPUP_MS)
  }

  const flashMiss = () => {
    missKeysRef.current += 1
    breakStreak()
    playMiss()
    setMissFlash(true)
    setTimeout(() => setMissFlash(false), MISS_FLASH_MS)
  }

  const zapWord = (word) => {
    streakRef.current += 1
    setStreak(streakRef.current)
    const mult = comboMultiplier(streakRef.current)
    const gained = Math.round(pointsForWord(word.text) * mult)
    scoreRef.current += gained
    setScore(scoreRef.current)
    wordsRef.current = wordsRef.current.filter((w) => w.id !== word.id)
    setWords(wordsRef.current)
    lockedWordIdRef.current = null
    setLockedWordId(null)
    playZap()
    spawnZapEffect(word, gained)
  }

  const triggerGameOver = () => {
    statusRef.current = 'over'
    setStatus('over')
    playOver()
    const finalScore = scoreRef.current
    const elapsedSec = Math.max(1, (performance.now() - gameStartAtRef.current) / 1000)
    const totalKeys = charsTypedRef.current + missKeysRef.current
    setStats({
      wpm: Math.round(charsTypedRef.current / 5 / (elapsedSec / 60)),
      accuracy: totalKeys ? Math.round((charsTypedRef.current / totalKeys) * 100) : 100,
      seconds: Math.round(elapsedSec),
    })
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
    breakStreak()
    livesRef.current = Math.max(0, livesRef.current - 1)
    setLives(livesRef.current)
    if (livesRef.current <= 0) triggerGameOver()
  }

  const releaseLock = () => {
    const id = lockedWordIdRef.current
    if (!id) return false
    const w = wordsRef.current.find((x) => x.id === id)
    if (w) w.matchedLen = 0
    lockedWordIdRef.current = null
    setLockedWordId(null)
    setWords([...wordsRef.current])
    return true
  }

  useEffect(() => {
    let raf
    let lastTime = performance.now()

    const loop = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now

      if (statusRef.current === 'playing') {
        const elapsedMs = now - gameStartAtRef.current
        const diff = DIFFICULTIES[difficultyRef.current]
        const speed = fallSpeedAt(elapsedMs, diff.speedMul)
        const interval = spawnIntervalAt(elapsedMs, diff.spawnMul)
        const floorY = boardHeightRef.current

        if (now - lastSpawnAtRef.current >= interval && wordsRef.current.length < MAX_CONCURRENT_WORDS) {
          spawnWord()
          lastSpawnAtRef.current = now
        }

        const missed = []
        wordsRef.current.forEach((w) => {
          w.y += speed * dt
          if (w.y >= floorY) missed.push(w)
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
      if (statusRef.current === 'over' || statusRef.current === 'idle') return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === 'Escape') {
        e.preventDefault()
        // Escape frees a wrongly-locked word; if nothing's locked, it pauses.
        if (!releaseLock()) togglePause()
        return
      }
      if (statusRef.current === 'paused') return
      if (e.key === 'Backspace') {
        e.preventDefault()
        releaseLock()
        return
      }

      const ch = e.key.toLowerCase()
      if (!/^[a-z]$/.test(ch)) return

      const lockedId = lockedWordIdRef.current
      if (lockedId) {
        const w = wordsRef.current.find((x) => x.id === lockedId)
        if (w) {
          if (w.text[w.matchedLen] === ch) {
            w.matchedLen += 1
            charsTypedRef.current += 1
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
      charsTypedRef.current += 1
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
    ensureAudio()

    const diff = DIFFICULTIES[difficultyRef.current]
    wordsRef.current = []
    lockedWordIdRef.current = null
    scoreRef.current = 0
    livesRef.current = diff.lives
    streakRef.current = 0
    charsTypedRef.current = 0
    missKeysRef.current = 0
    sessionRef.current = null
    gameStartAtRef.current = performance.now()
    lastSpawnAtRef.current = performance.now()
    statusRef.current = 'playing'

    setWords([])
    setLockedWordId(null)
    setScore(0)
    setLives(diff.lives)
    setMaxLives(diff.lives)
    setStreak(0)
    setStats(null)
    setZapEffects([])
    setPopups([])
    setStatus('playing')
    setSubmitStatus('idle')
    setTimeout(() => hiddenInputRef.current?.focus(), 0)

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
  const mult = comboMultiplier(streak)

  const difficultyChips = (
    <div className="word-zap-chips">
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
  )

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />
      <div className="container word-zap-page">
        <div className="playground-header">
          <div className="playground-eyebrow">// WORD ZAP</div>
          <h1 className="playground-title">Type fast. Zap the words. Don't miss.</h1>
          <p className="playground-lede">
            Just start typing — the closest matching word locks in. Longer words and streaks score more.
            Esc frees a bad lock.
          </p>
        </div>

        <div className="word-zap-hud">
          <span className="word-zap-stat">score <strong>{score}</strong></span>
          <span className="word-zap-stat">best <strong>{best}</strong></span>
          {mult > 1 && status === 'playing' && (
            <span className="word-zap-stat word-zap-combo">🔥 {streak} · {mult}×</span>
          )}
          <span className="word-zap-lives" aria-label={`${lives} lives left`}>
            {Array.from({ length: maxLives }).map((_, i) => (
              <span key={i} className={i < lives ? 'word-zap-heart' : 'word-zap-heart word-zap-heart--lost'}>
                {i < lives ? '❤' : '♡'}
              </span>
            ))}
          </span>
          {(status === 'playing' || status === 'paused') && (
            <button type="button" className="garbage-run-restart" onClick={togglePause}>
              {status === 'paused' ? 'resume ▶' : 'pause ⏸'}
            </button>
          )}
          {status !== 'idle' && (
            <button type="button" className="garbage-run-restart" onClick={startGame}>
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

        <div className="word-zap-layout">
          <div className="word-zap-main-col">
            <div
              className={`word-zap-board${missFlash ? ' word-zap-board--miss' : ''}`}
              style={{ width: boardWidth, height: boardHeight }}
              onClick={() => hiddenInputRef.current?.focus()}
            >
              <input
                ref={hiddenInputRef}
                className="word-zap-hidden-input"
                type="text"
                value=""
                onChange={() => {}}
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                aria-hidden="true"
                tabIndex={-1}
              />

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

              <svg className="word-zap-fx" width={boardWidth} height={boardHeight}>
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
                  {difficultyChips}
                  <button type="button" className="btn-pill pink" style={{ border: 'none', padding: '11px 24px', fontSize: 13 }} onClick={startGame}>
                    ▶ start
                  </button>
                  <p className="word-zap-mobile-hint">on a phone? tap the board, then type</p>
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
                  <p className="garbage-run-crash-title" style={{ color: '#fff' }}>⚡ zapped out!</p>
                  <p className="garbage-run-overlay-score" style={{ color: '#fff' }}>
                    score {score}
                    {isNewBest ? ' — new best!' : ''}
                  </p>
                  {stats && (
                    <p className="word-zap-summary">
                      {stats.wpm} wpm · {stats.accuracy}% accuracy · {stats.seconds}s
                    </p>
                  )}
                  {difficultyChips}

                  {SCORES_ENABLED && submitStatus !== 'saved' && !saveModalOpen && (
                    <button type="button" className="garbage-run-restart" onClick={() => setSaveModalOpen(true)}>
                      save score ↑
                    </button>
                  )}
                  {submitStatus === 'saved' && <p className="garbage-run-submit-status" role="status" style={{ color: '#fff' }}>saved to leaderboard ✓</p>}

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

          <Leaderboard
            label="// TOP SCORES"
            className="word-zap-leaderboard"
            enabled={LEADERBOARD_ENABLED}
            status={leaderboardStatus}
            rows={leaderboard}
            emptyText="no scores yet — be the first"
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
            onPlayAgain={startGame}
            submitStatus={submitStatus}
            sessionReady={sessionReady}
          />
        )}
      </div>
    </div>
  )
}
