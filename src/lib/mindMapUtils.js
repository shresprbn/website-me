// Mind map data model + file export/import. Maps live in memory and move in and
// out of the page as a plain .json file — nothing touches a database.

export const FILE_KIND = 'prabin-mindmap'
export const FILE_VERSION = 1

export const MAX_NODES = 500
export const MAX_TEXT = 120
export const MAX_TITLE = 60
const MAX_FILE_BYTES = 1024 * 1024
const MAX_COORD = 100000

export const PALETTE = [
  { id: 'ink', color: '#141414' },
  { id: 'pink', color: '#ff6b9d' },
  { id: 'teal', color: '#4ecdc4' },
  { id: 'amber', color: '#ffb800' },
  { id: 'blue', color: '#5b8def' },
  { id: 'purple', color: '#7c6cf0' },
  { id: 'green', color: '#57b894' },
]
export const DEFAULT_COLOR = PALETTE[0].color

export const CHILD_DX = 240
export const ROW_GAP = 64

const HEX_RE = /^#[0-9a-f]{6}$/i

export function newId() {
  return `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export function createNode({ id = newId(), text = '', x = 0, y = 0, color = DEFAULT_COLOR, parent = null } = {}) {
  return { id, text, x, y, color, parent }
}

export function starterMap() {
  return [createNode({ text: 'Central idea' })]
}

export function childrenOf(nodes, id) {
  return nodes.filter((n) => n.parent === id)
}

// All descendants of `id` (not including it).
export function descendantsOf(nodes, id) {
  const byParent = new Map()
  for (const n of nodes) {
    if (!byParent.has(n.parent)) byParent.set(n.parent, [])
    byParent.get(n.parent).push(n)
  }
  const out = []
  const stack = [...(byParent.get(id) || [])]
  while (stack.length) {
    const n = stack.pop()
    out.push(n)
    stack.push(...(byParent.get(n.id) || []))
  }
  return out
}

// Left-to-right tree layout. Each root's subtree is stacked top to bottom, with
// every parent centred on its children. The first root keeps its position so
// the map doesn't jump away from where the user is looking.
export function tidyLayout(nodes) {
  if (!nodes.length) return nodes
  const byParent = new Map()
  for (const n of nodes) {
    if (!byParent.has(n.parent)) byParent.set(n.parent, [])
    byParent.get(n.parent).push(n)
  }
  const roots = byParent.get(null) || []
  const pos = new Map()
  let nextRow = 0

  const place = (node, depth) => {
    const kids = byParent.get(node.id) || []
    let row
    if (!kids.length) {
      row = nextRow++
    } else {
      const rows = kids.map((k) => place(k, depth + 1))
      row = (rows[0] + rows[rows.length - 1]) / 2
    }
    pos.set(node.id, { x: depth * CHILD_DX, y: row * ROW_GAP })
    return row
  }
  roots.forEach((r) => {
    place(r, 0)
    nextRow += 0.5 // breathing room between separate trees
  })

  const anchor = roots[0]
  const a = anchor ? pos.get(anchor.id) : { x: 0, y: 0 }
  const dx = (anchor ? anchor.x : 0) - a.x
  const dy = (anchor ? anchor.y : 0) - a.y
  return nodes.map((n) => {
    const p = pos.get(n.id)
    return p ? { ...n, x: p.x + dx, y: p.y + dy } : n
  })
}

// ── Export ──────────────────────────────────────────────────────────
export function serializeMap(title, nodes) {
  return JSON.stringify(
    {
      kind: FILE_KIND,
      version: FILE_VERSION,
      title,
      nodes: nodes.map(({ id, text, x, y, color, parent }) => ({
        id,
        text,
        x: Math.round(x),
        y: Math.round(y),
        color,
        parent,
      })),
    },
    null,
    2,
  )
}

export function safeFileName(name) {
  return (name || 'mind-map').trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'mind-map'
}

export function downloadMap(title, nodes) {
  const blob = new Blob([serializeMap(title, nodes)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeFileName(title)}.mindmap.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Import ──────────────────────────────────────────────────────────
// Files are untrusted input: every field is re-validated, clamped and
// rebuilt rather than passed through, so a hand-edited or foreign file can't
// smuggle in odd types, a huge graph, or a parent cycle.
export function parseMap(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("That file isn't valid JSON.")
  }
  if (!data || data.kind !== FILE_KIND || !Array.isArray(data.nodes)) {
    throw new Error("That doesn't look like a mind map file.")
  }
  if (data.version > FILE_VERSION) {
    throw new Error('That map was saved by a newer version of this page.')
  }
  if (!data.nodes.length) throw new Error('That map has no nodes in it.')
  if (data.nodes.length > MAX_NODES) throw new Error(`Too many nodes (max ${MAX_NODES}).`)

  const num = (v) => (Number.isFinite(v) ? Math.max(-MAX_COORD, Math.min(MAX_COORD, v)) : 0)
  const seen = new Set()
  const nodes = []
  for (const raw of data.nodes) {
    if (!raw || typeof raw !== 'object') continue
    const id = typeof raw.id === 'string' && raw.id && raw.id.length <= 64 ? raw.id : null
    if (!id || seen.has(id)) continue
    seen.add(id)
    nodes.push({
      id,
      text: typeof raw.text === 'string' ? raw.text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT) : '',
      x: num(raw.x),
      y: num(raw.y),
      color: typeof raw.color === 'string' && HEX_RE.test(raw.color) ? raw.color : DEFAULT_COLOR,
      parent: typeof raw.parent === 'string' ? raw.parent : null,
    })
  }
  if (!nodes.length) throw new Error('That map has no usable nodes in it.')

  // Orphans (parent missing) become roots; anything on a cycle is cut loose.
  const byId = new Map(nodes.map((n) => [n.id, n]))
  for (const n of nodes) {
    if (n.parent !== null && !byId.has(n.parent)) n.parent = null
  }
  for (const n of nodes) {
    const trail = new Set([n.id])
    let cur = n
    while (cur.parent !== null) {
      if (trail.has(cur.parent)) {
        cur.parent = null
        break
      }
      trail.add(cur.parent)
      cur = byId.get(cur.parent)
    }
  }

  const title = typeof data.title === 'string' ? data.title.trim().slice(0, MAX_TITLE) : ''
  return { title, nodes }
}

export function readMapFile(file) {
  if (file.size > MAX_FILE_BYTES) return Promise.reject(new Error('That file is too big to be a mind map.'))
  return file.text().then(parseMap)
}
