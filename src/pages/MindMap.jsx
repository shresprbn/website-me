import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav'
import { useModal } from '../components/ModalProvider'
import { outlineBtn, presetBtn, makeActivePreset } from '../lib/controlStyles'
import {
  CHILD_DX,
  DEFAULT_COLOR,
  MAX_NODES,
  MAX_TEXT,
  MAX_TITLE,
  PALETTE,
  ROW_GAP,
  createNode,
  descendantsOf,
  downloadMap,
  readMapFile,
  starterMap,
  tidyLayout,
} from '../lib/mindMapUtils'

const ACCENT = '#7c6cf0'
const activeBtn = makeActivePreset(ACCENT)

const MIN_ZOOM = 0.25
const MAX_ZOOM = 2.5
const DRAG_SLOP = 4

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export default function MindMap() {
  const { confirmAction, alertUser } = useModal()

  const [title, setTitle] = useState('My mind map')
  const [nodes, setNodes] = useState(starterMap)
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const [selectedId, setSelectedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [dropping, setDropping] = useState(false)

  const stageRef = useRef(null)
  const fileRef = useRef(null)
  const viewRef = useRef(view)
  const nodesRef = useRef(nodes)
  const dragRef = useRef(null)
  const editStartRef = useRef('')
  viewRef.current = view
  nodesRef.current = nodes

  const selected = nodes.find((n) => n.id === selectedId) || null

  // Centre the origin in the stage on first paint.
  useEffect(() => {
    const r = stageRef.current.getBoundingClientRect()
    setView({ x: r.width / 2, y: r.height / 2, k: 1 })
  }, [])

  // Warn before a refresh/close throws away unsaved work.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const edit = (changes) => {
    setNodes(changes)
    setDirty(true)
  }

  // ── View ──────────────────────────────────────────────────────────
  const toWorld = (clientX, clientY) => {
    const r = stageRef.current.getBoundingClientRect()
    const v = viewRef.current
    return { x: (clientX - r.left - v.x) / v.k, y: (clientY - r.top - v.y) / v.k }
  }

  const zoomAt = (factor, sx, sy) => {
    setView((v) => {
      const k = clamp(v.k * factor, MIN_ZOOM, MAX_ZOOM)
      const f = k / v.k
      return { k, x: sx - (sx - v.x) * f, y: sy - (sy - v.y) * f }
    })
  }

  const zoomCentre = (factor) => {
    const r = stageRef.current.getBoundingClientRect()
    zoomAt(factor, r.width / 2, r.height / 2)
  }

  const fitView = (list = nodesRef.current) => {
    const r = stageRef.current.getBoundingClientRect()
    if (!list.length) return setView({ x: r.width / 2, y: r.height / 2, k: 1 })
    // Nodes are drawn centred on x/y; pad for their rough half-size.
    const minX = Math.min(...list.map((n) => n.x)) - 110
    const maxX = Math.max(...list.map((n) => n.x)) + 110
    const minY = Math.min(...list.map((n) => n.y)) - 40
    const maxY = Math.max(...list.map((n) => n.y)) + 40
    const k = clamp(Math.min((r.width - 60) / (maxX - minX), (r.height - 60) / (maxY - minY)), MIN_ZOOM, 1.4)
    setView({
      k,
      x: r.width / 2 - ((minX + maxX) / 2) * k,
      y: r.height / 2 - ((minY + maxY) / 2) * k,
    })
  }

  // Wheel zoom needs a non-passive listener so the page doesn't scroll too.
  useEffect(() => {
    const el = stageRef.current
    const onWheel = (e) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── Node ops ──────────────────────────────────────────────────────
  const startEditing = (id) => {
    const n = nodesRef.current.find((x) => x.id === id)
    if (!n) return
    editStartRef.current = n.text
    setSelectedId(id)
    setEditingId(id)
  }

  const capReached = async () => {
    if (nodesRef.current.length < MAX_NODES) return false
    await alertUser(`That's the limit — ${MAX_NODES} nodes per map.`)
    return true
  }

  const addChild = async (parentId = selectedId) => {
    const parent = nodesRef.current.find((n) => n.id === parentId)
    if (!parent || (await capReached())) return
    const kids = nodesRef.current.filter((n) => n.parent === parent.id)
    const last = kids.reduce((a, b) => (b.y > a.y ? b : a), kids[0])
    const node = createNode({
      x: parent.x + CHILD_DX,
      y: last ? last.y + ROW_GAP : parent.y,
      color: parent.color,
      parent: parent.id,
    })
    edit([...nodesRef.current, node])
    editStartRef.current = ''
    setSelectedId(node.id)
    setEditingId(node.id)
  }

  const addSibling = async (id = selectedId) => {
    const sib = nodesRef.current.find((n) => n.id === id)
    if (!sib) return
    if (sib.parent === null) return addFree(sib.x, sib.y + ROW_GAP)
    if (await capReached()) return
    const node = createNode({ x: sib.x, y: sib.y + ROW_GAP, color: sib.color, parent: sib.parent })
    edit([...nodesRef.current, node])
    editStartRef.current = ''
    setSelectedId(node.id)
    setEditingId(node.id)
  }

  // A new top-level idea, not attached to anything.
  const addFree = async (x, y) => {
    if (await capReached()) return
    const node = createNode({ x, y })
    edit([...nodesRef.current, node])
    editStartRef.current = ''
    setSelectedId(node.id)
    setEditingId(node.id)
  }

  const deleteSelected = async () => {
    if (!selected) return
    const gone = [selected, ...descendantsOf(nodesRef.current, selected.id)]
    if (gone.length > 1) {
      const ok = await confirmAction(`Delete "${selected.text || 'this node'}" and the ${gone.length - 1} node${gone.length === 2 ? '' : 's'} under it?`, {
        title: 'delete branch',
        confirmLabel: 'delete',
        danger: true,
      })
      if (!ok) return
    }
    const ids = new Set(gone.map((n) => n.id))
    edit(nodesRef.current.filter((n) => !ids.has(n.id)))
    setSelectedId(selected.parent)
    setEditingId(null)
  }

  const commitEdit = () => {
    if (!editingId) return
    const id = editingId
    setEditingId(null)
    // Never leave a node blank: fall back to what it said before, or a stub.
    setNodes((prev) =>
      prev.map((n) => (n.id === id && !n.text.trim() ? { ...n, text: editStartRef.current || 'idea' } : n)),
    )
  }

  const cancelEdit = () => {
    if (!editingId) return
    const id = editingId
    setEditingId(null)
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, text: editStartRef.current || 'idea' } : n)))
  }

  const setText = (id, text) => {
    edit(nodesRef.current.map((n) => (n.id === id ? { ...n, text: text.replace(/\s+/g, ' ').slice(0, MAX_TEXT) } : n)))
  }

  const setColor = (color) => {
    if (!selected) return
    edit(nodesRef.current.map((n) => (n.id === selected.id ? { ...n, color } : n)))
  }

  const tidy = () => {
    const next = tidyLayout(nodesRef.current)
    edit(next)
    fitView(next)
  }

  // ── Pointer: drag nodes (with their branch), pan the background ───
  const onNodePointerDown = (e, node) => {
    if (e.button !== 0) return
    e.stopPropagation()
    if (editingId === node.id) return
    if (editingId) commitEdit()
    setSelectedId(node.id)
    const moving = [node, ...descendantsOf(nodesRef.current, node.id)]
    dragRef.current = {
      type: 'node',
      sx: e.clientX,
      sy: e.clientY,
      moved: false,
      origin: new Map(moving.map((n) => [n.id, { x: n.x, y: n.y }])),
    }
  }

  const onStagePointerDown = (e) => {
    if (e.button !== 0) return
    if (editingId) commitEdit()
    setSelectedId(null)
    dragRef.current = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false }
  }

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current
      if (!d) return
      const dx = e.clientX - d.sx
      const dy = e.clientY - d.sy
      if (!d.moved && Math.hypot(dx, dy) < DRAG_SLOP) return
      d.moved = true
      if (d.type === 'pan') {
        setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }))
      } else {
        const k = viewRef.current.k
        setNodes((prev) =>
          prev.map((n) => {
            const o = d.origin.get(n.id)
            return o ? { ...n, x: o.x + dx / k, y: o.y + dy / k } : n
          }),
        )
        setDirty(true)
      }
    }
    const onUp = () => {
      dragRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  // ── Keyboard ──────────────────────────────────────────────────────
  const keyHandlerRef = useRef()
  keyHandlerRef.current = (e) => {
    const tag = document.activeElement?.tagName
    if (editingId || tag === 'INPUT' || tag === 'TEXTAREA') return
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key === 'Tab' && selected) {
      e.preventDefault()
      addChild()
    } else if (e.key === 'Enter' && selected) {
      e.preventDefault()
      addSibling()
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
      e.preventDefault()
      deleteSelected()
    } else if (e.key === 'F2' && selected) {
      e.preventDefault()
      startEditing(selected.id)
    } else if (e.key === 'Escape') {
      setSelectedId(null)
    }
  }
  useEffect(() => {
    const onKey = (e) => keyHandlerRef.current(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── File export / import ──────────────────────────────────────────
  const exportMap = () => {
    downloadMap(title, nodes)
    setDirty(false)
  }

  const importFile = async (file) => {
    if (!file) return
    if (dirty) {
      const ok = await confirmAction('Importing replaces the map you have open, and it has changes you haven\'t exported.', {
        title: 'replace map',
        confirmLabel: 'import anyway',
        danger: true,
      })
      if (!ok) return
    }
    try {
      const map = await readMapFile(file)
      setTitle(map.title || file.name.replace(/\.mindmap\.json$|\.json$/i, '') || 'My mind map')
      setNodes(map.nodes)
      setSelectedId(null)
      setEditingId(null)
      setDirty(false)
      fitView(map.nodes)
    } catch (err) {
      await alertUser(err.message || 'Could not read that file.', { title: "couldn't import" })
    }
  }

  const onFilePicked = (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // so picking the same file twice still fires
    importFile(file)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDropping(false)
    importFile(e.dataTransfer.files?.[0])
  }

  const newMap = async () => {
    if (dirty) {
      const ok = await confirmAction("The map you have open has changes you haven't exported.", {
        title: 'start over',
        confirmLabel: 'start over',
        danger: true,
      })
      if (!ok) return
    }
    setTitle('My mind map')
    setNodes(starterMap())
    setSelectedId(null)
    setEditingId(null)
    setDirty(false)
    const r = stageRef.current.getBoundingClientRect()
    setView({ x: r.width / 2, y: r.height / 2, k: 1 })
  }

  // ── Render ────────────────────────────────────────────────────────
  const byId = new Map(nodes.map((n) => [n.id, n]))

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />

      <div className="container playground-page">
        <Link to="/playground" className="gallery-back-link">
          ← back to playground
        </Link>
        <div className="playground-header">
          <div className="playground-eyebrow">// MIND MAP</div>
          <h1 className="playground-title">Get the tangle out of your head.</h1>
          <p className="playground-lede">
            Branch ideas off each other, drag them around, then export the map as a file. Import it
            later to pick up where you left off — it never leaves your computer.
          </p>
        </div>

        <div className="mm-bar">
          <input
            type="text"
            className="mm-title"
            value={title}
            maxLength={MAX_TITLE}
            aria-label="Map title"
            onChange={(e) => {
              setTitle(e.target.value)
              setDirty(true)
            }}
          />
          <span className="life-stat">
            <strong>{nodes.length}</strong> node{nodes.length === 1 ? '' : 's'}
            {dirty ? ' · unsaved' : ''}
          </span>
        </div>

        <div className="mm-controls">
          <button type="button" style={outlineBtn} onClick={() => addChild()} disabled={!selected}>
            + child
          </button>
          <button type="button" style={outlineBtn} onClick={() => addSibling()} disabled={!selected}>
            + sibling
          </button>
          <button type="button" style={outlineBtn} onClick={() => selected && startEditing(selected.id)} disabled={!selected}>
            rename ✎
          </button>
          <button type="button" style={outlineBtn} onClick={deleteSelected} disabled={!selected}>
            delete ⌫
          </button>

          <div className="mm-swatches" role="group" aria-label="Node colour">
            {PALETTE.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`mm-swatch${selected?.color === p.color ? ' mm-swatch--on' : ''}`}
                style={{ background: p.color }}
                onClick={() => setColor(p.color)}
                disabled={!selected}
                aria-label={p.id}
                title={p.id}
              />
            ))}
          </div>

          <button type="button" style={presetBtn} onClick={tidy}>
            tidy ⊹
          </button>
          <button type="button" style={presetBtn} onClick={() => zoomCentre(1 / 1.25)} aria-label="Zoom out">
            −
          </button>
          <button type="button" style={presetBtn} onClick={() => zoomCentre(1.25)} aria-label="Zoom in">
            +
          </button>
          <button type="button" style={presetBtn} onClick={() => fitView()}>
            fit
          </button>
        </div>

        <div className="mm-controls">
          <button
            type="button"
            className="btn-pill dark"
            style={{ padding: '12px 24px', fontSize: 14, border: 'none' }}
            onClick={exportMap}
          >
            export ↓
          </button>
          <button type="button" style={activeBtn} onClick={() => fileRef.current?.click()}>
            import ↑
          </button>
          <button type="button" style={outlineBtn} onClick={newMap}>
            new
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={onFilePicked}
          />
        </div>

        <div
          ref={stageRef}
          className={`mm-stage${dropping ? ' mm-stage--drop' : ''}`}
          onPointerDown={onStagePointerDown}
          onDoubleClick={(e) => {
            const p = toWorld(e.clientX, e.clientY)
            addFree(p.x, p.y)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDropping(true)
          }}
          onDragLeave={() => setDropping(false)}
          onDrop={onDrop}
          style={{
            backgroundSize: `${28 * view.k}px ${28 * view.k}px`,
            backgroundPosition: `${view.x}px ${view.y}px`,
          }}
        >
          <div className="mm-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
            <svg className="mm-edges" width="1" height="1" aria-hidden="true">
              {nodes.map((n) => {
                const p = n.parent && byId.get(n.parent)
                if (!p) return null
                const mx = (p.x + n.x) / 2
                return (
                  <path
                    key={n.id}
                    d={`M ${p.x} ${p.y} C ${mx} ${p.y}, ${mx} ${n.y}, ${n.x} ${n.y}`}
                    stroke={n.color}
                    strokeOpacity=".55"
                    strokeWidth="2.5"
                    fill="none"
                  />
                )
              })}
            </svg>

            {nodes.map((n) => (
              <div
                key={n.id}
                className={`mm-node${n.id === selectedId ? ' mm-node--sel' : ''}${n.parent === null ? ' mm-node--root' : ''}`}
                style={{ left: n.x, top: n.y, '--node-color': n.color || DEFAULT_COLOR }}
                onPointerDown={(e) => onNodePointerDown(e, n)}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  startEditing(n.id)
                }}
              >
                {n.id === editingId ? (
                  <textarea
                    className="mm-node-input"
                    autoFocus
                    rows={1}
                    maxLength={MAX_TEXT}
                    value={n.text}
                    ref={(el) => {
                      if (!el) return
                      el.style.height = 'auto'
                      el.style.height = `${el.scrollHeight}px`
                    }}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setText(n.id, e.target.value)}
                    onBlur={commitEdit}
                    onPointerDown={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        commitEdit()
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        cancelEdit()
                      } else if (e.key === 'Tab') {
                        e.preventDefault()
                        commitEdit()
                        addChild(n.id)
                      }
                    }}
                  />
                ) : (
                  <span className="mm-node-text">{n.text || ' '}</span>
                )}
              </div>
            ))}
          </div>

          {dropping && <div className="mm-drop-hint">drop a .json mind map to open it</div>}
        </div>

        <div className="mm-caption">
          double-click empty space: new idea · Tab child · Enter sibling · F2 rename · Del delete · drag a node to move its branch · scroll to zoom
        </div>
      </div>
    </div>
  )
}
