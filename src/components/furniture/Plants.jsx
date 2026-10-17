import { useMemo } from 'react'
import {
  CanvasTexture,
  CatmullRomCurve3,
  DoubleSide,
  LatheGeometry,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { K } from './materials'

// Lush indoor plants, like the reference terrace: a monstera, a kentia palm, a hanging Boston fern,
// trailing pothos and a snake plant. Leaves are canvas-textured cut-outs on gently curved planes;
// each palm/fern frond and each pothos is merged into a single mesh so they stay cheap.

function seeded(seed) {
  let s = seed
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280)
}

// ---- leaf textures (alpha cut-outs, base of the leaf at the bottom) ----
function leafCanvas(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}
const green = (g, w, h, dark, light) => {
  const grad = g.createLinearGradient(0, h, w, 0)
  grad.addColorStop(0, dark)
  grad.addColorStop(1, light)
  return grad
}
const TEX = {
  // monstera: big heart leaf with slits cut in from the edge and a few holes
  monstera: () =>
    leafCanvas(256, 256, (g, w, h) => {
      g.fillStyle = green(g, w, h, '#0f3a19', '#2a7034')
      g.beginPath()
      g.moveTo(w / 2, h * 0.97)
      g.bezierCurveTo(w * 0.02, h * 0.85, w * 0.0, h * 0.25, w * 0.42, h * 0.08)
      g.quadraticCurveTo(w * 0.5, h * 0.18, w * 0.58, h * 0.08)
      g.bezierCurveTo(w, h * 0.25, w * 0.98, h * 0.85, w / 2, h * 0.97)
      g.fill()
      g.strokeStyle = 'rgba(190,230,170,0.55)'
      g.lineWidth = 3
      g.beginPath()
      g.moveTo(w / 2, h * 0.97)
      g.lineTo(w / 2, h * 0.14)
      g.stroke()
      g.globalCompositeOperation = 'destination-out'
      g.lineCap = 'round'
      const rnd = seeded(5)
      for (const s of [-1, 1])
        for (let i = 0; i < 5; i++) {
          const y = h * (0.28 + i * 0.13)
          g.lineWidth = 11 + rnd() * 5
          g.beginPath()
          g.moveTo(w / 2 + s * w * 0.5, y - h * 0.08)
          g.lineTo(w / 2 + s * w * (0.12 + rnd() * 0.08), y + h * 0.02)
          g.stroke()
          if (rnd() < 0.5) {
            g.beginPath()
            g.ellipse(w / 2 + s * w * 0.1, y + h * 0.05, 4, 8, 0, 0, Math.PI * 2)
            g.fill()
          }
        }
      g.globalCompositeOperation = 'source-over'
    }),
  // long lance-shaped leaflet (palm, fern)
  leaflet: () =>
    leafCanvas(64, 256, (g, w, h) => {
      g.fillStyle = green(g, w, h, '#1d5a26', '#4c9a3e')
      g.beginPath()
      g.moveTo(w / 2, h)
      g.quadraticCurveTo(-w * 0.1, h * 0.45, w / 2, 0)
      g.quadraticCurveTo(w * 1.1, h * 0.45, w / 2, h)
      g.fill()
      g.fillStyle = 'rgba(200,240,170,0.5)'
      g.fillRect(w / 2 - 1, 0, 2, h)
    }),
  // pothos: small heart leaf, marbled with yellow
  heart: () =>
    leafCanvas(128, 128, (g, w, h) => {
      g.fillStyle = green(g, w, h, '#1e6a2a', '#4ea33d')
      g.beginPath()
      g.moveTo(w / 2, h * 0.02)
      g.bezierCurveTo(w * 1.05, h * 0.35, w * 0.95, h * 0.95, w / 2, h * 0.86)
      g.bezierCurveTo(w * 0.05, h * 0.95, -w * 0.05, h * 0.35, w / 2, h * 0.02)
      g.fill()
      g.globalCompositeOperation = 'source-atop'
      const rnd = seeded(8)
      g.strokeStyle = 'rgba(230,220,120,0.45)'
      for (let i = 0; i < 8; i++) {
        g.lineWidth = 2 + rnd() * 4
        g.beginPath()
        g.moveTo(w / 2, h * (0.2 + rnd() * 0.6))
        g.lineTo(w * rnd(), h * rnd())
        g.stroke()
      }
      g.globalCompositeOperation = 'source-over'
    }),
  // snake plant: dark sword leaf with pale bands and a yellow edge
  sword: () =>
    leafCanvas(64, 512, (g, w, h) => {
      g.fillStyle = '#c9b84a'
      g.beginPath()
      g.moveTo(w * 0.1, h)
      g.quadraticCurveTo(0, h * 0.4, w / 2, 0)
      g.quadraticCurveTo(w, h * 0.4, w * 0.9, h)
      g.fill()
      g.fillStyle = '#1e4a2a'
      g.beginPath()
      g.moveTo(w * 0.2, h)
      g.quadraticCurveTo(w * 0.1, h * 0.4, w / 2, h * 0.03)
      g.quadraticCurveTo(w * 0.9, h * 0.4, w * 0.8, h)
      g.fill()
      g.globalCompositeOperation = 'source-atop'
      g.fillStyle = 'rgba(160,200,150,0.35)'
      for (let y = 10; y < h; y += 26) g.fillRect(0, y, w, 6)
      g.globalCompositeOperation = 'source-over'
    }),
}
const mats = {}
function leafMat(kind) {
  if (!mats[kind]) mats[kind] = new MeshStandardMaterial({ map: TEX[kind](), alphaTest: 0.45, side: DoubleSide, roughness: 0.55 })
  return mats[kind]
}
const stemMat = () => (mats.stem ??= new MeshStandardMaterial({ color: '#3d6b2c', roughness: 0.7 }))

// A leaf plane w × h with its base at the origin, pointing up +y, face +z: curls back by `bend` and
// folds along the midrib by `fold`
function leafGeo(w, h, bend = 0.2, fold = 0.15) {
  const g = new PlaneGeometry(w, h, 4, 8)
  g.translate(0, h / 2, 0)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const v = p.getY(i) / h
    const u = p.getX(i) / (w / 2)
    p.setZ(i, -bend * v * v * h + fold * Math.abs(u) * w * 0.5)
  }
  g.computeVertexNormals()
  return g
}

// Orient a leaf: base at `at`, pointing along `dir`, face turned toward `up` as far as possible
const _x = new Vector3()
const _y = new Vector3()
const _z = new Vector3()
function placeLeaf(geo, at, dir, up = new Vector3(0, 1, 0)) {
  _y.copy(dir).normalize()
  _x.crossVectors(_y, up)
  if (_x.lengthSq() < 1e-6) _x.set(1, 0, 0)
  _x.normalize()
  _z.crossVectors(_x, _y).normalize()
  return geo.applyMatrix4(new Matrix4().makeBasis(_x, _y, _z).setPosition(at))
}

// One arching frond: a rachis and paired leaflets drooping off it. Returns { leaves, stem } geometries.
function frond({ length, rise, leaflets, size, droop = 0.35, seed = 1 }) {
  const rnd = seeded(seed)
  const curve = new CatmullRomCurve3([
    new Vector3(0, 0, 0),
    new Vector3(length * 0.35, rise * 0.75, 0),
    new Vector3(length * 0.7, rise * 0.85, 0),
    new Vector3(length, rise * 0.45, 0),
  ])
  const leaves = []
  for (let i = 0; i < leaflets; i++) {
    const t = 0.12 + (i / leaflets) * 0.86
    const at = curve.getPoint(t)
    const tan = curve.getTangent(t)
    const len = size * (0.35 + Math.sin(t * Math.PI) ** 0.7 * 0.75) * (0.9 + rnd() * 0.2)
    for (const s of [-1, 1]) {
      const dir = new Vector3(0, -droop, s).add(tan.clone().multiplyScalar(0.7))
      leaves.push(placeLeaf(leafGeo(len * 0.16, len, 0.25, 0.1), at, dir))
    }
  }
  return { leaves: mergeGeometries(leaves), stem: new TubeGeometry(curve, 24, length * 0.012, 5, false) }
}

// ---- pots ----
function Planter({ r = 0.2, h = 0.38, material = K.painted('#2c3135') }) {
  const geo = useMemo(
    () =>
      new LatheGeometry(
        [[0, 0], [r * 0.78, 0], [r * 0.82, 0.02], [r, h * 0.92], [r * 1.06, h * 0.94], [r * 1.06, h], [r * 0.94, h], [r * 0.94, h * 0.9], [0, h * 0.9]].map(
          ([x, y]) => new Vector2(x, y),
        ),
        32,
      ),
    [r, h],
  )
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshPhysicalMaterial {...material} />
      </mesh>
      <mesh position={[0, h * 0.9 + 0.002, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[r * 0.93, 24]} />
        <meshStandardMaterial color="#2a1e15" roughness={1} />
      </mesh>
    </group>
  )
}

// ---- plants ----

// Monstera: a planter with split leaves on long arching stems, turning outward and up
export function Monstera({ scale = 1, seed = 3, ...props }) {
  const leaves = useMemo(() => {
    const rnd = seeded(seed)
    return Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + rnd() * 0.5
      const reach = 0.15 + rnd() * 0.25
      const height = 0.3 + rnd() * 0.5
      const tip = new Vector3(Math.cos(a) * reach, height, Math.sin(a) * reach)
      const stem = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(tip.x * 0.3, height * 0.6, tip.z * 0.3), tip])
      const out = new Vector3(Math.cos(a), 0.5 + rnd() * 0.5, Math.sin(a))
      const size = 0.36 + rnd() * 0.18
      return {
        stem: new TubeGeometry(stem, 12, 0.009, 5, false),
        leaf: placeLeaf(leafGeo(size, size, 0.25, 0.12), tip, out, new Vector3(0, 1, 0).sub(out.clone().multiplyScalar(0.3))),
      }
    })
  }, [seed])
  return (
    <group {...props} scale={scale}>
      <Planter r={0.19} h={0.36} />
      <group position={[0, 0.33, 0]}>
        {leaves.map(({ stem, leaf }, i) => (
          <group key={i}>
            <mesh geometry={stem} material={stemMat()} />
            <mesh geometry={leaf} material={leafMat('monstera')} castShadow />
          </group>
        ))}
      </group>
    </group>
  )
}

// Kentia palm: a tall pot with a fan of long arching fronds
export function Palm({ scale = 1, seed = 7, ...props }) {
  const fronds = useMemo(() => {
    const rnd = seeded(seed)
    return Array.from({ length: 9 }, (_, i) => {
      const f = frond({ length: 0.75 + rnd() * 0.45, rise: 0.9 + rnd() * 0.6, leaflets: 22, size: 0.3, droop: 0.45, seed: seed + i })
      return { ...f, yaw: (i / 9) * Math.PI * 2 + rnd() * 0.4, tilt: -0.15 + rnd() * 0.3 }
    })
  }, [seed])
  return (
    <group {...props} scale={scale}>
      <Planter r={0.24} h={0.5} material={K.painted('#d9d3c7')} />
      {/* a few bare canes up the middle */}
      {[[0.03, 0.02, 0.75], [-0.04, 0.01, 0.6], [0.0, -0.04, 0.9]].map(([x, z, hgt], i) => (
        <mesh key={i} position={[x, 0.45 + hgt / 2, z]} material={stemMat()}>
          <cylinderGeometry args={[0.012, 0.016, hgt, 6]} />
        </mesh>
      ))}
      {fronds.map(({ leaves, stem, yaw, tilt }, i) => (
        <group key={i} position={[0, 0.5 + (i % 3) * 0.22, 0]} rotation={[0, yaw, tilt]}>
          <mesh geometry={stem} material={stemMat()} />
          <mesh geometry={leaves} material={leafMat('leaflet')} castShadow />
        </group>
      ))}
    </group>
  )
}

// Boston fern in a gold basket hung on three chains: fronds arching out and spilling down
export function HangingFern({ drop = 0.6, seed = 11, ...props }) {
  const fronds = useMemo(() => {
    const rnd = seeded(seed)
    return Array.from({ length: 16 }, (_, i) => {
      const f = frond({ length: 0.42 + rnd() * 0.18, rise: 0.12 - rnd() * 0.25, leaflets: 26, size: 0.075, droop: 0.2, seed: seed + i })
      return { ...f, yaw: (i / 16) * Math.PI * 2 + rnd() * 0.3, tilt: 0.15 - rnd() * 0.95 }
    })
  }, [seed])
  const basket = useMemo(
    () => new LatheGeometry([[0, -0.12], [0.1, -0.11], [0.17, -0.04], [0.19, 0.02], [0.2, 0.03], [0, 0.03]].map(([x, y]) => new Vector2(x, y)), 28),
    [],
  )
  return (
    <group {...props}>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.09, -drop / 2, Math.sin(a) * 0.09]} rotation={[Math.sin(a) * 0.17, 0, -Math.cos(a) * 0.17]}>
            <cylinderGeometry args={[0.003, 0.003, drop, 4]} />
            <meshPhysicalMaterial {...K.gold()} />
          </mesh>
        )
      })}
      <group position={[0, -drop, 0]}>
        <mesh geometry={basket} castShadow>
          <meshPhysicalMaterial {...K.gold()} side={DoubleSide} />
        </mesh>
        {fronds.map(({ leaves, stem, yaw, tilt }, i) => (
          <group key={i} position={[0, 0.02, 0]} rotation={[0, yaw, tilt]}>
            <mesh geometry={stem} material={stemMat()} />
            <mesh geometry={leaves} material={leafMat('leaflet')} castShadow />
          </group>
        ))}
      </group>
    </group>
  )
}

// Pothos: a small pot with vines trailing down over its edge, heart leaves all along them
export function Pothos({ vines = 6, length = 1.1, seed = 13, ...props }) {
  const { stems, leaves } = useMemo(() => {
    const rnd = seeded(seed)
    const stemGeos = []
    const leafGeos = []
    for (let i = 0; i < vines; i++) {
      const a = (i / vines) * Math.PI * 2 + rnd()
      const len = length * (0.5 + rnd() * 0.6)
      const out = new Vector3(Math.cos(a), 0, Math.sin(a))
      const pts = [new Vector3(0, 0.1, 0), out.clone().multiplyScalar(0.13).setY(0.12)]
      for (let k = 1; k <= 6; k++) {
        const t = k / 6
        pts.push(out.clone().multiplyScalar(0.16 + t * 0.12 + Math.sin(t * 5 + i) * 0.04).setY(0.1 - t * len))
      }
      const curve = new CatmullRomCurve3(pts)
      stemGeos.push(new TubeGeometry(curve, 30, 0.004, 4, false))
      const n = Math.floor(len / 0.07)
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n
        const at = curve.getPoint(t)
        const side = new Vector3().crossVectors(curve.getTangent(t), new Vector3(0, 1, 0)).normalize().multiplyScalar(k % 2 ? 1 : -1)
        const dir = side.add(out.clone().multiplyScalar(0.8)).add(new Vector3(0, -0.4, 0))
        const s = 0.05 + rnd() * 0.035
        leafGeos.push(placeLeaf(leafGeo(s, s, 0.15, 0.1), at, dir, out))
      }
    }
    return { stems: mergeGeometries(stemGeos), leaves: mergeGeometries(leafGeos) }
  }, [vines, length, seed])
  return (
    <group {...props}>
      <Planter r={0.12} h={0.16} material={K.gold()} />
      <mesh geometry={stems} material={stemMat()} />
      <mesh geometry={leaves} material={leafMat('heart')} castShadow />
    </group>
  )
}

// Hang anything (a pot) from three thin gold chains, `drop` metres below this point
export function Hanging({ drop = 0.4, spread = 0.1, children, ...props }) {
  return (
    <group {...props}>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2
        const tilt = Math.atan2(spread, drop)
        return (
          <mesh key={i} position={[Math.cos(a) * spread * 0.5, -drop / 2, Math.sin(a) * spread * 0.5]} rotation={[Math.sin(a) * tilt, 0, -Math.cos(a) * tilt]}>
            <cylinderGeometry args={[0.003, 0.003, drop, 4]} />
            <meshPhysicalMaterial {...K.gold()} />
          </mesh>
        )
      })}
      <group position={[0, -drop, 0]}>{children}</group>
    </group>
  )
}

// Snake plant: a clump of tall banded sword leaves in a square-ish pot
export function SnakePlant({ seed = 17, ...props }) {
  const leaves = useMemo(() => {
    const rnd = seeded(seed)
    return mergeGeometries(
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + rnd()
        const lean = 0.08 + rnd() * 0.18
        const dir = new Vector3(Math.cos(a) * lean, 1, Math.sin(a) * lean)
        const at = new Vector3(Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04)
        return placeLeaf(leafGeo(0.07, 0.45 + rnd() * 0.35, 0.06, 0.35), at, dir, new Vector3(Math.cos(a + 1.2), 0, Math.sin(a + 1.2)))
      }),
    )
  }, [seed])
  return (
    <group {...props}>
      <Planter r={0.13} h={0.26} material={K.lacquer('#efe9df')} />
      <mesh geometry={leaves} position={[0, 0.23, 0]} material={leafMat('sword')} castShadow />
    </group>
  )
}
