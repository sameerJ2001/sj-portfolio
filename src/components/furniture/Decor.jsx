import { Suspense, useMemo, useRef } from 'react'
import { AdditiveBlending, CanvasTexture, ExtrudeGeometry, Path, Shape, SRGBColorSpace } from 'three'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../../store'
import { UP, WALL_H } from '../../data/zones'
import { C, PAINT, makeBrickTexture, makeConcreteTexture, makeNeonSignTexture, makePaintingTexture, makeSplatterTexture } from './materials'
import CeilingFan from './CeilingFan'
import VoxelModel from '../VoxelModel'

// Non-clickable set dressing, laid out to match the reference room.
// Upstairs (desk wing): twin spinning cooling rotors, bookshelf over the desk. (The arcades are zones: Arcade.jsx.)
// Upstairs (bed wing): wall AC unit, and the ceiling fan over the corner by the photo wall.
// Downstairs: brick, the katakana neon sign + tube + wooden slats, bar with stools, the art corner
// (around the easel zone), orange alcove, boilers, crates. Plus papers and soda cans littering the floors.
// Where the ceiling fan hangs: in front of the arcades and photo wall, close enough to the desk that
// its blade shadows sweep across SJ (like the reference video)
const FAN = { x: -2.1, z: -1.95 }

export default function Decor() {
  return (
    <group>
      {/* ---- desk wing, against the left wall (pieces face +x) ---- */}
      <group position={[-3.55, UP, 3.2]} rotation-y={Math.PI / 2}>
        <TwinFans />
      </group>
      <group position={[-3.84, UP, 1.2]} rotation-y={Math.PI / 2}>
        <Bookshelf />
      </group>

      {/* ---- bed wing ---- */}
      <group position={[3.5, UP, -3.72]}>
        <WallAC />
      </group>
      <group position={[FAN.x, WALL_H, FAN.z]}>
        <CeilingFan wall={-4 - FAN.z} drop={WALL_H - UP} />
      </group>

      {/* ---- ground floor, under the desk wing ---- */}
      <NeonWall />
      <group position={[-2.45, 0, -0.95]}>
        <Bar />
      </group>

      {/* ---- ground floor, under the bed wing (along the back wall) ---- */}
      <ArtCorner />
      <Alcove />
      <group position={[3.25, 0, -3.5]}>
        <Boilers />
      </group>

      <Clutter />

      {/* ---- a loose crate on the open floor ---- */}
      <Crate position={[1.5, 0, 3.5]} rotation-y={0.08} />
    </group>
  )
}

// Lived-in mess, like the reference: papers and empty soda cans on the floors.
// [x, y, z, rotationY] in world space; cans with `lying` are tipped over.
const PAPERS = [
  [-2.3, UP, 2.2, 0.4], [-2.0, UP, 1.6, -0.3], [-2.55, UP, 0.5, 1.1], [-1.95, UP, -0.2, 0.2], [-2.7, UP, 2.7, -0.8],
  [1.4, UP, -2.06, 0.1], [1.85, UP, -2.0, -0.4], [2.3, UP, -2.08, 0.7], [2.6, UP, -2.02, 0.2],
  [-2.9, 0, 2.4, 0.5], [-2.5, 0, 1.7, -0.6], [-2.6, 0, 3.3, 0.2], [-3.0, 0, 0.5, 1.2],
]
const CANS = [
  [-2.15, UP, 1.95, 0.6, true], [-2.7, UP, 0.3, -1.2, true], [-1.95, UP, 0.4, 0, false],
  [-2.7, 0, 2.0, 0.9, true], [-2.35, 0, 2.7, -0.4, true],
]
function Clutter() {
  return (
    <group>
      {PAPERS.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y + 0.006, z]} rotation={[-Math.PI / 2, 0, r]} receiveShadow>
          <planeGeometry args={[0.14 + (i % 3) * 0.03, 0.1 + (i % 2) * 0.03]} />
          <meshStandardMaterial color={i % 4 === 3 ? '#d8c98a' : '#e4e1d8'} roughness={0.9} />
        </mesh>
      ))}
      {CANS.map(([x, y, z, r, lying], i) => (
        <group key={i} position={[x, y + (lying ? 0.034 : 0.06), z]} rotation={[0, r, lying ? Math.PI / 2 : 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.033, 0.033, 0.12, 12]} />
            <meshStandardMaterial color="#c8282e" metalness={0.5} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.061, 0]}>
            <cylinderGeometry args={[0.03, 0.033, 0.006, 12]} />
            <meshStandardMaterial color="#c9c9cf" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// Dark storage crate with glowing red strips: your MagicaVoxel model (voxel/crate.vox), plus a soft
// red glow on the floor around it. Used for the loose crate and the gear crates (GearCorner).
export function Crate(props) {
  const spill = useMemo(redSpillTexture, [])
  return (
    <group {...props}>
      <Suspense fallback={null}>
        <VoxelModel name="crate" />
      </Suspense>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 0]}>
        <planeGeometry args={[1.7, 1.35]} />
        <meshBasicMaterial map={spill} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

let spillTexture
function redSpillTexture() {
  if (spillTexture) return spillTexture
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(64, 64, 10, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,30,40,0.55)')
  grad.addColorStop(0.5, 'rgba(255,20,30,0.2)')
  grad.addColorStop(1, 'rgba(255,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  spillTexture = new CanvasTexture(c)
  spillTexture.colorSpace = SRGBColorSpace
  return spillTexture
}

// Two big stacked industrial cooling units beside the desk, like the reference: grey metal housings
// with an inset frame and corner bolts, and a turbine-style rotor of radial fins spinning in each.
// Local: wall behind (-z), rotors face +z.
const FINS = 20
function TwinFans() {
  const rotors = useRef([])
  useFrame((_, dt) => rotors.current.forEach((r, i) => r && (r.rotation.z -= dt * (i ? 1.5 : 1.9))))
  const S = 1.15
  const housing = { color: '#7b8789', metalness: 0.45, roughness: 0.5 }
  const fin = { color: '#b3bcbe', metalness: 0.5, roughness: 0.4 }
  // front plate with the round opening the rotor sits in
  const plate = useMemo(() => {
    const sh = new Shape()
    sh.moveTo(-S / 2, -S / 2)
    sh.lineTo(S / 2, -S / 2)
    sh.lineTo(S / 2, S / 2)
    sh.lineTo(-S / 2, S / 2)
    const hole = new Path()
    hole.absarc(0, 0, 0.47, 0, Math.PI * 2, true)
    sh.holes.push(hole)
    return new ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false, curveSegments: 32 })
  }, [])

  return (
    <group>
      {[0, 1].map((i) => (
        <group key={i} position={[0, S / 2 + i * (S + 0.03), 0]}>
          <mesh position={[0, 0, -0.1]} castShadow receiveShadow>
            <boxGeometry args={[S, S, 0.65]} />
            <meshStandardMaterial {...housing} />
          </mesh>
          <mesh geometry={plate} position={[0, 0, 0.225]} castShadow receiveShadow>
            <meshStandardMaterial {...housing} />
          </mesh>
          {/* raised inset frame + corner bolts on the face */}
          {[
            [0, S / 2 - 0.05, S - 0.06, 0.05],
            [0, -S / 2 + 0.05, S - 0.06, 0.05],
            [S / 2 - 0.05, 0, 0.05, S - 0.06],
            [-S / 2 + 0.05, 0, 0.05, S - 0.06],
          ].map(([x, y, w, h], k) => (
            <mesh key={k} position={[x, y, 0.435]}>
              <boxGeometry args={[w, h, 0.03]} />
              <meshStandardMaterial color="#68797b" metalness={0.45} roughness={0.5} />
            </mesh>
          ))}
          {[-1, 1].flatMap((x) => [-1, 1].map((y) => [x, y])).map(([x, y]) => (
            <mesh key={`${x}${y}`} position={[x * (S / 2 - 0.12), y * (S / 2 - 0.12), 0.43]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.025, 0.025, 0.03, 8]} />
              <meshStandardMaterial color="#3a4244" metalness={0.6} />
            </mesh>
          ))}
          {/* recessed well */}
          <mesh position={[0, 0, 0.428]}>
            <ringGeometry args={[0.44, 0.5, 40]} />
            <meshStandardMaterial color="#3c4547" side={2} />
          </mesh>
          <mesh position={[0, 0, 0.228]}>
            <circleGeometry args={[0.47, 40]} />
            <meshStandardMaterial color="#141819" />
          </mesh>
          {/* rotor: radial fins, each pitched like a turbine blade */}
          <group ref={(g) => (rotors.current[i] = g)} position={[0, 0, 0.32]}>
            {Array.from({ length: FINS }).map((_, k) => (
              <group key={k} rotation-z={(k / FINS) * Math.PI * 2}>
                <mesh position={[0, 0.29, 0]} rotation-y={0.55} castShadow>
                  <boxGeometry args={[0.07, 0.28, 0.012]} />
                  <meshStandardMaterial {...fin} />
                </mesh>
              </group>
            ))}
            <mesh rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.15, 0.15, 0.05, 24]} />
              <meshStandardMaterial color="#8d989a" metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0, 0.03]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.07, 0.09, 0.04, 20]} />
              <meshStandardMaterial color="#4a5355" metalness={0.6} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}

// Two wall shelves of books above the desk. Local: wall at -z, x runs along the wall.
const BOOK_COLORS = ['#3d6fd8', '#e8664a', '#2bb39a', '#e8b923', '#9b5cff', '#e6e6ee', '#3e2a22', '#ff3ea5']
function Bookshelf() {
  const books = useMemo(() => {
    let s = 11
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
    const out = []
    for (const shelf of [0, 1]) {
      let x = -0.78
      while (x < 0.72) {
        const w = 0.05 + rnd() * 0.05
        const h = 0.2 + rnd() * 0.12
        out.push({ shelf, x: x + w / 2, w, h, color: BOOK_COLORS[Math.floor(rnd() * BOOK_COLORS.length)] })
        x += w + 0.008 + (rnd() < 0.1 ? 0.12 : 0)
      }
    }
    return out
  }, [])

  return (
    <group>
      {[1.8, 2.24].map((y) => (
        <mesh key={y} position={[0, y, 0.15]} castShadow>
          <boxGeometry args={[1.7, 0.04, 0.32]} />
          <meshStandardMaterial color={C.metal} />
        </mesh>
      ))}
      {books.map((b, i) => (
        <mesh key={i} position={[b.x, [1.82, 2.26][b.shelf] + b.h / 2, 0.15]} castShadow>
          <boxGeometry args={[b.w, b.h, 0.22]} />
          <meshStandardMaterial color={b.color} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

// Wall-mounted AC / vent unit at the right end of the bed wing. Faces +z.
function WallAC() {
  return (
    <group>
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[0.8, 1.6, 0.5]} />
        <meshStandardMaterial color={C.metal} metalness={0.3} />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[0, 0.55 + i * 0.13, 0.255]}>
          <boxGeometry args={[0.62, 0.04, 0.02]} />
          <meshStandardMaterial color={C.metalDark} />
        </mesh>
      ))}
    </group>
  )
}

// Left wall under the desk wing: old brick behind the kitchen, then a dark panel with the framed pink
// neon sign ("SJ" in katakana, エス / ジェイ) above the bar, a cyan tube light and wooden slats.
function NeonWall() {
  const sign = useMemo(() => makeNeonSignTexture(['エス', 'ジェイ'], C.pink), [])
  const brick = useMemo(makeBrickTexture, [])

  return (
    <group position={[-3.99, 0, 0]} rotation-y={Math.PI / 2}>
      {/* brick behind the kitchen */}
      <mesh position={[-2.45, (UP - 0.4) / 2, 0.004]} receiveShadow>
        <planeGeometry args={[2.9, UP - 0.4]} />
        <meshStandardMaterial map={brick} roughness={0.95} />
      </mesh>
      {/* dark panel behind the sign, between the fridge and the bar (like the reference) */}
      <mesh position={[-0.15, (UP - 0.4) / 2, 0.006]} receiveShadow>
        <planeGeometry args={[1.5, UP - 0.4]} />
        <meshStandardMaterial color="#17161c" roughness={0.9} />
      </mesh>
      <mesh position={[-0.25, 0.95, 0.012]}>
        <planeGeometry args={[0.48, 0.6]} />
        <meshBasicMaterial map={sign} transparent color={[2.2, 2.2, 2.2]} toneMapped={false} depthWrite={false} />
      </mesh>
      <pointLight position={[-0.25, 0.95, 0.5]} color={C.pink} intensity={2.5} distance={3} />

      {/* vertical cyan tube */}
      <mesh position={[0.4, 1.3, 0.06]}>
        <boxGeometry args={[0.05, 2.2, 0.05]} />
        <meshBasicMaterial color={C.cyan} toneMapped={false} />
      </mesh>

      {/* wooden slats from the tube back toward the corner */}
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[0.7 + i * 0.17, (UP - 0.4) / 2, 0.06]} castShadow>
          <boxGeometry args={[0.11, UP - 0.4, 0.08]} />
          <meshStandardMaterial color={i % 2 ? C.wood : '#5a3a2c'} />
        </mesh>
      ))}
    </group>
  )
}

// Long dark bar counter sticking out from the left wall, with three pink-topped stools on its front.
function Bar() {
  return (
    <group>
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.96, 0.6]} />
        <meshStandardMaterial color="#1d1b24" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.99, 0.02]} castShadow>
        <boxGeometry args={[2.6, 0.06, 0.7]} />
        <meshStandardMaterial color="#2b2834" roughness={0.3} metalness={0.3} />
      </mesh>
      {/* red glow strips on the front */}
      {[-1.0, 1.0].map((x) => (
        <mesh key={x} position={[x, 0.45, 0.305]}>
          <planeGeometry args={[0.03, 0.5]} />
          <meshBasicMaterial color="#ff2a3c" toneMapped={false} />
        </mesh>
      ))}
      {/* glasses + a little plant */}
      {[-0.6, -0.35, 0.5].map((x) => (
        <mesh key={x} position={[x, 1.07, 0]}>
          <cylinderGeometry args={[0.04, 0.035, 0.1, 10]} />
          <meshStandardMaterial color="#cfe8ff" transparent opacity={0.6} />
        </mesh>
      ))}
      <mesh position={[-1.0, 1.1, -0.1]}>
        <cylinderGeometry args={[0.07, 0.06, 0.16, 10]} />
        <meshStandardMaterial color="#3a2a22" />
      </mesh>
      <mesh position={[-1.0, 1.32, -0.1]}>
        <coneGeometry args={[0.14, 0.32, 6]} />
        <meshStandardMaterial color="#2f6b45" />
      </mesh>

      {/* stools */}
      {[-0.75, 0, 0.75].map((x) => (
        <group key={x} position={[x, 0, 0.62]}>
          <mesh position={[0, 0.66, 0]} castShadow>
            <boxGeometry args={[0.4, 0.06, 0.34]} />
            <meshStandardMaterial color="#ff7ad1" emissive="#a0306f" emissiveIntensity={0.3} />
          </mesh>
          {[
            [-0.15, -0.12],
            [0.15, -0.12],
            [-0.15, 0.12],
            [0.15, 0.12],
          ].map(([lx, lz]) => (
            <mesh key={`${lx}${lz}`} position={[lx, 0.32, lz]}>
              <boxGeometry args={[0.035, 0.64, 0.035]} />
              <meshStandardMaterial color={C.metal} />
            </mesh>
          ))}
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[0.32, 0.03, 0.26]} />
            <meshStandardMaterial color={C.metal} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// SJ's art corner, under the back deck (where the bathroom used to be): a concrete side wall, paintings
// on the walls, a splattered drop cloth under the easel (the easel itself is the clickable 'easel'
// zone), a paint cart with tubes, brushes and a palette, canvases leaning on the wall, a stool,
// paint tins, splashes on the floor and wall, and a warm work light.
const STUDIO_X = -1.6 // the side wall
const STUDIO_Z = -1.9 // how far the side wall comes out from the back wall
const WALL_ART = [
  // [x, y, width, height, style, seed] on the back wall
  [-1.1, 1.55, 0.58, 0.74, 'abstract', 3],
  [-0.28, 1.4, 0.8, 0.6, 'mountains', 5],
  [0.48, 1.8, 0.44, 0.54, 'sunset', 9],
]
const FLOOR_SPLATS = [
  // [x, z, size, seed]
  [0.25, -2.0, 0.6, 21],
  [-1.15, -2.2, 0.5, 4],
  [0.55, -3.0, 0.45, 13],
  [-0.9, -3.6, 0.4, 30],
]

function ArtCorner() {
  const H = UP - 0.4
  const wallLen = STUDIO_Z + 4
  const concrete = useMemo(makeConcreteTexture, [])
  const art = useMemo(() => WALL_ART.map(([, , w, h, style, seed]) => makePaintingTexture(seed, style, 256, Math.round((256 * h) / w))), [])
  const side = useMemo(() => makePaintingTexture(17, 'abstract', 256, 200), [])
  const leaning = useMemo(() => [makePaintingTexture(11, 'mountains', 200, 256), makePaintingTexture(2, 'abstract', 220, 256)], [])
  const cloth = useMemo(() => makeSplatterTexture(8, 26), [])
  const wallSplat = useMemo(() => makeSplatterTexture(41, 14, true), [])
  const floor = useMemo(() => FLOOR_SPLATS.map(([, , , seed]) => makeSplatterTexture(seed, 5)), [])
  const lightsOn = useStore((s) => s.lightsOn)

  return (
    <group>
      {/* concrete side wall */}
      <mesh position={[STUDIO_X, H / 2, -4 + wallLen / 2]} castShadow receiveShadow>
        <boxGeometry args={[0.1, H, wallLen]} />
        <meshStandardMaterial map={concrete} color="#6b6e70" roughness={0.95} />
      </mesh>

      {/* paintings on the back wall, plus one on the side wall */}
      {WALL_ART.map(([x, y, w, h], i) => (
        <group key={i} position={[x, y, -3.97]}>
          <mesh castShadow>
            <boxGeometry args={[w + 0.06, h + 0.06, 0.04]} />
            <meshStandardMaterial color={i % 2 ? '#2a2420' : '#d9cbb0'} />
          </mesh>
          <mesh position={[0, 0, 0.021]}>
            <planeGeometry args={[w, h]} />
            <meshStandardMaterial map={art[i]} roughness={0.8} />
          </mesh>
        </group>
      ))}
      <group position={[STUDIO_X + 0.07, 1.5, -3.0]} rotation-y={Math.PI / 2}>
        <mesh castShadow>
          <boxGeometry args={[0.76, 0.6, 0.04]} />
          <meshStandardMaterial color="#d9cbb0" />
        </mesh>
        <mesh position={[0, 0, 0.021]}>
          <planeGeometry args={[0.7, 0.54]} />
          <meshStandardMaterial map={side} roughness={0.8} />
        </mesh>
      </group>

      {/* paint flicked up the back wall behind the easel */}
      <mesh position={[-0.5, 0.75, -3.985]}>
        <planeGeometry args={[1.6, 1.3]} />
        <meshStandardMaterial map={wallSplat} transparent depthWrite={false} roughness={0.6} />
      </mesh>

      {/* splattered drop cloth under the easel, and loose splashes on the concrete */}
      <mesh rotation={[-Math.PI / 2, 0, 0.12]} position={[-0.4, 0.006, -2.9]} receiveShadow>
        <planeGeometry args={[2.0, 1.6]} />
        <meshStandardMaterial color="#d8d2c4" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0.12]} position={[-0.4, 0.008, -2.9]}>
        <planeGeometry args={[2.0, 1.6]} />
        <meshStandardMaterial map={cloth} transparent depthWrite={false} roughness={0.6} />
      </mesh>
      {FLOOR_SPLATS.map(([x, z, size], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, i]} position={[x, 0.01, z]}>
          <planeGeometry args={[size, size]} />
          <meshStandardMaterial map={floor[i]} transparent depthWrite={false} roughness={0.5} />
        </mesh>
      ))}

      {/* canvases leaning on the side wall */}
      {[
        [-2.55, 0.6, 0.78, 0.18],
        [-2.2, 0.5, 0.65, 0.24],
      ].map(([z, w, h, lean], i) => (
        <group key={i} position={[STUDIO_X + 0.1, h / 2 + 0.01, z]} rotation={[0, Math.PI / 2, 0]}>
          <group rotation-x={-lean}>
            <mesh castShadow>
              <boxGeometry args={[w, h, 0.03]} />
              <meshStandardMaterial color="#c9b896" />
            </mesh>
            <mesh position={[0, 0, 0.016]}>
              <planeGeometry args={[w - 0.04, h - 0.04]} />
              <meshStandardMaterial map={leaning[i]} roughness={0.8} />
            </mesh>
          </group>
        </group>
      ))}

      {/* paint cart: tubes, a jar of brushes, a palette with blobs */}
      <group position={[0.38, 0, -3.25]} rotation-y={-0.3}>
        {[0.78, 0.42].map((y) => (
          <mesh key={y} position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.55, 0.03, 0.4]} />
            <meshStandardMaterial color="#9aa3a6" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
        {[-0.25, 0.25].flatMap((x) => [-0.17, 0.17].map((z) => [x, z])).map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 0.4, z]}>
            <cylinderGeometry args={[0.012, 0.012, 0.8, 6]} />
            <meshStandardMaterial color="#6b7577" metalness={0.6} />
          </mesh>
        ))}
        {PAINT.slice(0, 6).map((col, i) => (
          <mesh key={col} position={[-0.18 + i * 0.07, 0.81, 0.1]} rotation={[0, 0.2 * i, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.016, 0.016, 0.1, 8]} />
            <meshStandardMaterial color={col} roughness={0.5} />
          </mesh>
        ))}
        <mesh position={[0.17, 0.86, -0.1]} castShadow>
          <cylinderGeometry args={[0.045, 0.04, 0.12, 12]} />
          <meshStandardMaterial color="#b8d0dc" transparent opacity={0.7} roughness={0.1} />
        </mesh>
        {[-0.02, 0.015, 0.03].map((dx, i) => (
          <mesh key={dx} position={[0.17 + dx, 0.97, -0.1]} rotation-z={dx * 6}>
            <cylinderGeometry args={[0.006, 0.006, 0.22, 6]} />
            <meshStandardMaterial color={['#8a5a3a', '#c9a43a', '#2b2b2b'][i]} />
          </mesh>
        ))}
        <mesh position={[-0.08, 0.797, -0.08]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.12, 20]} />
          <meshStandardMaterial color="#d9b48a" />
        </mesh>
        {PAINT.slice(0, 5).map((col, i) => (
          <mesh key={col} position={[-0.08 + Math.cos(i * 1.2) * 0.07, 0.8, -0.08 + Math.sin(i * 1.2) * 0.07]}>
            <sphereGeometry args={[0.018, 8, 6]} />
            <meshStandardMaterial color={col} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* paint tins with drips, and a stool */}
      {[
        [0.85, -2.55, PAINT[1]],
        [0.95, -2.3, PAINT[4]],
      ].map(([x, z, col]) => (
        <group key={x} position={[x, 0, z]}>
          <mesh position={[0, 0.09, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.18, 14]} />
            <meshStandardMaterial color="#b9c0c4" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.181, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.004, 14]} />
            <meshStandardMaterial color={col} />
          </mesh>
          <mesh position={[0.081, 0.13, 0]}>
            <boxGeometry args={[0.004, 0.08, 0.03]} />
            <meshStandardMaterial color={col} />
          </mesh>
        </group>
      ))}
      <group position={[0.15, 0, -1.95]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.17, 0.17, 0.04, 16]} />
          <meshStandardMaterial color={C.wood} />
        </mesh>
        {[0, 1, 2].map((k) => (
          <mesh key={k} position={[Math.cos(k * 2.1) * 0.11, 0.27, Math.sin(k * 2.1) * 0.11]} rotation={[Math.sin(k * 2.1) * 0.15, 0, -Math.cos(k * 2.1) * 0.15]}>
            <cylinderGeometry args={[0.015, 0.015, 0.55, 6]} />
            <meshStandardMaterial color={C.woodDark} />
          </mesh>
        ))}
      </group>

      {/* warm work light hanging under the back deck */}
      <mesh position={[-0.2, UP - 0.62, -2.1]}>
        <cylinderGeometry args={[0.06, 0.14, 0.12, 14, 1, true]} />
        <meshStandardMaterial color="#2a2830" side={2} />
      </mesh>
      <mesh position={[-0.2, UP - 0.52, -2.1]}>
        <cylinderGeometry args={[0.006, 0.006, 0.2, 6]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[-0.2, UP - 0.66, -2.1]}>
        <sphereGeometry args={[0.04, 10, 8]} />
        <meshBasicMaterial color={lightsOn ? '#fff1d6' : '#555'} toneMapped={false} />
      </mesh>
      {lightsOn && <pointLight position={[-0.2, UP - 0.75, -2.1]} color="#ffe2b8" intensity={3} distance={4} />}
    </group>
  )
}

// Warm orange-lit recess in the back wall (the reference's glowing corridor). The easel stands in it.
function Alcove() {
  const lightsOn = useStore((s) => s.lightsOn)
  const x0 = 0.85
  const x1 = 2.6
  const w = x1 - x0
  const cx = (x0 + x1) / 2
  const H = UP - 0.4

  return (
    <group>
      {/* glowing back panel */}
      <mesh position={[cx, H / 2, -3.99]}>
        <planeGeometry args={[w, H]} />
        <meshStandardMaterial color="#d9772b" emissive="#ff8a2a" emissiveIntensity={lightsOn ? 0.9 : 0.35} />
      </mesh>
      {/* side returns */}
      {[x0, x1].map((x) => (
        <mesh key={x} position={[x, H / 2, -3.7]} castShadow>
          <boxGeometry args={[0.12, H, 0.6]} />
          <meshStandardMaterial color={C.metalDark} />
        </mesh>
      ))}
      {/* floor slats */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[cx, 0.012, -3.85 + i * 0.32]} receiveShadow>
          <boxGeometry args={[w - 0.15, 0.02, 0.22]} />
          <meshStandardMaterial color="#3a2418" />
        </mesh>
      ))}
      {/* small yellow strip light at the top of the recess */}
      <mesh position={[cx, H - 0.12, -3.97]}>
        <planeGeometry args={[0.5, 0.06]} />
        <meshBasicMaterial color="#ffd86b" toneMapped={false} />
      </mesh>
      <pointLight position={[cx, 1.6, -3.0]} color="#ff9a3c" intensity={lightsOn ? 6 : 3} distance={4.5} />
    </group>
  )
}

// Two tall boiler tanks with pipes, in the back-right corner under the bed wing.
function Boilers() {
  const metal = { color: '#6f8a8f', metalness: 0.55, roughness: 0.45 }
  return (
    <group>
      {[-0.32, 0.36].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 1.25, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 2.3, 18]} />
            <meshStandardMaterial {...metal} />
          </mesh>
          {[0.5, 1.25, 2.0].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <cylinderGeometry args={[0.315, 0.315, 0.05, 18]} />
              <meshStandardMaterial color={C.metalDark} />
            </mesh>
          ))}
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.25, 0.28, 0.1, 18]} />
            <meshStandardMaterial color={C.metalDark} />
          </mesh>
        </group>
      ))}
      {/* pipes climbing to the deck */}
      {[-0.65, 0.68].map((x) => (
        <mesh key={x} position={[x, (UP - 0.4) / 2, -0.25]}>
          <cylinderGeometry args={[0.05, 0.05, UP - 0.4, 8]} />
          <meshStandardMaterial {...metal} />
        </mesh>
      ))}
    </group>
  )
}
