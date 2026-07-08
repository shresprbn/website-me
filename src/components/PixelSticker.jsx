import { useEffect, useRef } from 'react'

const MOVES = [
  { name: 'fun-spin',   dur: 950 },
  { name: 'fun-wiggle', dur: 800 },
  { name: 'fun-hop',    dur: 950 },
  { name: 'fun-tada',   dur: 1000 },
  { name: 'fun-flip',   dur: 1000 },
]

const rand = (a, b) => a + Math.random() * (b - a)

/**
 * A floating pixel-art sticker with random fun animations every 5–10s.
 *
 * Props:
 *  src      — image path
 *  alt      — alt text
 *  size     — px size (square), default 72
 *  rotate   — CSS rotate string e.g. "-9deg", default "0deg"
 *  delay    — float animation delay e.g. "0.6s", default "0s"
 *  floatDur — idle float duration e.g. "6s", default "6s"
 *  style    — extra positioning styles (position, top, right, etc.)
 *  hidden   — when true, renders nothing
 */
export default function PixelSticker({ src, alt = '', size = 72, rotate = '0deg', delay = '0s', floatDur = '6s', style = {}, hidden = false }) {
  const ref = useRef(null)
  const timers = useRef([])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const idleAnim = `floaty ${floatDur} ease-in-out infinite ${delay}`

    const schedule = () => {
      const t = setTimeout(() => {
        const m = MOVES[Math.floor(Math.random() * MOVES.length)]
        el.style.animation = `${m.name} ${m.dur}ms cubic-bezier(.34,1.3,.5,1)`
        let restored = false
        const restore = () => {
          if (restored) return
          restored = true
          el.removeEventListener('animationend', restore)
          el.style.animation = idleAnim
          schedule()
        }
        el.addEventListener('animationend', restore)
        const safety = setTimeout(restore, m.dur + 700)
        timers.current.push(safety)
      }, rand(5000, 10000))
      timers.current.push(t)
    }

    schedule()
    return () => timers.current.forEach(clearTimeout)
  }, [floatDur, delay])

  if (hidden) return null

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      className="pix"
      style={{
        width: size,
        height: size,
        position: 'absolute',
        '--r': rotate,
        transform: `rotate(${rotate})`,
        animation: `floaty ${floatDur} ease-in-out infinite ${delay}`,
        zIndex: 1,
        ...style,
      }}
    />
  )
}
