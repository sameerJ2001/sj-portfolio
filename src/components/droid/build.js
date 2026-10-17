import {
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  ExtrudeGeometry,
  Float32BufferAttribute,
  MathUtils,
  Path,
  Quaternion,
  SRGBColorSpace,
  Shape,
  TubeGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Geometry and textures for SJ-3PO, the gold protocol droid (see Character.jsx).
// Armour plates (head, chest, pelvis) are lofted shells: a stack of horizontal superellipse rings
// [{ y, w, d, z, dip, dipBack }] (half-width, half-depth, forward offset; `dip` lowers the front of a
// ring for curved plate edges). θ runs around the ring: 0 = front (+z), +π/2 = +x side, ±π = back.

function seeded(seed) {
  let s = seed
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280)
}

// Point on a superellipse ring (squareness n: 2 = ellipse, higher = boxier)
function se(w, d, n, th) {
  const s = Math.sin(th)
  const c = Math.cos(th)
  return [w * Math.sign(s) * Math.abs(s) ** (2 / n), d * Math.sign(c) * Math.abs(c) ** (2 / n)]
}

const ringY = (r, th) => {
  const c = Math.cos(th)
  return r.y - (r.dip ?? 0) * Math.max(0, c) ** 3 - (r.dipBack ?? 0) * Math.max(0, -c) ** 3
}

// Ring interpolated at height y (between the loft's rings)
function ringAt(rings, y) {
  let k = 0
  while (k < rings.length - 2 && rings[k + 1].y < y) k++
  const a = rings[k]
  const b = rings[k + 1]
  const t = Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y)))
  const l = (p) => (a[p] ?? 0) + ((b[p] ?? 0) - (a[p] ?? 0)) * t
  return { y, w: l('w'), d: l('d'), z: l('z') }
}

// Smooth capped shell through the rings. UVs: u = (θ + π) / 2π, v = height (y range in userData).
export function loft(rings, n = 2.5, seg = 56) {
  const pos = []
  const ys = []
  rings.forEach((r) => {
    for (let i = 0; i <= seg; i++) {
      const th = -Math.PI + (i / seg) * Math.PI * 2
      const [x, z] = se(r.w, r.d, n, th)
      const y = ringY(r, th)
      pos.push(x, y, z + (r.z ?? 0))
      ys.push(y)
    }
  })
  const lo = Math.min(...ys)
  const hi = Math.max(...ys)
  const uv = []
  rings.forEach((_, j) => {
    for (let i = 0; i <= seg; i++) uv.push(i / seg, (ys[j * (seg + 1) + i] - lo) / (hi - lo))
  })
  const idx = []
  const row = seg + 1
  for (let j = 0; j < rings.length - 1; j++) {
    for (let i = 0; i < seg; i++) {
      const a = j * row + i
      idx.push(a, a + 1, a + row, a + 1, a + row + 1, a + row)
    }
  }
  // caps: a centre point fanned to the first and last ring
  const cap = (j, up) => {
    const r = rings[j]
    const c = pos.length / 3
    pos.push(0, r.y, r.z ?? 0)
    uv.push(0.5, up ? 1 : 0)
    for (let i = 0; i < seg; i++) {
      const a = j * row + i
      if (up) idx.push(c, a, a + 1)
      else idx.push(c, a + 1, a)
    }
  }
  cap(0, false)
  cap(rings.length - 1, true)

  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  // weld the normals along the seam at the back so there's no crease in the reflections
  const nrm = g.attributes.normal
  for (let j = 0; j < rings.length; j++) {
    const a = j * row
    const b = a + seg
    const v = new Vector3().fromBufferAttribute(nrm, a).add(new Vector3().fromBufferAttribute(nrm, b)).normalize()
    nrm.setXYZ(a, v.x, v.y, v.z)
    nrm.setXYZ(b, v.x, v.y, v.z)
  }
  g.userData.yRange = [lo, hi]
  return g
}

// Where to attach a detail on a loft's surface: position (pushed `out` along the normal) and the
// quaternion that turns +z to face outwards there.
const Z = new Vector3(0, 0, 1)
export function mount(rings, n, th, y, out = 0) {
  const P = (t, yy) => {
    const r = ringAt(rings, yy)
    const [x, z] = se(r.w, r.d, n, t)
    return new Vector3(x, yy, z + r.z)
  }
  const p = P(th, y)
  const tangent = P(th + 1e-3, y).sub(P(th - 1e-3, y))
  const up = P(th, y + 1e-3).sub(P(th, y - 1e-3))
  const normal = tangent.cross(up).normalize()
  p.addScaledVector(normal, out)
  return { position: p.toArray(), quaternion: new Quaternion().setFromUnitVectors(Z, normal) }
}

// θ on a ring that lands at a given x across the front (for placing eyes etc. by width)
export function thetaAt(rings, n, x, y) {
  const r = ringAt(rings, y)
  return Math.sign(x) * Math.asin(Math.min(1, Math.abs(x) / r.w) ** (n / 2))
}

// Rolled edge along one ring of a loft (plate lips)
export function edgeTube(ring, n, radius, out = 0.002) {
  const pts = []
  for (let i = 0; i < 64; i++) {
    const th = -Math.PI + (i / 64) * Math.PI * 2
    const [x, z] = se(ring.w + out, ring.d + out, n, th)
    pts.push(new Vector3(x, ringY(ring, th), z + (ring.z ?? 0)))
  }
  return new TubeGeometry(new CatmullRomCurve3(pts, true), 128, radius, 8, true)
}

// The slotted "hood" band of the head: a flat strip that follows the head's front-view silhouette
// over the top and down both sides, standing out from the shell, with a row of slots along it.
// Below `combFrom` it widens into a comb of horizontal slots beside the cheeks.
export function hoodBand(rings, { bottom = -0.045, out = 0.016, comb = 0.03, combFrom = 0.025, depth = 0.012 } = {}) {
  const top = rings[rings.length - 1].y
  const N = 48
  const right = []
  for (let i = 0; i < N; i++) {
    const y = bottom + ((top - bottom) * i) / N
    right.push([ringAt(rings, y).w, y])
  }
  // silhouette from the bottom of the right side, over the top, down to the bottom of the left
  const mid = [...right, [0, top], ...right.slice().reverse().map(([x, y]) => [-x, y])]
  const normals = mid.map((p, i) => {
    const a = mid[Math.max(0, i - 1)]
    const b = mid[Math.min(mid.length - 1, i + 1)]
    const tx = b[0] - a[0]
    const ty = b[1] - a[1]
    const l = Math.hypot(tx, ty)
    return [ty / l, -tx / l]
  })
  const width = (y) => out + (comb - out) * MathUtils.smoothstep(y, combFrom, combFrom - 0.03)
  const off = (d) => mid.map(([x, y], i) => [x + normals[i][0] * d(y), y + normals[i][1] * d(y)])
  const outer = off(width)
  const inner = off(() => -0.004)
  const shape = new Shape()
  outer.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)))
  inner.reverse().forEach(([x, y]) => shape.lineTo(x, y))
  shape.closePath()

  const slot = (cx, cy, ux, uy, len, w) => {
    const vx = -uy
    const vy = ux
    const p = new Path()
    p.moveTo(cx - ux * len - vx * w, cy - uy * len - vy * w)
    p.lineTo(cx + ux * len - vx * w, cy + uy * len - vy * w)
    p.lineTo(cx + ux * len + vx * w, cy + uy * len + vy * w)
    p.lineTo(cx - ux * len + vx * w, cy - uy * len + vy * w)
    p.closePath()
    shape.holes.push(p)
  }
  // slots along the narrow band, every ~2.2 cm of its length
  let run = 0
  for (let i = 1; i < mid.length - 1; i++) {
    run += Math.hypot(mid[i][0] - mid[i - 1][0], mid[i][1] - mid[i - 1][1])
    const [x, y] = mid[i]
    if (y < combFrom + 0.01 || run < 0.022) continue
    run = 0
    const [nx, ny] = normals[i]
    slot(x + nx * (out * 0.5 - 0.001), y + ny * (out * 0.5 - 0.001), -ny, nx, 0.0065, 0.0022)
  }
  // horizontal slots in the comb by each cheek
  for (let y = combFrom - 0.035; y > bottom + 0.004; y -= 0.014) {
    const w = ringAt(rings, y).w
    for (const s of [-1, 1]) slot(s * (w + comb * 0.5), y, 1, 0, comb * 0.3, 0.0022)
  }

  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.001, bevelSegments: 1, curveSegments: 2 })
  g.translate(0, 0, -depth / 2)
  return g
}

// The exposed midsection: dozens of red / black / grey wires bowing out around a core, merged into
// one vertex-coloured mesh. Plus a few strays that cross diagonally.
const WIRE_COLOURS = [
  ['#9e1f17', 0.34], ['#5f120d', 0.2], ['#121212', 0.34], ['#55585c', 0.07], ['#b8b8b8', 0.02], ['#2d4f8f', 0.03],
]
export function wireBundle({ y0, y1, w, d, count = 52, seed = 5 }) {
  const rnd = seeded(seed)
  const pick = () => {
    let v = rnd()
    for (const [c, p] of WIRE_COLOURS) if ((v -= p) <= 0) return c
    return WIRE_COLOURS[0][0]
  }
  const geos = []
  const wire = (pts, r) => {
    const g = new TubeGeometry(new CatmullRomCurve3(pts), 10, r, 5, false)
    const col = new Color(pick())
    const n = g.attributes.position.count
    const c = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) col.toArray(c, i * 3)
    g.setAttribute('color', new Float32BufferAttribute(c, 3))
    geos.push(g)
  }
  for (let i = 0; i < count; i++) {
    const th = -Math.PI + ((i + rnd() * 0.7) / count) * Math.PI * 2
    const bow = 1.04 + rnd() * 0.14
    const [x, z] = se(w, d, 2.2, th)
    const sway = (rnd() - 0.5) * 0.25
    const [x2, z2] = se(w, d, 2.2, th + sway)
    wire(
      [
        new Vector3(x * 0.85, y0, z * 0.85),
        new Vector3(((x + x2) / 2) * bow, y0 + (y1 - y0) * (0.4 + rnd() * 0.2), ((z + z2) / 2) * bow),
        new Vector3(x2 * 0.85, y1, z2 * 0.85),
      ],
      0.0035 + rnd() * 0.003,
    )
  }
  for (let i = 0; i < 9; i++) {
    const a = (rnd() - 0.5) * 2.4
    const b = a + (rnd() - 0.5) * 1.6
    const [xa, za] = se(w, d, 2.2, a)
    const [xb, zb] = se(w, d, 2.2, b)
    wire(
      [new Vector3(xa * 0.9, y0 + 0.02, za * 0.9), new Vector3((xa + xb) * 0.6, (y0 + y1) / 2, (za + zb) * 0.6 + 0.012), new Vector3(xb * 0.9, y1 - 0.02, zb * 0.9)],
      0.004,
    )
  }
  return mergeGeometries(geos)
}

// ---- textures -------------------------------------------------------------------------------

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

// Polished-but-old brass: faint tarnish patches, buffed highlights, fine scratches and pits
function worn(g, W, H, seed) {
  const rnd = seeded(seed)
  g.fillStyle = '#f2f2f2'
  g.fillRect(0, 0, W, H)
  const blob = (n, rgba, max) => {
    for (let i = 0; i < n; i++) {
      const x = rnd() * W
      const y = rnd() * H
      const r = 15 + rnd() * 90
      const grad = g.createRadialGradient(x, y, 0, x, y, r)
      grad.addColorStop(0, rgba + (max * (0.4 + rnd() * 0.6)).toFixed(3) + ')')
      grad.addColorStop(1, rgba + '0)')
      g.fillStyle = grad
      g.fillRect(x - r, y - r, r * 2, r * 2)
    }
  }
  blob(40, 'rgba(70,45,15,', 0.16)
  blob(18, 'rgba(255,255,255,', 0.18)
  g.lineCap = 'round'
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W
    const y = rnd() * H
    const len = 4 + rnd() * 26
    const a = (rnd() - 0.5) * 0.9
    g.strokeStyle = rnd() < 0.6 ? `rgba(40,25,5,${0.08 + rnd() * 0.12})` : `rgba(255,255,255,${0.1 + rnd() * 0.15})`
    g.lineWidth = 0.6 + rnd() * 0.8
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
    g.stroke()
  }
  for (let i = 0; i < 500; i++) {
    g.fillStyle = `rgba(30,20,5,${0.1 + rnd() * 0.2})`
    g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 1.5, 1 + rnd() * 1.5)
  }
}

// One canvas → a colour map and a bump map (engraved panel lines are dark = recessed)
function maps(c) {
  const map = new CanvasTexture(c)
  map.colorSpace = SRGBColorSpace
  map.anisotropy = 8
  const bump = new CanvasTexture(c)
  bump.anisotropy = 8
  return { map, bump }
}

// Worn plating + engraved panel lines for a loft, drawn in (θ, y) space:
// draw(line) where line([[θ, y], ...], width?) strokes a groove through those surface points.
export function panelMaps(geo, draw, { w = 1024, h = 512, seed = 3 } = {}) {
  const c = canvas(w, h)
  const g = c.getContext('2d')
  worn(g, w, h, seed)
  const [lo, hi] = geo.userData.yRange
  const P = (th, y) => [((th + Math.PI) / (Math.PI * 2)) * w, (1 - (y - lo) / (hi - lo)) * h]
  const line = (pts, width = 3) => {
    // dark groove with a bright lip below it, like a stamped seam
    for (const [style, dy, lw] of [
      ['rgba(255,240,210,0.55)', 1.5, width * 0.7],
      ['rgba(25,15,3,0.92)', 0, width],
    ]) {
      g.strokeStyle = style
      g.lineWidth = lw
      g.lineJoin = g.lineCap = 'round'
      g.beginPath()
      pts.forEach(([th, y], i) => {
        const [x, yy] = P(th, y)
        if (i) g.lineTo(x, yy + dy)
        else g.moveTo(x, yy + dy)
      })
      g.stroke()
    }
  }
  draw(line)
  return maps(c)
}

// Worn plating with seams down both sides and bands near the ends, for the cylindrical limbs
export function limbMaps(seed = 11) {
  const W = 512
  const H = 256
  const c = canvas(W, H)
  const g = c.getContext('2d')
  worn(g, W, H, seed)
  g.strokeStyle = 'rgba(25,15,3,0.85)'
  g.lineWidth = 2.5
  for (const u of [0.25, 0.75]) {
    g.beginPath()
    g.moveTo(u * W, H * 0.12)
    g.lineTo(u * W, H * 0.88)
    g.stroke()
  }
  for (const v of [0.08, 0.92]) {
    g.beginPath()
    g.moveTo(0, v * H)
    g.lineTo(W, v * H)
    g.stroke()
  }
  return maps(c)
}

// Photoreceptor like the reference: cream lens behind fine vertical slats, a small black pupil
export function eyeTexture() {
  const S = 128
  const c = canvas(S, S)
  const g = c.getContext('2d')
  const m = S / 2
  const grad = g.createRadialGradient(m, m, 0, m, m, m)
  grad.addColorStop(0, '#fffdf2')
  grad.addColorStop(0.7, '#f6ecca')
  grad.addColorStop(0.92, '#cdb57a')
  grad.addColorStop(1, '#5a4320')
  g.fillStyle = grad
  g.fillRect(0, 0, S, S)
  g.fillStyle = 'rgba(40,28,8,0.9)'
  for (let x = 6; x < S; x += 10) g.fillRect(x, 0, 3, S)
  g.fillStyle = '#0c0904'
  g.beginPath()
  g.arc(m, m, S * 0.075, 0, Math.PI * 2)
  g.fill()
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

// The cream badge on the back of the head: concentric rings and a ring broken into four segments
export function badgeTexture() {
  const S = 256
  const c = canvas(S, S)
  const g = c.getContext('2d')
  const m = S / 2
  g.fillStyle = '#c9b98f'
  g.fillRect(0, 0, S, S)
  g.fillStyle = '#efe7cf'
  g.beginPath()
  g.arc(m, m, m * 0.96, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#6b5a33'
  g.lineWidth = 5
  for (const r of [0.94, 0.42, 0.24, 0.1]) {
    g.beginPath()
    g.arc(m, m, m * r, 0, Math.PI * 2)
    g.stroke()
  }
  g.lineWidth = 16
  for (let k = 0; k < 4; k++) {
    g.beginPath()
    g.arc(m, m, m * 0.66, k * (Math.PI / 2) + 0.28, (k + 1) * (Math.PI / 2) - 0.28)
    g.stroke()
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}
