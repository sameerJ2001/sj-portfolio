import { BufferGeometry, Color, Float32BufferAttribute } from 'three'

// A tiny voxel modeller for MagicaVoxel-style pieces built in code (the arcade cabinets).
// Fill a grid with palette colours using boxes / side profiles / single points (all in metres),
// then mesh() turns it into two geometries: the solid voxels (vertex colours with per-voxel colour
// jitter and baked corner occlusion, like a voxel render) and the glowing voxels (for bloom).
//
//   const g = new VoxelGrid({ size: 0.02, min: [-0.43, 0, -0.38], max: [0.43, 2.26, 0.62] })
//   g.box([-0.3, 0.3], [0, 1], [0, 0.2], 1)
//   const { solid, glow } = g.mesh({ 1: { color: '#2a63d6' }, 2: { color: '#fff', glow: true } })

export class VoxelGrid {
  constructor({ size, min, max }) {
    this.size = size
    this.min = min
    this.n = max.map((m, a) => Math.round((m - min[a]) / size))
    this.data = new Uint8Array(this.n[0] * this.n[1] * this.n[2])
  }

  idx(i, j, k) {
    return (k * this.n[1] + j) * this.n[0] + i
  }
  inside(i, j, k) {
    return i >= 0 && j >= 0 && k >= 0 && i < this.n[0] && j < this.n[1] && k < this.n[2]
  }
  get(i, j, k) {
    return this.inside(i, j, k) ? this.data[this.idx(i, j, k)] : 0
  }
  put(i, j, k, c) {
    if (this.inside(i, j, k)) this.data[this.idx(i, j, k)] = c
  }
  // centre of voxel (i, j, k) in metres
  centre(i, j, k) {
    const s = this.size
    return [this.min[0] + (i + 0.5) * s, this.min[1] + (j + 0.5) * s, this.min[2] + (k + 0.5) * s]
  }
  // voxel containing a point in metres
  at(x, y, z) {
    const s = this.size
    return [Math.floor((x - this.min[0]) / s), Math.floor((y - this.min[1]) / s), Math.floor((z - this.min[2]) / s)]
  }

  // Visit every voxel whose centre is inside [x0,x1]×[y0,y1]×[z0,z1]
  each([x0, x1], [y0, y1], [z0, z1], fn) {
    const [i0, j0, k0] = this.at(x0 + this.size / 2, y0 + this.size / 2, z0 + this.size / 2)
    const [i1, j1, k1] = this.at(x1 + this.size / 2, y1 + this.size / 2, z1 + this.size / 2)
    for (let k = Math.max(0, k0); k < Math.min(this.n[2], k1); k++)
      for (let j = Math.max(0, j0); j < Math.min(this.n[1], j1); j++)
        for (let i = Math.max(0, i0); i < Math.min(this.n[0], i1); i++) fn(i, j, k)
  }
  box(x, y, z, c) {
    this.each(x, y, z, (i, j, k) => this.put(i, j, k, c))
  }
  // recolour (or carve, with 0) only voxels that are already solid
  paint(x, y, z, c, test = () => true) {
    this.each(x, y, z, (i, j, k) => this.get(i, j, k) && test(i, j, k) && this.put(i, j, k, c))
  }
  point(x, y, z, c) {
    this.put(...this.at(x, y, z), c)
  }
  // Extrude a side silhouette ([z, y] polygon) across x ∈ [x0, x1]
  profile(poly, [x0, x1], c) {
    const zs = poly.map((p) => p[0])
    const ys = poly.map((p) => p[1])
    this.each([x0, x1], [Math.min(...ys), Math.max(...ys)], [Math.min(...zs), Math.max(...zs)], (i, j, k) => {
      const [, y, z] = this.centre(i, j, k)
      if (inPolygon(poly, z, y)) this.put(i, j, k, c)
    })
  }

  mesh(palette, { jitter = 0.07, seed = 1 } = {}) {
    const out = { solid: [[], [], []], glow: [[], [], []] } // positions, normals, colours
    const s = this.size
    const col = new Color()
    const cache = {}
    for (const [key, p] of Object.entries(palette)) cache[key] = new Color(p.color)
    const solid = (i, j, k) => (this.get(i, j, k) ? 1 : 0)

    for (let k = 0; k < this.n[2]; k++)
      for (let j = 0; j < this.n[1]; j++)
        for (let i = 0; i < this.n[0]; i++) {
          const c = this.data[this.idx(i, j, k)]
          if (!c) continue
          const p = palette[c]
          const target = p.glow ? out.glow : out.solid
          // per-voxel colour jitter: the speckly, dithered look of a voxel render
          const h = hash(i, j, k, seed)
          const v = 1 + (h - 0.5) * 2 * (p.jitter ?? jitter)
          const base = cache[c]
          const o = [i, j, k]
          for (const [a, sgn] of DIRS) {
            const nb = [i, j, k]
            nb[a] += sgn
            if (this.get(...nb)) continue
            const b = (a + 1) % 3
            const d = (a + 2) % 3
            // the four corners of this face, counter-clockwise seen from outside
            const corners = sgn > 0 ? CORNERS : CORNERS_REV
            const ao = corners.map(([u, w]) => {
              if (p.glow) return 3
              const q1 = [...nb]
              q1[b] += u
              const q2 = [...nb]
              q2[d] += w
              const q3 = [...nb]
              q3[b] += u
              q3[d] += w
              const s1 = solid(...q1)
              const s2 = solid(...q2)
              return s1 && s2 ? 0 : 3 - (s1 + s2 + solid(...q3))
            })
            const verts = corners.map(([u, w]) => {
              const pos = [o[0] + 0.5, o[1] + 0.5, o[2] + 0.5]
              pos[a] += sgn * 0.5
              pos[b] += u * 0.5
              pos[d] += w * 0.5
              return [this.min[0] + pos[0] * s, this.min[1] + pos[1] * s, this.min[2] + pos[2] * s]
            })
            const normal = [0, 0, 0]
            normal[a] = sgn
            // split the quad along the diagonal that keeps the occlusion gradient smooth
            const order = ao[0] + ao[2] > ao[1] + ao[3] ? [0, 1, 2, 0, 2, 3] : [1, 2, 3, 1, 3, 0]
            for (const q of order) {
              target[0].push(...verts[q])
              target[1].push(...normal)
              col.copy(base).multiplyScalar(v * AO[ao[q]])
              target[2].push(col.r, col.g, col.b)
            }
          }
        }

    const geo = ([pos, nrm, cols]) => {
      const g = new BufferGeometry()
      g.setAttribute('position', new Float32BufferAttribute(pos, 3))
      g.setAttribute('normal', new Float32BufferAttribute(nrm, 3))
      g.setAttribute('color', new Float32BufferAttribute(cols, 3))
      g.computeBoundingSphere()
      return g
    }
    return { solid: geo(out.solid), glow: geo(out.glow) }
  }
}

const DIRS = [
  [0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1],
]
const CORNERS = [
  [-1, -1], [1, -1], [1, 1], [-1, 1],
]
const CORNERS_REV = [...CORNERS].reverse()
const AO = [0.5, 0.68, 0.84, 1]

function hash(i, j, k, seed) {
  let h = (i * 374761393 + j * 668265263 + k * 2147483647 + seed * 144269) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

function inPolygon(poly, x, y) {
  let inside = false
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
    const [xa, ya] = poly[a]
    const [xb, yb] = poly[b]
    if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) inside = !inside
  }
  return inside
}

// 5×7 pixel glyphs for voxel lettering ('#' = voxel), top row first
export const GLYPHS = {
  S: ['.###.', '#...#', '#....', '.###.', '....#', '#...#', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
}
