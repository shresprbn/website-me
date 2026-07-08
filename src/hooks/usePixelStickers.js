import { useEffect, useRef } from 'react'

const MOVES = [
  { name: 'fun-spin',   dur: 950  },
  { name: 'fun-wiggle', dur: 800  },
  { name: 'fun-hop',    dur: 950  },
  { name: 'fun-tada',   dur: 1000 },
  { name: 'fun-flip',   dur: 1000 },
]

const rand = (a, b) => a + Math.random() * (b - a)

/**
 * Attach random fun animations to all .pix elements.
 * Call once at the top of your page component.
 */
export function usePixelStickers() {
  const timers = useRef([])

  useEffect(() => {
    const stickers = Array.from(document.querySelectorAll('.pix'))

    stickers.forEach((el) => {
      const idle = el.style.animation

      const schedule = () => {
        const t = setTimeout(() => {
          const m = MOVES[Math.floor(Math.random() * MOVES.length)]
          el.style.animation = `${m.name} ${m.dur}ms cubic-bezier(.34,1.3,.5,1)`

          let restored = false
          const restore = () => {
            if (restored) return
            restored = true
            el.removeEventListener('animationend', restore)
            el.style.animation = idle
            schedule()
          }

          el.addEventListener('animationend', restore)
          // safety net
          const safety = setTimeout(restore, m.dur + 700)
          timers.current.push(safety)
        }, rand(5000, 10000))

        timers.current.push(t)
      }

      schedule()
    })

    return () => timers.current.forEach(clearTimeout)
  }, [])
}
