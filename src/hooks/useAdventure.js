import { useEffect, useRef, useState, useCallback } from 'react'

const CHARS_PER_TICK = 1
const TICK_MS = 32

/**
 * Drives a branching-story node graph (see src/lib/adventureStory.js).
 * Beats reveal one at a time with a typewriter effect and stay stacked on
 * screen — advance() either finishes the current beat's typing, reveals the
 * next beat, or (once all beats are shown) chains into `next`. Once every
 * beat is shown and there's no `next`, the caller shows `choices`.
 */
export function useAdventure(story, startId) {
  const [nodeId, setNodeId] = useState(startId)
  const [revealed, setRevealed] = useState(0)
  const [typedLength, setTypedLength] = useState(0)
  const timerRef = useRef(null)

  const node = story[nodeId]
  const beats = node.beats || []
  const currentBeatText = revealed > 0 ? beats[revealed - 1] : null
  const isTyping = currentBeatText != null && typedLength < currentBeatText.length
  const allBeatsShown = revealed >= beats.length

  const goTo = useCallback((id) => {
    setNodeId(id)
    setRevealed(0)
    setTypedLength(0)
  }, [])

  // Reveal the first beat (or, for a zero-beat pass-through node, chain
  // straight into `next` with no click required).
  useEffect(() => {
    clearTimeout(timerRef.current)
    if (beats.length > 0) {
      setRevealed(1)
      setTypedLength(0)
    } else if (node.next) {
      goTo(node.next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId])

  // Type out the currently-revealed beat.
  useEffect(() => {
    clearTimeout(timerRef.current)
    if (!currentBeatText || typedLength >= currentBeatText.length) return
    timerRef.current = setTimeout(() => {
      setTypedLength((l) => Math.min(currentBeatText.length, l + CHARS_PER_TICK))
    }, TICK_MS)
    return () => clearTimeout(timerRef.current)
  }, [currentBeatText, typedLength])

  const skip = useCallback(() => {
    if (currentBeatText) setTypedLength(currentBeatText.length)
  }, [currentBeatText])

  const advance = useCallback(() => {
    if (isTyping) {
      skip()
      return
    }
    if (revealed < beats.length) {
      setRevealed((r) => r + 1)
      setTypedLength(0)
      return
    }
    if (node.next) goTo(node.next)
  }, [isTyping, skip, revealed, beats.length, node, goTo])

  const restart = useCallback(() => goTo(startId), [goTo, startId])

  const shownBeats = beats.slice(0, Math.max(0, revealed - 1))
  if (currentBeatText != null) shownBeats.push(currentBeatText.slice(0, typedLength))

  return {
    nodeId,
    title: node.title,
    shownBeats,
    isTyping,
    showingChoices: allBeatsShown && !node.next,
    choices: node.choices,
    advance,
    choose: goTo,
    restart,
  }
}
