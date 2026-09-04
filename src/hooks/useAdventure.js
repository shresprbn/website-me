import { useEffect, useState, useCallback } from 'react'

/**
 * Drives a branching-story node graph (see src/lib/adventureStory.js).
 * A node's `beats` are shown one at a time via advance(); once exhausted,
 * a node with `next` auto-continues into that node, otherwise its
 * `choices` are shown. Shared by both the terminal and refined renderers.
 */
export function useAdventure(story, startId) {
  const [nodeId, setNodeId] = useState(startId)
  const [beatIndex, setBeatIndex] = useState(0)

  const node = story[nodeId]
  const beats = node.beats || []
  const showingChoices = beatIndex >= beats.length
  const currentBeat = showingChoices ? null : beats[beatIndex]
  const isLastBeat = beatIndex === beats.length - 1

  const goTo = useCallback((id) => {
    setNodeId(id)
    setBeatIndex(0)
  }, [])

  useEffect(() => {
    if (showingChoices && node.next) goTo(node.next)
  }, [showingChoices, node, goTo])

  const advance = useCallback(() => {
    setBeatIndex((i) => i + 1)
  }, [])

  const restart = useCallback(() => goTo(startId), [goTo, startId])

  return {
    nodeId,
    node,
    currentBeat,
    isLastBeat,
    showingChoices: showingChoices && !node.next,
    choices: node.choices,
    title: node.title,
    advance,
    choose: goTo,
    restart,
  }
}
