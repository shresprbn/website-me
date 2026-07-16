// Pulls public-domain paintings from open museum APIs.
// Two sources, both key-free and CORS-open: the Met and the Cleveland Museum of Art.
//
// The Art Institute of Chicago was evaluated and dropped: its metadata API is fine,
// but every image on www.artic.edu/iiif sits behind a Cloudflare challenge that an
// <img> tag can never solve (verified failing in a real browser).

export const MET_SEARCH = 'https://collectionapi.metmuseum.org/public/collection/v1/search'
export const MET_OBJECT = 'https://collectionapi.metmuseum.org/public/collection/v1/objects'
export const CMA_API = 'https://openaccess-api.clevelandart.org/api/artworks/'

export const ACCENT = '#7c6cf0'
export const CMA_PAGE_SIZE = 500 // the API happily serves 1000; 500 keeps the payload sane
export const CMA_TOTAL = 3953 // cc0 + has_image + type=Painting, as of build
export const GALLERY_SIZE = 24
export const HYDRATE_LIMIT = 6 // parallel requests cap — be polite to the APIs

// The Met's search returns plenty of records that turn out not to be public domain,
// and those get dropped during hydration. Over-draw so the gallery still fills.
export const OVERDRAW = 1.8

export const TIMER_PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '2m', seconds: 120 },
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
]

export const SOURCES = [
  { id: 'met', label: 'the met', credit: 'The Metropolitan Museum of Art' },
  { id: 'cma', label: 'cleveland', credit: 'The Cleveland Museum of Art' },
]

export function sourceLabel(id) {
  const found = SOURCES.find((s) => s.id === id)
  return found ? found.label : id
}

// --- helpers ---------------------------------------------------------------

export function shuffle(items) {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Draws without repeats until the pool is exhausted, then reshuffles.
export function createShuffleBag(items) {
  let queue = shuffle(items)
  let last = null
  return {
    size: () => items.length,
    draw() {
      if (!queue.length) {
        queue = shuffle(items)
        // avoid showing the same piece twice across a reshuffle
        if (queue.length > 1 && queue[0] === last) queue.push(queue.shift())
      }
      last = queue.shift()
      return last || null
    },
    drawMany(n) {
      const out = []
      for (let i = 0; i < n; i++) {
        const item = this.draw()
        if (item) out.push(item)
      }
      return out
    },
  }
}

export async function mapWithConcurrency(items, limit, fn) {
  const out = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++
      out[i] = await fn(items[i], i)
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker)
  await Promise.all(workers)
  return out
}

function stripHtml(text) {
  if (!text) return ''
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanYear(value) {
  const text = String(value || '').trim()
  return text && text !== 'n.d.' ? text : ''
}

async function getJson(url, signal) {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json()
}

// --- the Met ---------------------------------------------------------------
// Search returns ~895 object ids in one call; each artwork is then fetched on demand.

// Note: the Met's own `isPublicDomain=true` search filter is far too aggressive
// (it drops 895 paintings to 112, hiding works that are in fact public domain), so
// the broad pool is fetched instead and each record's isPublicDomain is checked on
// hydration. `isHighlight` is the museum's own curated-highlights flag.
function buildMetSearchUrl(highlightsOnly) {
  const params = new URLSearchParams({
    q: 'painting',
    hasImages: 'true',
    medium: 'Paintings',
  })
  if (highlightsOnly) params.set('isHighlight', 'true')
  return `${MET_SEARCH}?${params}`
}

function normalizeMet(raw) {
  const image = raw.primaryImageSmall || raw.primaryImage
  if (!image || !raw.isPublicDomain) return null
  return {
    key: `met-${raw.objectID}`,
    source: 'met',
    title: raw.title || 'Untitled',
    artist: raw.artistDisplayName || 'Unknown artist',
    artistBio: raw.artistDisplayBio || '',
    year: cleanYear(raw.objectDate),
    medium: raw.medium || '',
    department: raw.department || '',
    culture: raw.culture || '',
    dimensions: raw.dimensions || '',
    blurb: '',
    highlight: Boolean(raw.isHighlight),
    imageUrl: image,
    thumbUrl: image,
    pageUrl: raw.objectURL || '',
    credit: 'The Metropolitan Museum of Art',
  }
}

// --- Cleveland -------------------------------------------------------------
// One call returns a full page of hydrated records, images included.

function buildCmaUrl(skip, limit, highlightsOnly) {
  const params = new URLSearchParams({
    type: 'Painting',
    cc0: '1',
    has_image: '1',
    limit: String(limit),
    skip: String(skip),
  })
  if (highlightsOnly) params.set('highlight', '1')
  return `${CMA_API}?${params}`
}

function normalizeCma(raw) {
  const images = raw.images || {}
  const web = images.web || images.print // `full` is a .tif — unusable in a browser
  const image = web && web.url
  if (!image) return null
  const creator = (raw.creators || [])[0] || {}
  return {
    key: `cma-${raw.id}`,
    source: 'cma',
    title: raw.title || 'Untitled',
    artist: creator.description || 'Unknown artist',
    artistBio: '',
    year: cleanYear(raw.creation_date),
    medium: raw.technique || '',
    department: raw.department || '',
    culture: (raw.culture || []).join(', '),
    dimensions: '',
    blurb: stripHtml(raw.wall_description),
    highlight: false,
    imageUrl: image,
    thumbUrl: image,
    pageUrl: raw.url || '',
    credit: 'The Cleveland Museum of Art',
  }
}

// --- pool ------------------------------------------------------------------
// An entry is either already hydrated (Cleveland) or a stub to fetch (the Met).

export async function loadPool(sourceIds, options = {}, signal) {
  const { highlightsOnly = false } = options
  const wanted = sourceIds && sourceIds.length ? sourceIds : SOURCES.map((s) => s.id)
  const jobs = []

  if (wanted.includes('met')) {
    jobs.push(
      getJson(buildMetSearchUrl(highlightsOnly), signal).then((data) =>
        (data.objectIDs || []).map((id) => ({ key: `met-${id}`, source: 'met', ref: id, artwork: null }))
      )
    )
  }

  if (wanted.includes('cma')) {
    // Highlights are a short list, so start at 0; otherwise jump to a random page
    // so a reload doesn't serve the same 500 pieces every time.
    const maxSkip = Math.max(0, CMA_TOTAL - CMA_PAGE_SIZE)
    const skip = highlightsOnly ? 0 : Math.floor(Math.random() * maxSkip)
    jobs.push(
      getJson(buildCmaUrl(skip, CMA_PAGE_SIZE, highlightsOnly), signal).then((data) =>
        (data.data || [])
          .map(normalizeCma)
          .filter(Boolean)
          .map((artwork) => ({ key: artwork.key, source: 'cma', ref: artwork.key, artwork }))
      )
    )
  }

  // One dead source shouldn't take the page down.
  const settled = await Promise.allSettled(jobs)
  const entries = settled.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value)
  if (!entries.length) throw new Error('Could not reach the museum APIs.')
  return entries
}

export async function hydrateEntry(entry, signal) {
  if (!entry) return null
  if (entry.artwork) return entry.artwork
  if (entry.source === 'met') {
    const raw = await getJson(`${MET_OBJECT}/${entry.ref}`, signal)
    return normalizeMet(raw)
  }
  return null
}

// Resolves to an artwork, skipping records that turn out to be unusable.
export async function drawArtwork(bag, signal, attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    const entry = bag.draw()
    if (!entry) return null
    try {
      const artwork = await hydrateEntry(entry, signal)
      if (artwork) return artwork
    } catch (err) {
      if (err.name === 'AbortError') throw err
      // bad record — try the next one
    }
  }
  return null
}

export async function drawGallery(bag, signal, count = GALLERY_SIZE) {
  const entries = bag.drawMany(Math.ceil(count * OVERDRAW))
  const results = await mapWithConcurrency(entries, HYDRATE_LIMIT, async (entry) => {
    try {
      return await hydrateEntry(entry, signal)
    } catch (err) {
      if (err.name === 'AbortError') throw err
      return null
    }
  })
  return results.filter(Boolean).slice(0, count)
}

export function preloadImage(url) {
  if (!url) return
  const img = new Image()
  img.src = url
}

export function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.ceil(totalSeconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
