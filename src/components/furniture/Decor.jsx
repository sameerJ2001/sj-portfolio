import { Suspense, useMemo, useRef } from 'react'
import { RoundedBox } from '@react-three/drei'
import { AdditiveBlending, CanvasTexture, ExtrudeGeometry, MeshPhysicalMaterial, Path, Shape, SRGBColorSpace } from 'three'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../../store'
import { UP, WALL_H } from '../../data/zones'
import { C, PAINT, makeBrickTexture, makeNeonSignTexture, makePaintingTexture, makeSplatterTexture, makeStoneTexture, makeWallTexture } from './materials'
import CeilingFan from './CeilingFan'
import VoxelModel from '../VoxelModel'
import Pipe from './Pipe'

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
      <UpperBrick />
      <group position={[-3.55, UP, 3.2]} rotation-y={Math.PI / 2}>
        <TwinFans />
      </group>
      <group position={[-3.84, UP, 1.2]} rotation-y={Math.PI / 2}>
        <Bookshelf />
      </group>

      <ArcadeNookLight />

      {/* ---- bed wing ---- */}
      <group position={[3.5, UP, -3.72]}>
        <WallAC />
      </group>
      {/* the same stacked conduits along the base of the back wall, under the photo wall */}
      <group position={[-1.95, UP, -3.72]}>
        <Conduits length={2.1} />
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
      <group position={[3.15, 0, -3.5]}>
        <Boilers />
      </group>
      <group position={[3.2, 0, -2.5]}>
        <Workbench />
      </group>
      <Crate position={[3.25, 0, -1.68]} rotation-y={-0.06} />

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
const FINS = 22
function TwinFans() {
  const rotors = useRef([])
  useFrame((_, dt) => rotors.current.forEach((r, i) => r && (r.rotation.z -= dt * (i ? 1.5 : 1.9))))
  const S = 1.15
  const housing = { color: '#4d6366', metalness: 0.35, roughness: 0.42 }
  const fin = { color: '#8e999b', metalness: 0.3, roughness: 0.5 }
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
              <meshStandardMaterial color="#43585b" metalness={0.35} roughness={0.45} />
            </mesh>
          ))}
          {[-1, 1].flatMap((x) => [-1, 1].map((y) => [x, y])).map(([x, y]) => (
            <mesh key={`${x}${y}`} position={[x * (S / 2 - 0.12), y * (S / 2 - 0.12), 0.43]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.025, 0.025, 0.03, 8]} />
              <meshStandardMaterial color="#3a4244" metalness={0.6} />
            </mesh>
          ))}
          {/* embossed panel on the side that faces the room's front */}
          <RoundedBox args={[0.02, S - 0.3, 0.42]} radius={0.008} smoothness={2} position={[-S / 2 - 0.005, 0, -0.12]}>
            <meshStandardMaterial {...housing} color="#577073" />
          </RoundedBox>
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
                <mesh position={[0, 0.31, 0]} rotation-y={0.25} castShadow>
                  <boxGeometry args={[0.075, 0.27, 0.025]} />
                  <meshStandardMaterial {...fin} />
                </mesh>
              </group>
            ))}
            <mesh rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.17, 0.17, 0.04, 28]} />
              <meshStandardMaterial color="#7d888a" metalness={0.3} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0.022]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.12, 0.12, 0.012, 24]} />
              <meshStandardMaterial color="#1a2022" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0, 0.045]}>
              <boxGeometry args={[0.07, 0.07, 0.05]} />
              <meshStandardMaterial color="#2c3436" roughness={0.6} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}

// Two wall shelves of books above the desk. Local: wall at -z, x runs along the wall.
const BOOK_COLORS = ['#3d6a9a', '#3f7a4f', '#8a3a3a', '#b9b6aa', '#5a5f8a', '#a38a4a', '#2f4f6a', '#6f8f4a', '#8f6a8a']
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
      {[1.9, 2.34].map((y) => (
        <group key={y}>
          <RoundedBox args={[1.74, 0.05, 0.34]} radius={0.012} smoothness={2} position={[0, y, 0.16]} castShadow receiveShadow>
            <meshStandardMaterial color="#a9b8ba" roughness={0.28} metalness={0.35} />
          </RoundedBox>
          {[-0.75, 0.75].map((x) => (
            <mesh key={x} position={[x, y - 0.07, 0.06]} castShadow>
              <boxGeometry args={[0.03, 0.12, 0.12]} />
              <meshStandardMaterial color="#4a5457" roughness={0.6} metalness={0.3} />
            </mesh>
          ))}
        </group>
      ))}
      {/* end uprights, and a teal storage box lying on the top shelf */}
      {[-0.86, 0.86].map((x) => (
        <RoundedBox key={x} args={[0.03, 0.62, 0.3]} radius={0.008} smoothness={2} position={[x, 2.12, 0.16]} castShadow>
          <meshStandardMaterial color="#8d9c9e" roughness={0.35} metalness={0.35} />
        </RoundedBox>
      ))}
      <RoundedBox args={[0.34, 0.1, 0.24]} radius={0.015} smoothness={2} position={[0.55, 2.36 + 0.075, 0.15]} rotation-y={0.08} castShadow>
        <meshStandardMaterial color="#3f7f8a" roughness={0.5} />
      </RoundedBox>
      {books.map((b, i) => (
        <mesh key={i} position={[b.x, [1.92, 2.36][b.shelf] + b.h / 2, 0.15]} castShadow>
          <boxGeometry args={[b.w, b.h, 0.22]} />
          <meshStandardMaterial color={b.color} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

// The arcade nook's frame, like the reference: a metal post at its open end and a cyan LED strip
// along the underside of the duct above the cabinets, washing them in cool light.
function ArcadeNookLight() {
  const z0 = -3.95
  const z1 = -1.32
  return (
    <group>
      <RoundedBox args={[0.12, WALL_H - 0.6 - UP, 0.12]} radius={0.02} smoothness={2} position={[-3.3, (UP + WALL_H - 0.6) / 2, z1]} castShadow>
        <meshStandardMaterial color="#56686b" roughness={0.45} metalness={0.35} />
      </RoundedBox>
      <mesh position={[-3.34, WALL_H - 0.62, (z0 + z1) / 2]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.018, 0.018, z1 - z0, 10]} />
        <meshBasicMaterial color={[0.5, 2.6, 2.8]} toneMapped={false} />
      </mesh>
      <pointLight position={[-3.1, WALL_H - 0.9, -2.45]} color="#3ee8ff" intensity={2.6} distance={3.4} />
    </group>
  )
}

// Old dark brick on the left wall behind the desk deck (rotors, desk, bookshelf), like the reference.
function UpperBrick() {
  const brick = useMemo(() => {
    const t = makeBrickTexture()
    t.repeat.set(4.5, 2)
    return t
  }, [])
  return (
    <mesh position={[-3.995, UP + 1.25, 1.8]} rotation-y={Math.PI / 2} receiveShadow>
      <planeGeometry args={[4.4, 2.5]} />
      <meshStandardMaterial map={brick} color="#4a3e3c" roughness={0.95} />
    </mesh>
  )
}

// Industrial AC unit at the right end of the back deck, like the reference: a tall teal-grey box
// with a ribbed roof sloping to the front, a vent grille streaked with drips, a side service panel,
// standing on two stacked rounded conduits with collar bands that run along the wall to the edge.
// Local: back against the wall (-z), faces +z; y = 0 is the deck.
const AC_W = 0.72
const AC_D = 0.42
const AC_Z = -0.07 // body centre (back face on the wall)
const AC_BASE = 0.24
const AC_H = 1.18
function acRoofGeometry() {
  const s = new Shape()
  ;[[-0.24, 0], [0.24, 0], [0.24, 0.035], [-0.24, 0.18]].forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)))
  const g = new ExtrudeGeometry(s, { depth: AC_W + 0.06, bevelEnabled: false })
  g.rotateY(-Math.PI / 2)
  g.translate((AC_W + 0.06) / 2, 0, 0)
  return g
}
function WallAC() {
  const roof = useMemo(acRoofGeometry, [])
  const body = { color: '#4a6165', metalness: 0.45, roughness: 0.42 }
  const trim = { color: '#5d7a80', metalness: 0.45, roughness: 0.4 }
  const dark = { color: '#141a1c', roughness: 0.6 }
  const top = AC_BASE + AC_H
  return (
    <group>
      <Conduits length={1.04} x={0.02} />

      {/* body */}
      <RoundedBox args={[AC_W, AC_H, AC_D]} radius={0.025} smoothness={2} position={[0, AC_BASE + AC_H / 2, AC_Z]} castShadow receiveShadow>
        <meshStandardMaterial {...body} />
      </RoundedBox>

      {/* ribbed roof sloping down to the front, overhanging a little */}
      <group position={[0, top, AC_Z]}>
        <mesh geometry={roof} castShadow receiveShadow>
          <meshStandardMaterial {...trim} />
        </mesh>
        {Array.from({ length: 7 }).map((_, i) => {
          const t = i / 6
          return (
            <mesh key={i} position={[0, 0.045 + 0.145 * (1 - t), -0.21 + 0.42 * t]} rotation-x={0.29} castShadow>
              <boxGeometry args={[AC_W + 0.08, 0.026, 0.032]} />
              <meshStandardMaterial {...body} />
            </mesh>
          )
        })}
      </group>

      {/* vent grille with drip stains running down from it */}
      <group position={[-0.04, AC_BASE + 0.72, AC_Z + AC_D / 2]}>
        <RoundedBox args={[0.42, 0.3, 0.035]} radius={0.012} smoothness={2} position={[0, 0, 0.01]}>
          <meshStandardMaterial {...trim} />
        </RoundedBox>
        <mesh position={[0, 0, 0.029]}>
          <planeGeometry args={[0.35, 0.23]} />
          <meshStandardMaterial {...dark} />
        </mesh>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} position={[0, -0.095 + i * 0.038, 0.034]} rotation-x={0.5}>
            <boxGeometry args={[0.35, 0.02, 0.006]} />
            <meshStandardMaterial {...trim} />
          </mesh>
        ))}
        {[[-0.15, 0.1], [-0.09, 0.18], [-0.03, 0.08], [0.04, 0.14], [0.11, 0.06], [0.16, 0.11]].map(([x, l]) => (
          <mesh key={x} position={[x, -0.15 - l / 2, 0.022]}>
            <boxGeometry args={[0.014, l, 0.004]} />
            <meshStandardMaterial color="#1c2224" roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* service panel on the side */}
      <group position={[AC_W / 2 + 0.003, AC_BASE + 0.66, AC_Z + 0.02]}>
        <mesh>
          <boxGeometry args={[0.012, 0.3, 0.16]} />
          <meshStandardMaterial {...trim} />
        </mesh>
        <mesh position={[0.007, 0, 0]}>
          <boxGeometry args={[0.004, 0.26, 0.12]} />
          <meshStandardMaterial color="#3c4f53" metalness={0.4} />
        </mesh>
      </group>
    </group>
  )
}

// Two stacked rounded conduits along the base of a wall, with collar bands near each end.
// Local: wall behind (-z), runs along x, centred on `x`.
export function Conduits({ length, x = 0 }) {
  const mat = { color: '#55707a', metalness: 0.4, roughness: 0.45 }
  const collar = { color: '#6b8a92', metalness: 0.45, roughness: 0.4 }
  const tiers = [
    [length, 0.12, 0.56, 0.06, -0.0],
    [length - 0.08, 0.11, 0.5, 0.175, -0.03],
  ]
  return (
    <group position={[x, 0, 0]}>
      {tiers.map(([l, h, d, y, z]) => (
        <group key={y}>
          <RoundedBox args={[l, h, d]} radius={0.035} smoothness={3} position={[0, y, z]} castShadow receiveShadow>
            <meshStandardMaterial {...mat} />
          </RoundedBox>
          {[-1, 1].map((side) => (
            <RoundedBox key={side} args={[0.06, h + 0.03, d + 0.03]} radius={0.012} smoothness={2} position={[side * (l / 2 - 0.12), y, z]} castShadow>
              <meshStandardMaterial {...collar} />
            </RoundedBox>
          ))}
        </group>
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
        <meshStandardMaterial map={brick} color="#9a8a86" roughness={0.95} />
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
      <pointLight position={[-0.25, 0.95, 0.5]} color={C.pink} intensity={3.5} distance={3.2} />

      {/* double vertical cyan tube */}
      {[0.34, 0.46].map((x) => (
        <mesh key={x} position={[x, 1.3, 0.06]}>
          <cylinderGeometry args={[0.022, 0.022, 2.2, 10]} />
          <meshBasicMaterial color={[0.6, 2.4, 2.6]} toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={[0.4, 1.4, 0.4]} color={C.cyan} intensity={2.2} distance={2.6} />

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

// The bar, like the reference: polished dark stone (clear-coated terrazzo) — a thick top slab over a
// recessed pedestal on a low plinth — with red light strips at both ends, two stacked collared pipes
// along its foot, glassware, an ashtray and a spiky plant, and three sleek "spaceship" stools.
function Bar() {
  const stone = useMemo(() => {
    const top = makeStoneTexture()
    top.repeat.set(2.5, 0.75)
    const side = makeStoneTexture()
    side.repeat.set(2, 0.8)
    const polished = (map, color) =>
      new MeshPhysicalMaterial({ map, color, roughness: 0.22, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.15 })
    return { top: polished(top, '#ffffff'), body: polished(side, '#bdbdc4') }
  }, [])
  const red = <meshBasicMaterial color={[2.6, 0.25, 0.35]} toneMapped={false} />
  return (
    <group>
      {/* plinth, recessed pedestal, thick top slab */}
      <RoundedBox args={[2.34, 0.08, 0.6]} radius={0.02} smoothness={3} position={[0, 0.04, -0.02]} material={stone.body} castShadow receiveShadow />
      <RoundedBox args={[2.2, 0.84, 0.46]} radius={0.03} smoothness={3} position={[0, 0.5, -0.04]} material={stone.body} castShadow receiveShadow />
      <RoundedBox args={[2.54, 0.09, 0.74]} radius={0.03} smoothness={4} position={[0, 0.965, 0.0]} material={stone.top} castShadow receiveShadow />
      {/* red light strips down both ends of the pedestal */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 1.0, 0.5, 0.192]}>
            <planeGeometry args={[0.028, 0.66]} />
            {red}
          </mesh>
          <mesh position={[side * 1.101, 0.5, 0.05]} rotation-y={(side * Math.PI) / 2}>
            <planeGeometry args={[0.028, 0.66]} />
            {red}
          </mesh>
        </group>
      ))}
      <pointLight position={[1.25, 0.45, 0.4]} color="#ff2a3c" intensity={1.2} distance={1.6} />

      {/* two stacked collared pipes along the foot of the bar */}
      {[0.08, 0.21].map((y) => (
        <Pipe key={y} color="#56707a" radius={0.06} bend={0.08} clampEvery={0.7} points={[[-1.17, y, 0.36], [1.32, y, 0.36]]} />
      ))}

      {/* big glass jar, glasses with red drinks, ashtray, bottle */}
      <mesh position={[-0.45, 1.1, -0.08]} castShadow>
        <cylinderGeometry args={[0.13, 0.12, 0.2, 24]} />
        <meshPhysicalMaterial color="#cfe8ff" transparent opacity={0.3} roughness={0.05} metalness={0.1} clearcoat={1} />
      </mesh>
      <mesh position={[-0.45, 1.215, -0.08]}>
        <cylinderGeometry args={[0.07, 0.07, 0.03, 16]} />
        <meshStandardMaterial color="#9fb3bd" metalness={0.6} roughness={0.3} />
      </mesh>
      {[[0.32, 0.08], [0.5, -0.05], [-0.1, 0.12]].map(([x, z]) => (
        <group key={x} position={[x, 1.01, z]}>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.045, 0.04, 0.12, 16]} />
            <meshPhysicalMaterial color="#d8ecff" transparent opacity={0.35} roughness={0.05} clearcoat={1} />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.037, 0.035, 0.05, 14]} />
            <meshStandardMaterial color="#8a1018" emissive="#5a0810" emissiveIntensity={0.6} roughness={0.2} />
          </mesh>
        </group>
      ))}
      <mesh position={[0.08, 1.02, -0.12]}>
        <cylinderGeometry args={[0.075, 0.065, 0.022, 20]} />
        <meshStandardMaterial color="#1a1a1e" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0.72, 1.11, -0.15]} castShadow>
        <cylinderGeometry args={[0.035, 0.04, 0.2, 12]} />
        <meshPhysicalMaterial color="#2c5a3a" roughness={0.1} transparent opacity={0.85} clearcoat={1} />
      </mesh>

      {/* spiky plant by the wall */}
      <group position={[-1.0, 1.01, -0.12]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.08, 0.065, 0.16, 16]} />
          <meshStandardMaterial color="#3a2422" roughness={0.6} />
        </mesh>
        {Array.from({ length: 9 }).map((_, i) => {
          const a = (i / 9) * Math.PI * 2
          const tilt = 0.18 + (i % 3) * 0.12
          const h = 0.35 + (i % 4) * 0.08
          return (
            <mesh key={i} position={[Math.cos(a) * 0.03, 0.08 + h / 2, Math.sin(a) * 0.03]} rotation={[Math.sin(a) * tilt, a, -Math.cos(a) * tilt]} castShadow>
              <boxGeometry args={[0.035, h, 0.01]} />
              <meshStandardMaterial color={i % 2 ? '#1f4a33' : '#163826'} roughness={0.7} />
            </mesh>
          )
        })}
      </group>

      {/* stools */}
      {[
        [-0.75, 'pink'],
        [0.0, 'grey'],
        [0.75, 'grey'],
      ].map(([x, seat]) => (
        <BarStool key={x} position={[x, 0, 0.7]} seat={seat} />
      ))}
    </group>
  )
}

// Sleek "spaceship" bar stool: a smooth tray seat with raised end rims cut with handle slots and a
// padded inset (pink ones glow softly), on a satin metal frame of square legs with a footrest ring.
const STOOL_METAL = { color: '#6d7e85', metalness: 0.55, roughness: 0.3 }
function BarStool({ seat, ...props }) {
  const pad =
    seat === 'pink'
      ? { color: '#e070b8', roughness: 0.35, emissive: '#a02878', emissiveIntensity: 0.55 }
      : { color: '#8d969c', roughness: 0.35, metalness: 0.2 }
  const metal = <meshStandardMaterial {...STOOL_METAL} />
  const W = 0.46
  const D = 0.34
  const SEAT_Y = 0.68
  return (
    <group {...props}>
      {/* legs + footrest ring + apron under the seat */}
      {[-0.18, 0.18].flatMap((x) => [-0.12, 0.12].map((z) => [x, z])).map(([x, z]) => (
        <RoundedBox key={`${x}${z}`} args={[0.045, SEAT_Y, 0.045]} radius={0.01} smoothness={2} position={[x, SEAT_Y / 2, z]} castShadow>
          {metal}
        </RoundedBox>
      ))}
      {[
        [0, -0.12, 0.36, 0.03],
        [0, 0.12, 0.36, 0.03],
        [-0.18, 0, 0.03, 0.24],
        [0.18, 0, 0.03, 0.24],
      ].map(([x, z, w, d]) => (
        <RoundedBox key={`f${x}${z}`} args={[w, 0.03, d]} radius={0.008} smoothness={2} position={[x, 0.22, z]}>
          {metal}
        </RoundedBox>
      ))}
      <RoundedBox args={[W - 0.04, 0.05, D - 0.04]} radius={0.015} smoothness={2} position={[0, SEAT_Y - 0.02, 0]} castShadow>
        {metal}
      </RoundedBox>
      {/* tray seat: base, padded inset, raised end rims with handle slots */}
      <RoundedBox args={[W, 0.035, D]} radius={0.015} smoothness={3} position={[0, SEAT_Y + 0.02, 0]} castShadow receiveShadow>
        {metal}
      </RoundedBox>
      <RoundedBox args={[W - 0.1, 0.03, D - 0.05]} radius={0.012} smoothness={3} position={[0, SEAT_Y + 0.045, 0]} castShadow>
        <meshStandardMaterial {...pad} />
      </RoundedBox>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (W / 2 - 0.025), SEAT_Y + 0.08, 0]}>
          <RoundedBox args={[0.05, 0.11, D]} radius={0.018} smoothness={3} castShadow>
            {metal}
          </RoundedBox>
          <mesh position={[side * 0.026, 0, 0]} rotation-y={(side * Math.PI) / 2}>
            <planeGeometry args={[0.12, 0.035]} />
            <meshStandardMaterial color="#1b2124" />
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
  const concrete = useMemo(() => {
    const t = makeWallTexture()
    t.repeat.set(1, 1.3)
    return t
  }, [])
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
        <meshStandardMaterial map={concrete} color={C.wall} roughness={0.95} />
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
      <pointLight position={[cx, 1.6, -2.9]} color="#ff9a3c" intensity={lightsOn ? 4.5 : 2.5} distance={5} />
    </group>
  )
}

// The boiler nook in the back-right corner under the back deck, behind the top of the stairs (like the
// reference): two tall tanks with chunky ring bands and stepped caps filling floor to deck, thick pipes
// up the sides, and in front of them a metal workbench with a slatted chair and a crate.
const DECK_BOTTOM = UP - 0.4
function Boilers() {
  const metal = { color: '#7d9498', metalness: 0.5, roughness: 0.42 }
  const band = { color: '#5c7276', metalness: 0.5, roughness: 0.5 }
  const H = DECK_BOTTOM - 0.12
  return (
    <group>
      {[-0.34, 0.36].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {/* plinth, tank, ring bands */}
          <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.36, 0.38, 0.12, 24]} />
            <meshStandardMaterial {...band} />
          </mesh>
          <mesh position={[0, 0.12 + (H - 0.3) / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.32, 0.32, H - 0.3, 24]} />
            <meshStandardMaterial {...metal} />
          </mesh>
          {[0.55, 1.2, 1.85].map((y) => (
            <group key={y} position={[0, y, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.345, 0.345, 0.07, 24]} />
                <meshStandardMaterial {...band} />
              </mesh>
              <mesh position={[0, 0.06, 0]}>
                <cylinderGeometry args={[0.335, 0.335, 0.02, 24]} />
                <meshStandardMaterial {...metal} />
              </mesh>
            </group>
          ))}
          {/* stepped cap and a pipe up into the deck */}
          <mesh position={[0, H - 0.14, 0]} castShadow>
            <cylinderGeometry args={[0.27, 0.32, 0.08, 24]} />
            <meshStandardMaterial {...metal} />
          </mesh>
          <mesh position={[0, H - 0.07, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.24, 0.07, 20]} />
            <meshStandardMaterial {...band} />
          </mesh>
          <mesh position={[0, (H + DECK_BOTTOM) / 2, 0]}>
            <cylinderGeometry args={[0.08, 0.08, DECK_BOTTOM - H + 0.04, 12]} />
            <meshStandardMaterial {...metal} />
          </mesh>
          {/* gauge */}
          <mesh position={[0, 1.5, 0.33]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.055, 0.055, 0.03, 16]} />
            <meshStandardMaterial color="#2a3134" />
          </mesh>
          <mesh position={[0, 1.5, 0.346]}>
            <circleGeometry args={[0.042, 16]} />
            <meshBasicMaterial color="#d9e8c8" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* thick collared pipes up both sides, joined by a pipe across under the deck */}
      <Pipe color="#6f878b" radius={0.075} bend={0.14} clampEvery={0.55} points={[[-0.8, 0, 0.08], [-0.8, DECK_BOTTOM - 0.16, 0.08], [0.72, DECK_BOTTOM - 0.16, 0.08], [0.72, DECK_BOTTOM, 0.08]]} />
      <Pipe color="#6f878b" radius={0.065} bend={0.14} clampEvery={0.55} points={[[0.68, 0.32, -0.2], [0.72, 0.32, -0.2], [0.72, 0.32, 0.22], [0.72, DECK_BOTTOM - 0.3, 0.22]]} />
      {/* square-flanged stubs coming out low at the side */}
      {[0.16, 0.36].map((y) => (
        <group key={y} position={[0.66, y, 0.48]}>
          <RoundedBox args={[0.12, 0.12, 0.2]} radius={0.015} smoothness={2} castShadow>
            <meshStandardMaterial color="#6f878b" metalness={0.5} roughness={0.42} />
          </RoundedBox>
          <RoundedBox args={[0.17, 0.17, 0.035]} radius={0.012} smoothness={2} position={[0, 0, 0.11]} castShadow>
            <meshStandardMaterial color="#7d9498" metalness={0.5} roughness={0.4} />
          </RoundedBox>
          <mesh position={[0, 0, 0.129]}>
            <planeGeometry args={[0.07, 0.07]} />
            <meshStandardMaterial color="#0d1112" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Workbench() {
  const steel = { color: '#8a9ea2', metalness: 0.5, roughness: 0.45 }
  const legs = { color: '#4a3a3e', metalness: 0.4, roughness: 0.5 }
  return (
    <group>
      {/* table */}
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.0, 0.04, 0.56]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      {[-0.45, 0.45].flatMap((x) => [-0.23, 0.23].map((z) => [x, z])).map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.36, z]} castShadow>
          <boxGeometry args={[0.04, 0.72, 0.04]} />
          <meshStandardMaterial {...legs} />
        </mesh>
      ))}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.9, 0.025, 0.46]} />
        <meshStandardMaterial {...legs} />
      </mesh>
      {/* tray, papers, a green gadget, a bottle */}
      <group position={[0.18, 0.77, -0.02]}>
        <mesh castShadow>
          <boxGeometry args={[0.32, 0.02, 0.24]} />
          <meshStandardMaterial color="#4f6f74" metalness={0.4} />
        </mesh>
        {[[-0.15, 0.2], [0.15, -0.2]].map(([x, z]) => (
          <mesh key={x} position={[x * 1.0, 0.012, z * 0.55]} rotation-y={0}>
            <boxGeometry args={[0.02, 0.025, 0.24]} />
            <meshStandardMaterial color="#4f6f74" metalness={0.4} />
          </mesh>
        ))}
      </group>
      {[[-0.28, 0.08, 0.3], [-0.12, -0.12, -0.4], [0.38, 0.14, 0.9]].map(([x, z, r]) => (
        <mesh key={x} position={[x, 0.762, z]} rotation={[-Math.PI / 2, 0, r]}>
          <planeGeometry args={[0.2, 0.14]} />
          <meshStandardMaterial color="#e4e1d8" roughness={0.9} />
        </mesh>
      ))}
      <group position={[-0.3, 0.8, -0.1]}>
        <mesh castShadow>
          <boxGeometry args={[0.16, 0.06, 0.12]} />
          <meshStandardMaterial color="#2c3a2e" roughness={0.5} />
        </mesh>
        {[-0.04, 0, 0.04].map((x) => (
          <mesh key={x} position={[x, 0.031, 0.02]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.02, 0.02]} />
            <meshBasicMaterial color={[0.5, 2.4, 0.9]} toneMapped={false} />
          </mesh>
        ))}
        <pointLight position={[0, 0.15, 0.1]} color="#3dff9a" intensity={0.5} distance={1.1} />
      </group>
      <mesh position={[0.42, 0.86, -0.15]} castShadow>
        <cylinderGeometry args={[0.03, 0.035, 0.2, 10]} />
        <meshStandardMaterial color="#2f4a3a" roughness={0.15} />
      </mesh>

      {/* slatted chair at the left end, facing the table */}
      <group position={[-0.72, 0, 0.02]} rotation-y={Math.PI / 2}>
        <mesh position={[0, 0.46, 0]} castShadow>
          <boxGeometry args={[0.42, 0.04, 0.4]} />
          <meshStandardMaterial {...legs} />
        </mesh>
        {[-0.18, 0.18].flatMap((x) => [-0.17, 0.17].map((z) => [x, z])).map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 0.23, z]} castShadow>
            <boxGeometry args={[0.035, 0.46, 0.035]} />
            <meshStandardMaterial {...legs} />
          </mesh>
        ))}
        {[-0.18, 0.18].map((x) => (
          <mesh key={x} position={[x, 0.72, -0.18]} castShadow>
            <boxGeometry args={[0.035, 0.52, 0.035]} />
            <meshStandardMaterial {...legs} />
          </mesh>
        ))}
        {[0.6, 0.73, 0.86].map((y) => (
          <mesh key={y} position={[0, y, -0.18]} castShadow>
            <boxGeometry args={[0.4, 0.07, 0.025]} />
            <meshStandardMaterial color="#5a3a3c" roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
