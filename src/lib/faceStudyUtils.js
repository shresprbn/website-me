import { TRAITS } from './faceStudyData'

// Pure helpers over the TRAITS table. All the editable data lives in
// faceStudyData.js — this file never needs touching to add options.

export const CONTEXT_TRAITS = TRAITS.filter((t) => t.phase === 'context')
export const FEATURE_TRAITS = TRAITS.filter((t) => t.phase === 'feature')

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

// Random pick for every trait -> { [trait.id]: descriptor }
export function randomFace() {
  return Object.fromEntries(TRAITS.map((t) => [t.id, pick(t.options)]))
}
