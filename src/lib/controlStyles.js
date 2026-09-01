// Shared pill-button styles for the playground tool panels. These objects were
// copy-pasted, byte-for-byte, across nine pages — this is the one copy now.

export const outlineBtn = {
  background: 'transparent',
  color: '#8a8a8a',
  border: '2px solid #e0dbd0',
  borderRadius: 40,
  padding: '11px 22px',
  fontFamily: "'Space Mono', monospace",
  fontSize: 13,
  cursor: 'pointer',
}

export const presetBtn = {
  background: '#faf8f3',
  color: '#141414',
  border: '1px solid #e8e3d8',
  borderRadius: 40,
  padding: '9px 18px',
  fontFamily: "'Space Mono', monospace",
  fontSize: 12,
  cursor: 'pointer',
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const n = parseInt(full, 16)
  if (Number.isNaN(n)) return hex
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

// The selected/active preset chip. Accent (and its faint fill) varies per toy —
// pink for pixels, amber for beats, teal-green for characters, etc.
export function makeActivePreset(accent = '#ff6b9d', alpha = 0.12) {
  return {
    ...presetBtn,
    border: `2px solid ${accent}`,
    background: hexToRgba(accent, alpha),
  }
}
