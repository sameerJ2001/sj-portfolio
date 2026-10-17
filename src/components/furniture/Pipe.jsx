import { useMemo } from 'react'
import { BoxGeometry, CurvePath, CylinderGeometry, Euler, LineCurve3, Matrix4, QuadraticBezierCurve3, Quaternion, TubeGeometry, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { K } from './materials'

// A bent pipe through a list of [x, y, z] points, with rounded bends at every corner and industrial
// fittings like the reference: collared elbows at every bend, and along the straight runs (every
// `clampEvery` metres) strap clamps with a bolted lug, bolted flange couplings and collars with a
// raised plate; bolted end flanges at both ends. metal="copper" (worn rose copper, the pipework) or
// "steel" (polished stainless, tinted by `color`: rails and trims). All fittings merge into one mesh.
const Z = new Vector3(0, 0, 1)
const PATTERN = ['clamp', 'coupling', 'clamp', 'collar']

function pipePath(points, bend) {
  const v = points.map((p) => new Vector3(...p))
  const path = new CurvePath()
  const elbows = []
  let start = v[0]
  for (let i = 1; i < v.length - 1; i++) {
    const [a, b, c] = [v[i - 1], v[i], v[i + 1]]
    const r = Math.min(bend, a.distanceTo(b) / 2, b.distanceTo(c) / 2)
    const p1 = b.clone().add(a.clone().sub(b).setLength(r))
    const p2 = b.clone().add(c.clone().sub(b).setLength(r))
    path.add(new LineCurve3(start, p1))
    path.add(new QuadraticBezierCurve3(p1, b, p2))
    elbows.push({ p: p1, dir: b.clone().sub(a).normalize() }, { p: p2, dir: c.clone().sub(b).normalize() })
    start = p2
  }
  path.add(new LineCurve3(start, v[v.length - 1]))
  return { path, v, elbows }
}

// Positions along each straight run, `every` metres apart, facing along the pipe
function along(v, every, inset) {
  const out = []
  for (let i = 0; i < v.length - 1; i++) {
    const dir = v[i + 1].clone().sub(v[i])
    const len = dir.length()
    const n = Math.floor((len - 2 * inset) / every)
    if (n < 1) continue
    dir.normalize()
    for (let k = 0; k <= n; k++) out.push({ p: v[i].clone().addScaledVector(dir, inset + ((len - 2 * inset) * k) / n), dir })
  }
  return out
}

// One fitting's parts in its own frame (pipe axis = +z, lug side = +y), for pipe radius r
function fittingParts(kind, r) {
  const parts = []
  const add = (geo, pos, rot) => {
    if (rot) geo.applyMatrix4(new Matrix4().makeRotationFromEuler(new Euler(...rot)))
    geo.translate(...pos)
    parts.push(geo)
  }
  const band = (radius, len, z = 0) => add(new CylinderGeometry(radius, radius, len, 28), [0, 0, z], [Math.PI / 2, 0, 0])
  const boltRing = (count, radius, z, size) => {
    for (let i = 0; i < count; i++) {
      const a = ((i + 0.5) / count) * Math.PI * 2
      add(new CylinderGeometry(size, size, size * 1.1, 6), [Math.cos(a) * radius, Math.sin(a) * radius, z], [Math.PI / 2, 0, 0])
    }
  }
  switch (kind) {
    case 'clamp':
      // strap band round the pipe, a lug on top with three bolt heads
      band(r * 1.14, r * 0.7)
      add(new BoxGeometry(r * 1.6, r * 0.5, r * 0.9), [0, r * 1.25, 0])
      for (const x of [-0.5, 0, 0.5]) add(new CylinderGeometry(r * 0.13, r * 0.13, r * 0.14, 6), [x * r, r * 1.56, 0])
      break
    case 'coupling':
      // two thick flanges bolted face to face, bolt heads on both outer faces
      for (const s of [-1, 1]) {
        band(r * 1.62, r * 0.32, s * r * 0.2)
        boltRing(8, r * 1.38, s * r * 0.4, r * 0.11)
      }
      band(r * 1.18, r * 1.6)
      break
    case 'collar':
      // sleeve with rolled rims and a small raised plate
      band(r * 1.13, r * 1.8)
      for (const s of [-1, 1]) band(r * 1.22, r * 0.18, s * r * 0.82)
      add(new BoxGeometry(r * 0.75, r * 0.08, r * 0.5), [0, r * 1.15, 0])
      break
    case 'elbow':
      // collar where a bend meets the straight pipe
      band(r * 1.16, r * 0.75)
      band(r * 1.24, r * 0.16, -r * 0.3)
      break
    case 'cap':
      // bolted end flange with a raised boss
      band(r * 1.65, r * 0.32)
      band(r * 1.25, r * 0.16, r * 0.23)
      boltRing(6, r * 1.44, r * 0.2, r * 0.12)
      break
  }
  return parts
}

export default function Pipe({ points, radius = 0.035, bend = 0.14, color, metal = 'steel', clampEvery = 0, flanges = true, castShadow = true }) {
  const key = JSON.stringify(points)
  const { tube, fittings } = useMemo(() => {
    const { path, v, elbows } = pipePath(points, bend)
    const length = path.getLength()
    const tube = new TubeGeometry(path, Math.max(12, Math.ceil(length * 28)), radius, 18, false)
    // one texture repeat per half metre along the pipe
    const uv = tube.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * length * 2)

    const placed = []
    const put = (kind, p, dir) => {
      const m = new Matrix4().compose(p, new Quaternion().setFromUnitVectors(Z, dir), new Vector3(1, 1, 1))
      for (const g of fittingParts(kind, radius)) placed.push(g.applyMatrix4(m))
    }
    if (bend > 0) elbows.forEach(({ p, dir }) => put('elbow', p, dir))
    if (clampEvery) along(v, clampEvery, bend + 0.14).forEach(({ p, dir }, i) => put(PATTERN[i % PATTERN.length], p, dir))
    if (flanges) {
      put('cap', v[0], v[0].clone().sub(v[1]).normalize())
      put('cap', v[v.length - 1], v[v.length - 1].clone().sub(v[v.length - 2]).normalize())
    }
    return { tube, fittings: placed.length ? mergeGeometries(placed) : null }
  }, [key, radius, bend, clampEvery, flanges]) // eslint-disable-line react-hooks/exhaustive-deps

  const mat = metal === 'copper' ? K.copper() : K.steel(color)
  return (
    <group>
      <mesh geometry={tube} castShadow={castShadow} receiveShadow>
        <meshPhysicalMaterial {...mat} />
      </mesh>
      {fittings && (
        <mesh geometry={fittings} castShadow={castShadow} receiveShadow>
          <meshPhysicalMaterial {...mat} />
        </mesh>
      )}
    </group>
  )
}
