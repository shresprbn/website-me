import { useEffect, useState } from 'react'

export const DEBUG_PASSPHRASE = 'axnusic'

/**
 * Type "axnusic" anywhere on the page (not while focused in a text field)
 * to toggle a little debug mode on/off. Returns a flash flag you can use
 * to trigger a one-off transition, plus the persistent debugMode boolean.
 */
export function useDebugMode() {
  const [debugMode, setDebugMode] = useState(false)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    let buffer = ''
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key.length !== 1 || !/[a-z]/i.test(e.key)) return

      buffer = (buffer + e.key.toLowerCase()).slice(-DEBUG_PASSPHRASE.length)
      if (buffer === DEBUG_PASSPHRASE) {
        buffer = ''
        setDebugMode((d) => !d)
        setFlash(true)
        setTimeout(() => setFlash(false), 650)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return { debugMode, flash }
}
