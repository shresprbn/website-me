import { useEffect, useMemo, useRef, useState } from 'react'
import Nav from '../components/Nav'
import SaveToGallery from '../components/SaveToGallery'
import { useModal } from '../components/ModalProvider'
import { outlineBtn, presetBtn, makeActivePreset } from '../lib/controlStyles'
import {
  VIEW_W,
  VIEW_H,
  NECK,
  HEAD,
  MOUTH,
  FEATURES,
  COLOR_KEYS,
  DEFAULT_CHARACTER,
  DEFAULT_COLORS,
  drawOrder,
  optionFor,
  randomCharacter,
  rerollFeature,
  rerollColor,
  shadeColor,
  exportCharacterPng,
  characterToBlob,
  encodeCharacter,
  decodeCharacter,
} from '../lib/characterUtils'

const ACCENT = '#57b894'

const activePresetBtn = makeActivePreset(ACCENT)

// A shared link puts the whole build in ?c=… — decode it on first load.
function initialFromUrl() {
  if (typeof window === 'undefined') return null
  const token = new URLSearchParams(window.location.search).get('c')
  return token ? decodeCharacter(token) : null
}

export default function CharacterMaker() {
  const { copyLink: copyLinkModal } = useModal()
  const fromUrl = useMemo(initialFromUrl, [])

  const [character, setCharacter] = useState(fromUrl?.character ?? DEFAULT_CHARACTER)
  const [colors, setColors] = useState(fromUrl?.colors ?? DEFAULT_COLORS)
  const [featuresOpen, setFeaturesOpen] = useState(true)
  const [colorsOpen, setColorsOpen] = useState(false)
  const [openParts, setOpenParts] = useState(() =>
    Object.fromEntries(FEATURES.map((f) => [f.id, true]))
  )
  const [copied, setCopied] = useState(false)
  const svgRef = useRef(null)

  const ordered = useMemo(() => drawOrder(), [])

  // Keep the address bar in sync with the current build so a plain copy of the
  // URL is always shareable, without stacking history entries.
  useEffect(() => {
    const url = `${window.location.pathname}?c=${encodeCharacter({ character, colors })}`
    window.history.replaceState(null, '', url)
  }, [character, colors])

  // '@' -> the feature's own colorKey, '@skin' -> that named key, else literal
  const resolveFill = (fill, feature) => {
    if (typeof fill !== 'string' || !fill.startsWith('@')) return fill
    const key = fill.length > 1 ? fill.slice(1) : feature.colorKey
    const base = colors[key]
    return feature.shade && key === feature.colorKey ? shadeColor(base, feature.shade) : base
  }

  const pick = (featureId, optionId) =>
    setCharacter((c) => ({ ...c, [featureId]: optionId }))

  const rerollPart = (featureId) =>
    setCharacter((c) => ({ ...c, [featureId]: rerollFeature(featureId, c[featureId]) }))

  const rerollColorKey = (key) =>
    setColors((c) => ({ ...c, [key]: rerollColor(key, c[key]) }))

  const togglePart = (featureId) =>
    setOpenParts((o) => ({ ...o, [featureId]: !o[featureId] }))

  const setAllParts = (open) =>
    setOpenParts(Object.fromEntries(FEATURES.map((f) => [f.id, open])))

  // keyed off "any open" so collapsing one panel doesn't flip this to "expand all"
  const anyPartOpen = FEATURES.some((f) => openParts[f.id])

  const setColor = (key, value) => setColors((c) => ({ ...c, [key]: value }))

  const reset = () => {
    setCharacter(DEFAULT_CHARACTER)
    setColors(DEFAULT_COLORS)
  }

  const copyShareLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?c=${encodeCharacter({ character, colors })}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      await copyLinkModal(url)
    }
  }

  return (
    <div style={{ color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />

      <div className="container character-maker-page">
        <div className="playground-header">
          <div className="playground-eyebrow">// CHARACTER MAKER</div>
          <h1 className="playground-title">Build a little guy.</h1>
          <p className="playground-lede">
            Mix and match the parts, pick some colors, take them home as a PNG.
          </p>
        </div>

        <div className="character-maker-toolbar">
          <button
            type="button"
            style={outlineBtn}
            onClick={() => setCharacter((c) => randomCharacter(c))}
          >
            randomize ⚄
          </button>
          <button type="button" style={outlineBtn} onClick={reset}>
            reset ↻
          </button>
          <button type="button" style={outlineBtn} onClick={copyShareLink}>
            {copied ? 'link copied ✓' : 'copy link 🔗'}
          </button>
          <button
            type="button"
            className="btn-pill dark"
            style={{ padding: '11px 22px', fontSize: 13, border: 'none' }}
            onClick={() => exportCharacterPng(svgRef.current)}
          >
            download PNG ↓
          </button>
          <SaveToGallery
            kind="character"
            hasContent={() => true}
            getData={() => ({ character, colors })}
            getThumbnailBlob={() => characterToBlob(svgRef.current)}
          />
        </div>

        <div className="character-maker-stage-row">
          <aside className={`character-maker-sidebar${featuresOpen ? ' open' : ''}`}>
            <button
              type="button"
              className="playground-panel-toggle"
              aria-expanded={featuresOpen}
              onClick={() => setFeaturesOpen((o) => !o)}
            >
              <span>// PARTS</span>
              <span className="playground-panel-chevron">▾</span>
            </button>

            <div className="character-maker-sidebar-body">
              <button
                type="button"
                className="character-maker-collapse-all"
                onClick={() => setAllParts(!anyPartOpen)}
              >
                {anyPartOpen ? 'collapse all' : 'expand all'}
              </button>

              {FEATURES.map((feature) => (
                <div
                  className={`character-maker-panel${openParts[feature.id] ? ' open' : ''}`}
                  key={feature.id}
                >
                  <div className="character-maker-panel-head">
                    <button
                      type="button"
                      className="character-maker-panel-toggle"
                      aria-expanded={openParts[feature.id]}
                      onClick={() => togglePart(feature.id)}
                    >
                      <span className="character-maker-panel-label">
                        // {feature.label.toUpperCase()}
                      </span>
                      <span className="character-maker-panel-current">{character[feature.id]}</span>
                      <span className="playground-panel-chevron">▾</span>
                    </button>
                    <button
                      type="button"
                      className="character-maker-dice"
                      title={`Reroll ${feature.label}`}
                      aria-label={`Reroll ${feature.label}`}
                      onClick={() => rerollPart(feature.id)}
                    >
                      ⚄
                    </button>
                  </div>

                  {openParts[feature.id] && (
                    <div className="character-maker-options">
                      {feature.options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          style={character[feature.id] === option.id ? activePresetBtn : presetBtn}
                          onClick={() => pick(feature.id, option.id)}
                        >
                          {option.id}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>

          <div className="character-maker-stage">
            <svg
              ref={svgRef}
              className="character-maker-svg"
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d={NECK.d} fill={colors[NECK.colorKey]} />

              {/* selectable + fixed parts, back to front */}
              {[
                ...ordered.map((feature) => ({
                  z: feature.z,
                  key: feature.id,
                  render: () =>
                    (optionFor(feature.id, character[feature.id])?.paths || []).map((p, i) => (
                      <path
                        key={`${feature.id}-${i}`}
                        d={p.d}
                        fill={resolveFill(p.fill, feature)}
                        opacity={p.opacity}
                        transform={p.transform}
                        fillRule="evenodd"
                      />
                    )),
                })),
                {
                  z: HEAD.z,
                  key: 'head',
                  render: () => <path d={HEAD.d} fill={colors[HEAD.colorKey]} />,
                },
                {
                  z: MOUTH.z,
                  key: 'mouth',
                  render: () => <path d={MOUTH.d} fill="#141414" />,
                },
              ]
                .sort((a, b) => a.z - b.z)
                .map((layer) => <g key={layer.key}>{layer.render()}</g>)}
            </svg>
            <div className="playground-stage-caption">
              {FEATURES.map((f) => character[f.id]).join(' · ')}
            </div>
          </div>

          <aside className={`character-maker-sidebar character-maker-sidebar--right${colorsOpen ? ' open' : ''}`}>
            <button
              type="button"
              className="playground-panel-toggle"
              aria-expanded={colorsOpen}
              onClick={() => setColorsOpen((o) => !o)}
            >
              <span>// COLORS</span>
              <span className="playground-panel-chevron">▾</span>
            </button>

            <div className="character-maker-sidebar-body">
              {COLOR_KEYS.map(({ key, label, swatches }) => (
                <div className="character-maker-panel" key={key}>
                  <div className="character-maker-panel-head">
                    <div className="character-maker-panel-label">// {label.toUpperCase()}</div>
                    <button
                      type="button"
                      className="character-maker-dice"
                      title={`Reroll ${label} color`}
                      aria-label={`Reroll ${label} color`}
                      onClick={() => rerollColorKey(key)}
                    >
                      ⚄
                    </button>
                  </div>
                  <div className="character-maker-swatches">
                    {swatches.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`character-maker-swatch${colors[key] === color ? ' selected' : ''}`}
                        style={{ background: color }}
                        title={color}
                        onClick={() => setColor(key, color)}
                      />
                    ))}
                    <input
                      type="color"
                      className="character-maker-color-input"
                      value={colors[key]}
                      title="custom"
                      onChange={(e) => setColor(key, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
