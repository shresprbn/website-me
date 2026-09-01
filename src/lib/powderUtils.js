// A tiny falling-sand cellular sandbox. Each cell holds a material id;
// stepWorld() runs one tick of very approximate physics.

export const EMPTY = 0
export const WALL = 1
export const SAND = 2
export const WATER = 3
export const PLANT = 4
export const FIRE = 5
export const SMOKE = 6
export const POWDER = 7

export const MATERIAL_LIST = [
  { id: 'wall', mat: WALL, label: 'wall', swatch: '#6b6252' },
  { id: 'sand', mat: SAND, label: 'sand', swatch: '#e0c068' },
  { id: 'water', mat: WATER, label: 'water', swatch: '#4ea3d9' },
  { id: 'plant', mat: PLANT, label: 'plant', swatch: '#4caf50' },
  { id: 'powder', mat: POWDER, label: 'gunpowder', swatch: '#33322f' },
  { id: 'fire', mat: FIRE, label: 'fire', swatch: '#ff6b35' },
  { id: 'eraser', mat: EMPTY, label: 'eraser', swatch: '#f2efe8' },
]

// [lo, hi] rgb — blended per cell by its shade byte for a bit of grain.
const COLORS = {
  [EMPTY]: [[247, 245, 240], [247, 245, 240]],
  [WALL]: [[86, 80, 68], [120, 112, 96]],
  [SAND]: [[206, 172, 92], [233, 205, 140]],
  [WATER]: [[54, 140, 200], [96, 178, 226]],
  [PLANT]: [[46, 122, 52], [104, 184, 96]],
  [FIRE]: [[255, 80, 30], [255, 200, 90]],
  [SMOKE]: [[140, 140, 142], [205, 205, 205]],
  [POWDER]: [[38, 37, 34], [70, 68, 62]],
}

const FIRE_LIFE = 55
const SMOKE_LIFE = 34
const FUSE = 3 // ticks a lit powder grain smoulders before it goes off

export function createWorld(cols, rows) {
  const n = cols * rows
  return {
    cols,
    rows,
    mat: new Uint8Array(n),
    shade: new Uint8Array(n),
    life: new Uint8Array(n),
    moved: new Uint8Array(n),
    explosions: [], // {x,y} blast centres for this frame — drained by the caller
  }
}

export function clearWorld(world) {
  world.mat.fill(EMPTY)
  world.shade.fill(0)
  world.life.fill(0)
  world.explosions.length = 0
}

// A floor + side walls to catch things.
export function frameWorld(world) {
  const { mat, shade, cols, rows } = world
  for (let x = 0; x < cols; x++) {
    const bi = (rows - 1) * cols + x
    mat[bi] = WALL
    shade[bi] = (Math.random() * 255) | 0
  }
  for (let y = 0; y < rows; y++) {
    const li = y * cols
    const ri = y * cols + cols - 1
    mat[li] = WALL
    mat[ri] = WALL
    shade[li] = (Math.random() * 255) | 0
    shade[ri] = (Math.random() * 255) | 0
  }
}

export function paint(world, cx, cy, m, radius) {
  const { mat, shade, life, cols, rows } = world
  const rr = radius * radius
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      if (x * x + y * y > rr) continue
      const nx = cx + x
      const ny = cy + y
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
      // don't scribble over the outer wall frame
      const i = ny * cols + nx
      mat[i] = m
      shade[i] = (Math.random() * 255) | 0
      life[i] = m === FIRE ? FIRE_LIFE : m === SMOKE ? SMOKE_LIFE : 0
    }
  }
}

export function stepWorld(world, frame) {
  const { cols, rows, mat, shade, life, moved, explosions } = world
  moved.fill(0)

  const swap = (i, j) => {
    const tm = mat[i]
    mat[i] = mat[j]
    mat[j] = tm
    const ts = shade[i]
    shade[i] = shade[j]
    shade[j] = ts
    const tl = life[i]
    life[i] = life[j]
    life[j] = tl
    moved[i] = 1
    moved[j] = 1
  }

  for (let y = rows - 1; y >= 0; y--) {
    const ltr = ((frame + y) & 1) === 0
    for (let k = 0; k < cols; k++) {
      const x = ltr ? k : cols - 1 - k
      const i = y * cols + x
      const m = mat[i]
      if (m === EMPTY || m === WALL || moved[i]) continue

      const down = y + 1 < rows ? i + cols : -1
      const up = y - 1 >= 0 ? i - cols : -1
      const dl = down >= 0 && x - 1 >= 0 ? down - 1 : -1
      const dr = down >= 0 && x + 1 < cols ? down + 1 : -1
      const left = x - 1 >= 0 ? i - 1 : -1
      const right = x + 1 < cols ? i + 1 : -1
      const ul = up >= 0 && x - 1 >= 0 ? up - 1 : -1
      const ur = up >= 0 && x + 1 < cols ? up + 1 : -1
      const first = (frame + x) & 1

      if (m === SAND) {
        if (down >= 0 && (mat[down] === EMPTY || mat[down] === WATER)) swap(i, down)
        else {
          const a = first ? dl : dr
          const b = first ? dr : dl
          if (a >= 0 && (mat[a] === EMPTY || mat[a] === WATER)) swap(i, a)
          else if (b >= 0 && (mat[b] === EMPTY || mat[b] === WATER)) swap(i, b)
        }
      } else if (m === POWDER) {
        if (life[i] > 0) {
          life[i]--
          shade[i] = (Math.random() * 255) | 0 // sizzling fuse
          if (life[i] === 0) {
            // detonate: this grain becomes fire, and the blast lights the
            // neighbours (powder chains, so trails "run"), plus a firework burst
            explosions.push({ x, y })
            mat[i] = FIRE
            life[i] = 7
            for (const t of [down, up, left, right, dl, dr, ul, ur]) {
              if (t < 0 || moved[t]) continue
              if (mat[t] === POWDER && life[t] === 0) {
                life[t] = 1 + ((Math.random() * FUSE) | 0)
              } else if (mat[t] === PLANT || (mat[t] === EMPTY && Math.random() < 0.55)) {
                mat[t] = FIRE
                life[t] = 6
                moved[t] = 1
              } else if (mat[t] === WATER) {
                mat[t] = SMOKE
                life[t] = SMOKE_LIFE
                moved[t] = 1
              }
            }
            continue
          }
        }
        // otherwise it just falls like sand
        if (down >= 0 && (mat[down] === EMPTY || mat[down] === WATER)) swap(i, down)
        else {
          const a = first ? dl : dr
          const b = first ? dr : dl
          if (a >= 0 && (mat[a] === EMPTY || mat[a] === WATER)) swap(i, a)
          else if (b >= 0 && (mat[b] === EMPTY || mat[b] === WATER)) swap(i, b)
        }
      } else if (m === WATER) {
        if (down >= 0 && mat[down] === EMPTY) swap(i, down)
        else {
          const a = first ? dl : dr
          const b = first ? dr : dl
          if (a >= 0 && mat[a] === EMPTY) swap(i, a)
          else if (b >= 0 && mat[b] === EMPTY) swap(i, b)
          else {
            const l = first ? left : right
            const r = first ? right : left
            if (l >= 0 && mat[l] === EMPTY && !moved[l]) swap(i, l)
            else if (r >= 0 && mat[r] === EMPTY && !moved[r]) swap(i, r)
          }
        }
      } else if (m === PLANT) {
        // grow toward empty space when there's water nearby
        const wet =
          (down >= 0 && mat[down] === WATER) ||
          (up >= 0 && mat[up] === WATER) ||
          (left >= 0 && mat[left] === WATER) ||
          (right >= 0 && mat[right] === WATER)
        if (wet && Math.random() < 0.08) {
          const targets = [up, ul, ur, left, right].filter(
            (t) => t >= 0 && mat[t] === EMPTY,
          )
          if (targets.length) {
            const t = targets[(Math.random() * targets.length) | 0]
            mat[t] = PLANT
            shade[t] = (Math.random() * 255) | 0
            moved[t] = 1
          }
        }
      } else if (m === FIRE) {
        shade[i] = (Math.random() * 255) | 0 // flicker
        if (life[i] > 0) life[i]--
        const neigh = [down, up, left, right, dl, dr, ul, ur]
        let doused = false
        let touchesFuel = false
        for (const t of neigh) {
          if (t < 0) continue
          if (mat[t] === PLANT) {
            touchesFuel = true
            if (Math.random() < 0.6) {
              mat[t] = FIRE
              life[t] = FIRE_LIFE
              moved[t] = 1
            }
          } else if (mat[t] === POWDER && life[t] === 0) {
            touchesFuel = true
            life[t] = FUSE // light the fuse; the POWDER branch detonates it
          } else if (mat[t] === WATER && Math.random() < 0.7) {
            mat[t] = SMOKE
            life[t] = SMOKE_LIFE
            moved[t] = 1
            doused = true
          }
        }
        if (doused || life[i] === 0) {
          mat[i] = Math.random() < 0.6 ? SMOKE : EMPTY
          life[i] = mat[i] === SMOKE ? SMOKE_LIFE : 0
        } else if (!touchesFuel && up >= 0 && mat[up] === EMPTY && Math.random() < 0.14) {
          // only drift upward once there's nothing left to burn nearby
          swap(i, up)
        }
      } else if (m === SMOKE) {
        if (life[i] > 0) life[i]--
        if (life[i] === 0) {
          mat[i] = EMPTY
          continue
        }
        const a = first ? ul : ur
        const b = first ? ur : ul
        if (up >= 0 && mat[up] === EMPTY) swap(i, up)
        else if (a >= 0 && mat[a] === EMPTY) swap(i, a)
        else if (b >= 0 && mat[b] === EMPTY) swap(i, b)
      }
    }
  }
}

export function renderWorld(world, imageData) {
  const { mat, shade, cols, rows } = world
  const px = imageData.data
  const total = cols * rows
  for (let i = 0; i < total; i++) {
    const pair = COLORS[mat[i]] || COLORS[EMPTY]
    const lo = pair[0]
    const hi = pair[1]
    const t = shade[i] / 255
    const o = i * 4
    px[o] = (lo[0] + (hi[0] - lo[0]) * t) | 0
    px[o + 1] = (lo[1] + (hi[1] - lo[1]) * t) | 0
    px[o + 2] = (lo[2] + (hi[2] - lo[2]) * t) | 0
    px[o + 3] = 255
  }
}

export function population(world, m) {
  let c = 0
  for (const v of world.mat) if (v === m) c++
  return c
}
