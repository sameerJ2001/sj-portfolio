import { useMemo } from 'react'
import {
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  ExtrudeGeometry,
  Float32BufferAttribute,
  QuadraticBezierCurve3,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
} from 'three'
import { K } from './materials'

// Realistic sports gear, modelled at real-world size and detail: a shortboard, a tennis racket,
// hex dumbbells and tennis balls. Used by GearCorner.

function canvasTexture(w, h, draw, { repeat, srgb = true } = {}) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new CanvasTexture(c)
  if (srgb) t.colorSpace = SRGBColorSpace
  if (repeat) {
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(...repeat)
  }
  t.anisotropy = 8
  return t
}

// ---------- surfboard ----------
// A 6'1" shortboard: pointed nose, squash tail, nose + tail rocker, domed deck, flatter bottom, rounded
// rails. Long axis = y (tail at -L/2), deck faces +z.
const L = 1.85
const hw = (u) => 0.235 * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * u)), 0.65)
const thick = (u) => 0.064 * Math.pow(Math.max(0.02, Math.sin(Math.PI * (0.04 + 0.92 * u))), 0.45) * Math.min(1, Math.sqrt(hw(u) / 0.06))
const rocker = (u) => (0.12 * Math.max(0, u - 0.55) ** 2) / 0.2025 + (0.045 * Math.max(0, 0.32 - u) ** 2) / 0.1024
const deckZ = (u, xFrac = 0) => {
  const t = thick(u)
  const s = Math.sqrt(Math.max(0, 1 - Math.abs(xFrac) ** (2 / 0.55)))
  return t * 0.62 * s ** 0.75 + rocker(u) - t * 0.12
}
const bottomZ = (u) => -thick(u) * 0.38 + rocker(u) - thick(u) * 0.12

function surfboardGeometry() {
  const NU = 96
  const NV = 40
  const pos = []
  const col = []
  const idx = []
  const base = new Color('#eef1ea')
  const spray = new Color('#3fb8b0')
  const bottomSpray = new Color('#ff7a5c')
  const rail = new Color('#d9ddd6')
  const c = new Color()
  for (let i = 0; i <= NU; i++) {
    const u = i / NU
    const w = hw(u)
    const t = thick(u)
    for (let j = 0; j < NV; j++) {
      const v = (j / NV) * Math.PI * 2
      const cv = Math.cos(v)
      const sv = Math.sin(v)
      const x = w * Math.sign(cv) * Math.abs(cv) ** 0.55
      const z = (sv >= 0 ? t * 0.62 * Math.abs(sv) ** 0.75 : -t * 0.38 * Math.abs(sv) ** 0.35) + rocker(u) - t * 0.12
      pos.push(x, L * u - L / 2, z)
      // resin colour: teal spray fading up the deck from the tail, coral fade on the bottom nose
      c.copy(base)
      if (sv > 0.15) c.lerp(spray, Math.min(1, Math.max(0, (0.62 - u) / 0.3)) * 0.92)
      else if (sv < -0.15) c.lerp(bottomSpray, Math.max(0, (u - 0.6) / 0.4) * 0.8)
      else c.lerp(rail, 0.5)
      col.push(c.r, c.g, c.b)
    }
  }
  for (let i = 0; i < NU; i++)
    for (let j = 0; j < NV; j++) {
      const a = i * NV + j
      const b = i * NV + ((j + 1) % NV)
      const d = (i + 1) * NV + j
      const e = (i + 1) * NV + ((j + 1) % NV)
      idx.push(a, d, b, b, d, e)
    }
  // cap the squash tail
  const centre = pos.length / 3
  pos.push(0, -L / 2, rocker(0) - thick(0) * 0.12)
  col.push(base.r, base.g, base.b)
  for (let j = 0; j < NV; j++) idx.push(centre, (j + 1) % NV, j)
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

// A strip lying on the deck surface: x from xFrac0 to xFrac1 of the half-width, u from u0 to u1
function deckPatch(u0, u1, xFrac, lift, nu = 24, nx = 10) {
  const pos = []
  const uv = []
  const idx = []
  for (let i = 0; i <= nu; i++) {
    const u = u0 + ((u1 - u0) * i) / nu
    for (let j = 0; j <= nx; j++) {
      const f = -xFrac + (2 * xFrac * j) / nx
      pos.push(f * hw(u), L * u - L / 2, deckZ(u, f) + lift)
      uv.push(j / nx, i / nu)
    }
  }
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nx; j++) {
      const a = i * (nx + 1) + j
      idx.push(a, a + 1, a + nx + 1, a + 1, a + nx + 2, a + nx + 1)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function finGeometry(size = 1) {
  const s = new Shape()
  s.moveTo(0, 0)
  s.lineTo(0.11 * size, 0)
  s.quadraticCurveTo(0.075 * size, 0.05 * size, 0.022 * size, 0.115 * size)
  s.quadraticCurveTo(0.012 * size, 0.06 * size, 0, 0)
  const g = new ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 2 })
  g.translate(0, 0, -0.003)
  g.rotateX(-Math.PI / 2) // shape y → out of the bottom
  g.rotateZ(Math.PI / 2) // shape x → along the board
  return g
}

export function Surfboard(props) {
  const geo = useMemo(() => {
    const padTex = canvasTexture(64, 256, (g, w, h) => {
      g.fillStyle = '#2a2d31'
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#16181b'
      for (let y = 0; y < h; y += 10) g.fillRect(0, y, w, 4)
    })
    const logo = canvasTexture(128, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h)
      g.translate(w / 2, h / 2)
      g.rotate(-Math.PI / 2)
      g.fillStyle = '#1b2024'
      g.font = 'italic 900 56px Helvetica, Arial, sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText('SJ', -40, 0)
      g.font = 'bold 22px Helvetica, Arial, sans-serif'
      g.fillText('SURF CO.', 52, 2)
      g.strokeStyle = '#ff7a5c'
      g.lineWidth = 5
      g.beginPath()
      g.arc(-40, 30, 26, Math.PI * 1.15, Math.PI * 1.85)
      g.stroke()
    })
    return {
      logo,
      logoGeo: deckPatch(0.6, 0.74, 0.42, 0.0009, 12, 8),
      board: surfboardGeometry(),
      stringer: deckPatch(0.01, 0.985, 0.012, 0.0006, 80, 1),
      pad: deckPatch(0.012, 0.2, 0.86, 0.004, 20, 12),
      padTex,
      fin: finGeometry(1),
      sideFin: finGeometry(0.92),
    }
  }, [])
  const y = (u) => L * u - L / 2
  return (
    <group {...props}>
      <mesh geometry={geo.board} castShadow receiveShadow>
        <meshPhysicalMaterial vertexColors roughness={0.16} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={1.5} side={2} />
      </mesh>
      <mesh geometry={geo.logoGeo}>
        <meshPhysicalMaterial map={geo.logo} transparent roughness={0.2} clearcoat={1} depthWrite={false} />
      </mesh>
      <mesh geometry={geo.stringer}>
        <meshPhysicalMaterial color="#6b4a2e" roughness={0.3} clearcoat={1} />
      </mesh>
      <mesh geometry={geo.pad} castShadow>
        <meshStandardMaterial map={geo.padTex} bumpMap={geo.padTex} bumpScale={2} roughness={0.9} />
      </mesh>
      {/* leash plug */}
      <mesh position={[0, y(0.03), deckZ(0.03) - 0.002]}>
        <torusGeometry args={[0.012, 0.004, 8, 20]} />
        <meshPhysicalMaterial {...K.lacquer('#1b1d20')} />
      </mesh>
      {/* thruster fins: centre fin + two toed-in side fins */}
      <mesh geometry={geo.fin} position={[0, y(0.035), bottomZ(0.06) + 0.004]} castShadow>
        <meshPhysicalMaterial color="#24343a" roughness={0.15} clearcoat={1} transparent opacity={0.92} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={geo.sideFin} position={[side * 0.11, y(0.12), bottomZ(0.15) + 0.006]} rotation={[0, side * 0.12, side * -0.04]} castShadow>
          <meshPhysicalMaterial color="#24343a" roughness={0.15} clearcoat={1} transparent opacity={0.92} />
        </mesh>
      ))}
    </group>
  )
}

// ---------- tennis racket ----------
// Oval tube frame with an open throat, a 16 x 19 string bed, an octagonal wrapped grip and butt cap.
// Long axis = y (butt at y = 0), strings face ±z.
const HEAD_A = 0.125 // half-width of the head
const HEAD_B = 0.162 // half-length of the head
const HEAD_Y = 0.52 // head centre
const FRAME_R = 0.0095

export function TennisRacket(props) {
  const geo = useMemo(() => {
    const ring = Array.from({ length: 64 }, (_, i) => {
      const a = (i / 64) * Math.PI * 2
      return new Vector3(HEAD_A * Math.cos(a), HEAD_Y + HEAD_B * Math.sin(a), 0)
    })
    const head = new TubeGeometry(new CatmullRomCurve3(ring, true), 160, FRAME_R, 12, true)
    const throat = [-1, 1].map(
      (side) =>
        new TubeGeometry(
          new QuadraticBezierCurve3(
            new Vector3(side * HEAD_A * 0.62, HEAD_Y - HEAD_B * 0.78, 0),
            new Vector3(side * 0.035, 0.31, 0),
            new Vector3(side * 0.008, 0.25, 0)
          ),
          24,
          FRAME_R * 0.9,
          10
        )
    )
    const strings = []
    for (let i = 0; i < 16; i++) {
      const x = -HEAD_A * 0.88 + (HEAD_A * 1.76 * i) / 15
      const h = HEAD_B * Math.sqrt(Math.max(0, 1 - (x / HEAD_A) ** 2))
      strings.push({ x, y: HEAD_Y, len: 2 * h, vertical: true })
    }
    for (let i = 0; i < 19; i++) {
      const yy = -HEAD_B * 0.9 + (HEAD_B * 1.8 * i) / 18
      const w = HEAD_A * Math.sqrt(Math.max(0, 1 - (yy / HEAD_B) ** 2))
      strings.push({ x: 0, y: HEAD_Y + yy, len: 2 * w, vertical: false })
    }
    const grip = canvasTexture(
      64,
      256,
      (g, w, h) => {
        g.fillStyle = '#e9e6dc'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = '#9a978d'
        g.lineWidth = 3
        for (let y = -h; y < h * 2; y += 22) {
          g.beginPath()
          g.moveTo(0, y)
          g.lineTo(w, y + 26)
          g.stroke()
        }
      },
      { repeat: [1, 1] }
    )
    return { head, throat, strings, grip }
  }, [])
  const frame = <meshPhysicalMaterial {...K.lacquer('#16191d')} />
  return (
    <group {...props}>
      <mesh geometry={geo.head} castShadow>
        {frame}
      </mesh>
      {/* teal accent along the top of the head */}
      <mesh position={[0, HEAD_Y + HEAD_B, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[FRAME_R * 1.04, FRAME_R * 1.04, 0.12, 12]} />
        <meshPhysicalMaterial {...K.lacquer('#2bb3a3')} />
      </mesh>
      {geo.throat.map((g, i) => (
        <mesh key={i} geometry={g} castShadow>
          {frame}
        </mesh>
      ))}
      {/* string bed */}
      {geo.strings.map(({ x, y, len, vertical }, i) => (
        <mesh key={i} position={[x, y, vertical ? 0.0012 : -0.0012]} rotation-z={vertical ? 0 : Math.PI / 2}>
          <cylinderGeometry args={[0.0011, 0.0011, len, 4]} />
          <meshStandardMaterial color="#e8e2c8" roughness={0.5} />
        </mesh>
      ))}
      {/* shaft, wrapped grip, butt cap */}
      <mesh position={[0, 0.215, 0]}>
        <cylinderGeometry args={[0.012, 0.014, 0.08, 8]} />
        {frame}
      </mesh>
      <mesh position={[0, 0.09, 0]} castShadow>
        <cylinderGeometry args={[0.0165, 0.0165, 0.17, 8]} />
        <meshStandardMaterial map={geo.grip} bumpMap={geo.grip} bumpScale={1.5} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.0, 0]}>
        <cylinderGeometry args={[0.0185, 0.017, 0.012, 8]} />
        <meshPhysicalMaterial {...K.lacquer('#1b1e22')} />
      </mesh>
    </group>
  )
}

// ---------- dumbbell ----------
// Hex rubber heads with "10 KG" on the ends, steel collars, knurled chrome handle. Axis = x.
let knurl
function knurlTexture() {
  knurl ??= canvasTexture(
    64,
    64,
    (g, w, h) => {
      g.fillStyle = '#9a9a9a'
      g.fillRect(0, 0, w, h)
      g.strokeStyle = '#3a3a3a'
      g.lineWidth = 2
      for (let i = -w; i < w * 2; i += 8) {
        g.beginPath()
        g.moveTo(i, 0)
        g.lineTo(i + h, h)
        g.stroke()
        g.beginPath()
        g.moveTo(i, h)
        g.lineTo(i + h, 0)
        g.stroke()
      }
    },
    { repeat: [6, 2], srgb: false }
  )
  return knurl
}
let plate
function weightPlateTexture() {
  plate ??= canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#17181b'
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#d9d6cf'
    g.font = 'bold 34px Helvetica, Arial, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('10', w / 2, h / 2 - 12)
    g.font = 'bold 20px Helvetica, Arial, sans-serif'
    g.fillText('KG', w / 2, h / 2 + 20)
  })
  return plate
}

export function Dumbbell(props) {
  const knurled = knurlTexture()
  const label = weightPlateTexture()
  const R = 0.066
  const HEAD = 0.075
  const HANDLE = 0.13
  const rubber = { color: '#17181b', roughness: 0.55, sheen: 0.4, sheenColor: '#5a5f66', sheenRoughness: 0.6 }
  return (
    <group {...props}>
      <mesh rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.016, 0.016, HANDLE, 24]} />
        <meshPhysicalMaterial {...K.chrome('#c9d0d4')} roughness={0.28} bumpMap={knurled} bumpScale={3} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (HANDLE / 2 + HEAD / 2), 0, 0]}>
          <mesh rotation-z={Math.PI / 2} castShadow receiveShadow>
            <cylinderGeometry args={[R, R, HEAD, 6]} />
            <meshPhysicalMaterial {...rubber} />
          </mesh>
          <mesh position={[-side * (HEAD / 2 + 0.006), 0, 0]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.03, 0.03, 0.012, 24]} />
            <meshPhysicalMaterial {...K.steel()} />
          </mesh>
          <mesh position={[side * (HEAD / 2 + 0.0005), 0, 0]} rotation-y={(side * Math.PI) / 2}>
            <circleGeometry args={[R * 0.62, 6]} />
            <meshStandardMaterial map={label} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ---------- tennis ball ----------
let ballTex
function tennisBallTexture() {
  ballTex ??= canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = '#cfe33a'
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,200,0.25)' : 'rgba(80,100,0,0.2)'
      g.fillRect(Math.random() * w, Math.random() * h, 1, 1)
    }
    g.strokeStyle = '#f4f2e8'
    g.lineWidth = 5
    g.beginPath()
    for (let x = 0; x <= w; x += 2) {
      const y = h / 2 + Math.sin((x / w) * Math.PI * 4) * h * 0.27
      x ? g.lineTo(x, y) : g.moveTo(x, y)
    }
    g.stroke()
  })
  return ballTex
}

export function TennisBall(props) {
  const map = tennisBallTexture()
  return (
    <mesh castShadow {...props}>
      <sphereGeometry args={[0.033, 24, 16]} />
      <meshPhysicalMaterial map={map} roughness={0.95} sheen={1} sheenColor="#f2ff9a" sheenRoughness={0.8} />
    </mesh>
  )
}
