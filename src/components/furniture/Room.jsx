import { Suspense, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from 'three'
import { useStore } from '../../store'
import { UP, WALL_H, DESK_DECK, BACK_DECK, BRIDGE, STAIRS, WINDOW, zoneById } from '../../data/zones'
import { C, makeDeckTexture, makeFloorTexture, makeWallTexture } from './materials'
import Pipe from './Pipe'
import Decor from './Decor'

// The cutaway cube: ground floor, two walls, the two upper platforms (the desk deck hung on teal
// pipework, and the back deck along the back wall, joined by a short bridge), the long stair up the
// right side, the olive bed railing and ceiling ducts. Industrial, like the reference.
// All the non-clickable props (arcades, fans, bar, bathroom, boilers…) live in Decor.jsx.
export default function Room() {
  const goHome = useStore((s) => s.goHome)
  const floorTex = useMemo(makeFloorTexture, [])
  const wallTex = useMemo(makeWallTexture, [])

  return (
    <group>
      {/* Ground floor — clicking empty floor returns to the overview */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow onClick={goHome}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial map={floorTex} color={C.floor} roughness={0.6} />
      </mesh>
      {/* Pink tiles under the kitchen + bar */}
      <mesh rotation-x={-Math.PI / 2} position={[-2.8, 0.004, 1.4]} receiveShadow>
        <planeGeometry args={[2.4, 5.2]} />
        <meshStandardMaterial color="#5b4556" roughness={0.4} />
      </mesh>
      {/* Base block */}
      <mesh position={[0, -0.25, 0]} receiveShadow>
        <boxGeometry args={[8.3, 0.5, 8.3]} />
        <meshStandardMaterial color={C.metalDark} />
      </mesh>
      <mesh position={[0, -0.5, 4.16]}>
        <boxGeometry args={[8.3, 0.03, 0.03]} />
        <meshBasicMaterial color={C.cyan} toneMapped={false} />
      </mesh>
      <mesh position={[4.16, -0.5, 0]}>
        <boxGeometry args={[0.03, 0.03, 8.3]} />
        <meshBasicMaterial color={C.cyan} toneMapped={false} />
      </mesh>

      {/* Walls (the back one has the window opening cut out of it) */}
      <BackWall />
      <mesh position={[-4.075, WALL_H / 2, 0]} receiveShadow>
        <boxGeometry args={[0.15, WALL_H, 8]} />
        <meshStandardMaterial map={wallTex} color={C.wall} />
      </mesh>

      {/* Ceiling duct along the top of the left wall, with vents, + a thinner lip along the back wall */}
      <mesh position={[-3.65, WALL_H - 0.3, 0.2]}>
        <boxGeometry args={[0.7, 0.6, 7.6]} />
        <meshStandardMaterial color={C.metal} />
      </mesh>
      {[-2.6, -0.9, 0.8, 2.5].map((z) => (
        <mesh key={z} position={[-3.29, WALL_H - 0.3, z]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[0.9, 0.36]} />
          <meshStandardMaterial color="#2a2638" />
        </mesh>
      ))}
      <mesh position={[0.2, WALL_H - 0.15, -3.8]}>
        <boxGeometry args={[7.6, 0.3, 0.4]} />
        <meshStandardMaterial color={C.metal} />
      </mesh>
      {/* Pipes running along the back wall */}
      {[0.38, 0.5].map((dy, i) => (
        <mesh key={dy} position={[0.2, WALL_H - dy, -3.92]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.05, 0.05, 7.6, 10]} />
          <meshStandardMaterial color={i ? C.metal : '#5b5268'} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      <Mezzanine />
      <Suspense fallback={null}>
        <Stairs />
      </Suspense>
      <Decor />

      {/* Under-deck glow so the ground floor reads */}
      <pointLight position={[-2.6, 2.1, 0.2]} color={C.pink} intensity={6} distance={5} />
    </group>
  )
}

// Back wall built from four pieces around the window opening, so light only gets in through the
// window (they cast shadows) and you can see out to the sky behind it.
const WALL_T = 0.15
const TEX_UNIT = 2.07 // world units per repeat of the wall texture
function BackWall() {
  const base = useMemo(makeWallTexture, [])
  const [wx, wy] = zoneById('window').place
  const x0 = wx - WINDOW.w / 2
  const x1 = wx + WINDOW.w / 2
  const y0 = wy + WINDOW.cy - WINDOW.h / 2
  const y1 = wy + WINDOW.cy + WINDOW.h / 2
  const L = -4.15
  const R = 4.15
  const pieces = [
    [L, x0, 0, WALL_H],
    [x1, R, 0, WALL_H],
    [x0, x1, 0, y0],
    [x0, x1, y1, WALL_H],
  ]
  return pieces.map(([a, b, c, d]) => (
    <WallPiece key={`${a}${c}`} base={base} x0={a} x1={b} y0={c} y1={d} />
  ))
}

function WallPiece({ base, x0, x1, y0, y1 }) {
  // Same texture scale + offset on every piece so the panel lines carry across
  const map = useMemo(() => {
    const t = base.clone()
    t.repeat.set((x1 - x0) / TEX_UNIT, (y1 - y0) / TEX_UNIT)
    t.offset.set(x0 / TEX_UNIT, y0 / TEX_UNIT)
    t.needsUpdate = true
    return t
  }, [base, x0, x1, y0, y1])
  return (
    <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, -4 - WALL_T / 2]} castShadow receiveShadow>
      <boxGeometry args={[x1 - x0, y1 - y0, WALL_T]} />
      <meshStandardMaterial map={map} color={C.wall} />
    </mesh>
  )
}

// The upper floor: two separate slabs and the bridge that joins them by the left wall.
const T = 0.4
const SLABS = [DESK_DECK, BACK_DECK, BRIDGE]

function Mezzanine() {
  const goHome = useStore((s) => s.goHome)
  const deckTex = useMemo(makeDeckTexture, [])

  return (
    <group>
      {SLABS.map(({ x0, x1, z0, z1 }, i) => {
        const w = x1 - x0
        const d = z1 - z0
        const cx = (x0 + x1) / 2
        const cz = (z0 + z1) / 2
        return (
          <group key={i}>
            <mesh position={[cx, UP - T / 2, cz]} castShadow receiveShadow>
              <boxGeometry args={[w, T, d]} />
              <meshStandardMaterial color={C.metalDark} roughness={0.8} />
            </mesh>
            <mesh position={[cx, UP + 0.002, cz]} rotation-x={-Math.PI / 2} receiveShadow onClick={goHome}>
              <planeGeometry args={[w, d]} />
              <meshStandardMaterial map={deckTex} color={C.deck} roughness={0.9} />
            </mesh>
          </group>
        )
      })}
      <DeckPipework />
      <BedRail />
    </group>
  )
}

// Teal pipework that frames the desk deck and makes it look hung, like the reference: a low rail
// around its open front, right and back edges, pipes just under the slab along the front and back,
// a clamped pipe along the right edge's face, and uprights joining them to the rail.
const RAIL_Y = UP + 0.45
const UNDER_Y = UP - T - 0.14
const FACE_Y = UP - T / 2
const FX = DESK_DECK.x1 + 0.07 // just outside the right edge
const FZ = DESK_DECK.z1 + 0.07 // …the front edge (the cut face of the room)
const BZ = DESK_DECK.z0 - 0.07 // …and the back edge, over the gap
const LEFT = -3.93
const BRIDGE_END = BRIDGE.x1 - 0.06 // where the back rail stops, at the bridge

function DeckPipework() {
  const teal = { color: C.pipe }
  const edge = (y) => [
    [LEFT, y, FZ],
    [FX, y, FZ],
    [FX, y, BZ],
    [BRIDGE_END, y, BZ],
  ]
  return (
    <group>
      {/* top rail, dropping onto the bridge at the end */}
      <Pipe {...teal} radius={0.04} points={[...edge(RAIL_Y), [BRIDGE_END, UP, BZ]]} />
      {/* pipes just under the slab along the front and back edges, with hanger clamps
          (the right edge has the clamped face pipe instead, so the ground floor stays visible) */}
      <Pipe {...teal} radius={0.04} clampEvery={0.9} points={[[LEFT, UNDER_Y, FZ], [FX, UNDER_Y, FZ]]} />
      <Pipe {...teal} radius={0.04} clampEvery={0.9} points={[[FX, UNDER_Y, BZ], [BRIDGE_END, UNDER_Y, BZ]]} />
      {/* clamped pipe along the right edge's face */}
      <Pipe {...teal} radius={0.032} clampEvery={0.7} points={[[FX - 0.02, FACE_Y, FZ - 0.1], [FX - 0.02, FACE_Y, BZ + 0.1]]} flanges={false} />
      {/* uprights: front + back edges join rail and under-pipe, the right edge joins rail and face pipe */}
      {[
        [(LEFT + FX) / 2, FZ, UNDER_Y],
        [FX - 0.25, FZ, UNDER_Y],
        [FX, FZ - 0.25, FACE_Y],
        [FX, 2.2, FACE_Y],
        [FX, 0.6, FACE_Y],
        [FX, BZ + 0.25, FACE_Y],
        [(FX + BRIDGE_END) / 2, BZ, UNDER_Y],
      ].map(([x, z, y0]) => (
        <Pipe key={`${x}${z}`} {...teal} radius={0.032} flanges={false} points={[[x, y0, z], [x, RAIL_Y, z]]} />
      ))}
    </group>
  )
}

// Olive bent-pipe railing in front of the bed (left of the stairs): one rail with rounded corners
// dropping to the floor at both ends, and pipe posts in between.
function BedRail() {
  const x0 = 0.6
  const x1 = STAIRS.x - STAIRS.width / 2 - 0.08
  const z = BACK_DECK.z1 - 0.08
  const top = UP + 0.8
  return (
    <group>
      <Pipe color={C.olive} radius={0.038} bend={0.14} points={[[x0, UP, z], [x0, top, z], [x1, top, z], [x1, UP, z]]} />
      {[0.25, 0.5, 0.75].map((f) => {
        const x = x0 + (x1 - x0) * f
        return (
          <group key={f}>
            <Pipe color={C.olive} radius={0.032} points={[[x, UP, z], [x, top, z]]} />
            <mesh position={[x, top, z]}>
              <sphereGeometry args={[0.05, 12, 10]} />
              <meshStandardMaterial color={C.olive} metalness={0.55} roughness={0.38} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// Long steep stair, like the reference: teal-grey step blocks (sawtooth underneath) between two olive
// rails, and a plate at the top where it meets the deck. The surfaces wear your painted textures from
// public/textures/stairs (templates in reference/templates/stairs): one tread + one riser repeated on
// every step, a 1 m rail strip repeated along both rails, and the landing plate.
const STAIR_TEX = ['tread', 'riser', 'rail', 'landing'].map((n) => `/textures/stairs/stair-${n}.png`)

function Stairs() {
  const { x, width, topZ, bottomZ } = STAIRS
  const steps = 16
  const run = (bottomZ - topZ) / steps
  const rise = UP / steps
  const len = Math.hypot(UP, bottomZ - topZ)
  const angle = Math.atan2(UP, bottomZ - topZ)
  const [tread, riser, rail, landing] = useTexture(STAIR_TEX)

  // Box faces are [+x, -x, +y (top), -y, +z (front), -z]
  const mats = useMemo(() => {
    for (const t of [tread, riser, rail, landing]) {
      t.colorSpace = SRGBColorSpace
      t.anisotropy = 8
    }
    rail.wrapS = RepeatWrapping
    rail.repeat.set(len, 1) // the strip is 1 m long, so repeat it once per metre of rail
    const m = (props) => new MeshStandardMaterial({ roughness: 0.7, metalness: 0.15, ...props })
    const steel = m({ color: '#4c787c' })
    const olive = m({ color: C.olive, metalness: 0.4, roughness: 0.5 })
    const railFace = m({ map: rail, metalness: 0.3, roughness: 0.55 })
    return {
      step: [steel, steel, m({ map: tread }), steel, m({ map: riser }), steel],
      rail: [railFace, railFace, olive, olive, olive, olive],
      landing: [steel, steel, m({ map: landing }), steel, steel, steel],
    }
  }, [tread, riser, rail, landing, len])

  return (
    <group position={[x, 0, 0]}>
      {Array.from({ length: steps - 1 }).map((_, i) => (
        <mesh key={i} position={[0, (i + 0.5) * rise, bottomZ - i * run - run / 2]} material={mats.step} castShadow receiveShadow>
          <boxGeometry args={[width, rise, run]} />
        </mesh>
      ))}
      {/* olive rails either side */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (width / 2 + 0.022), UP / 2 + rise * 0.45, (topZ + bottomZ) / 2]}
          rotation-x={angle}
          material={mats.rail}
          castShadow
        >
          <boxGeometry args={[0.04, 0.17, len]} />
        </mesh>
      ))}
      {/* landing plate at the top */}
      <mesh position={[0, UP + 0.015, topZ - 0.2]} material={mats.landing} receiveShadow castShadow>
        <boxGeometry args={[width + 0.14, 0.03, 0.4]} />
      </mesh>
    </group>
  )
}
