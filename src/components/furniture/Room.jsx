import { Suspense, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { Color, MeshBasicMaterial, MeshPhysicalMaterial, RepeatWrapping, SRGBColorSpace } from 'three'
import { useStore } from '../../store'
import { UP, WALL_H, DESK_DECK, BACK_DECK, BRIDGE, STAIRS, WINDOW, zoneById } from '../../data/zones'
import { C, K, makeDeckTexture, makeKitchenTileTexture, makePolishedConcreteTextures, makeWallTexture } from './materials'
import Pipe from './Pipe'
import FloorReflection from './FloorReflection'
import Decor from './Decor'

// Where the kitchen/bar tiles end (they start at the left wall and run to the front of the room)
const TILE_X1 = -1.0
const TILE_Z0 = -1.6
const FLOOR_SIZE = [8, 8]

// The cutaway cube: ground floor, two walls, the two upper platforms (the desk deck hung on teal
// pipework, and the back deck along the back wall, joined by a short bridge), the long stair up the
// right side, the olive bed railing and ceiling ducts. Industrial, like the reference.
// All the non-clickable props (arcades, fans, bar, bathroom, boilers…) live in Decor.jsx.
export default function Room() {
  const goHome = useStore((s) => s.goHome)
  const floor = useMemo(() => {
    const t = makePolishedConcreteTextures()
    t.map.repeat.set(2, 2) // one texture covers 4 m
    t.rough.repeat.set(2, 2)
    return t
  }, [])
  const tileTex = useMemo(() => {
    const t = makeKitchenTileTexture()
    t.repeat.set((TILE_X1 + 4) / 2.4, (4 - TILE_Z0) / 2.4)
    return t
  }, [])
  const wallTex = useMemo(makeWallTexture, [])

  return (
    <group>
      {/* Ground floor: polished, sealed dark concrete with a clear coat, and a real mirror sheen on top
          (FloorReflection) — clicking empty floor returns to the overview */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow onClick={goHome}>
        <planeGeometry args={[8, 8]} />
        <meshPhysicalMaterial map={floor.map} roughnessMap={floor.rough} color="#7b898b" roughness={0.75} clearcoat={0.7} clearcoatRoughness={0.22} envMapIntensity={1.2} />
      </mesh>
      <FloorReflection size={FLOOR_SIZE} gloss={floor.rough} />
      {/* Small pink tiles under the kitchen + bar */}
      <mesh rotation-x={-Math.PI / 2} position={[(-4 + TILE_X1) / 2, 0.004, (TILE_Z0 + 4) / 2]} receiveShadow>
        <planeGeometry args={[TILE_X1 + 4, 4 - TILE_Z0]} />
        <meshStandardMaterial map={tileTex} roughness={0.45} metalness={0.05} />
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
        <group key={z} position={[-3.29, WALL_H - 0.3, z]} rotation-y={Math.PI / 2}>
          <mesh position={[0, 0, 0.012]}>
            <boxGeometry args={[0.9, 0.38, 0.03]} />
            <meshStandardMaterial color="#3d4c4f" roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.014]}>
            <planeGeometry args={[0.8, 0.3]} />
            <meshStandardMaterial color="#0e1213" />
          </mesh>
          {Array.from({ length: 7 }).map((_, i) => (
            <mesh key={i} position={[0, -0.12 + i * 0.04, 0.03]} rotation-x={0.6}>
              <boxGeometry args={[0.8, 0.028, 0.008]} />
              <meshStandardMaterial color="#56686b" roughness={0.45} metalness={0.3} />
            </mesh>
          ))}
        </group>
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
  const sideTex = useMemo(() => {
    const t = makeWallTexture()
    t.repeat.set(3, 0.6)
    return t
  }, [])

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
              <meshStandardMaterial map={sideTex} color="#3a4546" roughness={0.9} />
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

// Teal pipework that frames the desk deck, like the reference: no railing, just two chunky pipes
// hugging the slab (one along its top edge, one along its bottom edge, the dark slab face showing
// between them) with clamp bands, running along the front, right and back edges. At the front corner
// and the back-right corner a pipe drops below the slab and loops back under it, so the deck looks hung.
const PIPE_R = 0.05
const TOP_Y = UP - 0.02 // sits on the slab's top edge, like a bumper
const BOT_Y = UP - T + 0.03 // along the slab's bottom edge
const HANG_Y = UP - T - 0.38 // the hanging loops, below the slab
const OUT = 0.07 // how far outside the slab edge the pipes run
const FX = DESK_DECK.x1 + OUT // right edge
const FZ = DESK_DECK.z1 + OUT // front edge (the cut face of the room)
const BZ = DESK_DECK.z0 - OUT // back edge, over the gap
const WALL_X = -3.99
const BRIDGE_END = BRIDGE.x1 + OUT // where the back run stops, at the bridge

function DeckPipework() {
  const pipe = { metal: 'gold', radius: PIPE_R, bend: 0.08 }
  const frame = (y) => [
    [WALL_X, y, FZ],
    [FX, y, FZ],
    [FX, y, BZ],
    [BRIDGE_END, y, BZ],
  ]
  return (
    <group>
      <Pipe {...pipe} clampEvery={0.6} points={frame(TOP_Y)} />
      <Pipe {...pipe} clampEvery={0.6} points={frame(BOT_Y)} />
      {/* hanging loop under the front edge: down from the corner, along, and back up into the slab */}
      <Pipe
        {...pipe}
        points={[
          [FX, TOP_Y, FZ],
          [FX, HANG_Y, FZ],
          [FX - 1.3, HANG_Y, FZ],
          [FX - 1.3, BOT_Y, FZ],
        ]}
        flanges={false}
      />
      {/* and one under the right edge, from the back corner toward the front */}
      <Pipe
        {...pipe}
        points={[
          [FX, TOP_Y, BZ],
          [FX, HANG_Y, BZ],
          [FX, HANG_Y, BZ + 1.3],
          [FX, BOT_Y, BZ + 1.3],
        ]}
        flanges={false}
      />
    </group>
  )
}

// Gold bent-pipe railing in front of the bed (left of the stairs), matching the pipework: one rail that
// bends down into the deck at both ends, posts in between, every upright standing on a small base plate.
function BedRail() {
  const x0 = 0.6
  const x1 = STAIRS.x - STAIRS.width / 2 - 0.1
  const z = BACK_DECK.z1 - 0.1
  const top = UP + 0.78
  const posts = [0.25, 0.5, 0.75].map((f) => x0 + (x1 - x0) * f)
  const mat = <meshPhysicalMaterial {...K.gold()} />
  return (
    <group>
      <Pipe metal="gold" radius={0.04} bend={0.11} points={[[x0, UP, z], [x0, top, z], [x1, top, z], [x1, UP, z]]} flanges={false} />
      {posts.map((x) => (
        <Pipe key={x} metal="gold" radius={0.034} points={[[x, UP, z], [x, top, z]]} flanges={false} />
      ))}
      {[x0, ...posts, x1].map((x) => (
        <mesh key={`b${x}`} position={[x, UP + 0.012, z]} castShadow receiveShadow>
          <cylinderGeometry args={[0.065, 0.075, 0.024, 16]} />
          {mat}
        </mesh>
      ))}
    </group>
  )
}

// Long steep stair, like the reference: teal-grey step blocks (sawtooth underneath) between two olive
// rails, and a plate at the top where it meets the deck, all in glossy metal. The surfaces wear your painted textures from
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

  const ledMat = useMemo(() => new MeshBasicMaterial({ color: new Color(0.3, 1.7, 1.9), toneMapped: false }), [])

  // Box faces are [+x, -x, +y (top), -y, +z (front), -z]
  const mats = useMemo(() => {
    for (const t of [tread, riser, rail, landing]) {
      t.colorSpace = SRGBColorSpace
      t.anisotropy = 8
    }
    rail.wrapS = RepeatWrapping
    rail.repeat.set(len, 1) // the strip is 1 m long, so repeat it once per metre of rail
    // Glossy metal, like the rest of the room: diamond-plate steel treads + landing (the painted pattern
    // doubles as relief so it glints), painted-metal risers, and clear-coated olive rails.
    const m = (props) => new MeshPhysicalMaterial(props)
    const steel = m({ ...K.painted('#4c787c'), metalness: 0.3 })
    const plate = (map) => m({ ...K.painted('#ffffff'), map, bumpMap: map, bumpScale: 1.2, metalness: 0.35, roughness: 0.32, envMapIntensity: 2.4 })
    const olive = m({ ...K.painted(C.olive), metalness: 0.35 })
    const railFace = m({ ...K.painted('#ffffff'), map: rail, metalness: 0.35 })
    return {
      step: [steel, steel, plate(tread), steel, m({ ...K.painted('#ffffff'), map: riser, metalness: 0.3 }), steel],
      rail: [railFace, railFace, olive, olive, olive, olive],
      landing: [steel, steel, plate(landing), steel, steel, steel],
    }
  }, [tread, riser, rail, landing, len])

  return (
    <group position={[x, 0, 0]}>
      {Array.from({ length: steps - 1 }).map((_, i) => (
        <mesh key={i} position={[0, (i + 0.5) * rise, bottomZ - i * run - run / 2]} material={mats.step} castShadow receiveShadow>
          <boxGeometry args={[width, rise, run]} />
          {/* thin cyan LED just under each step's front edge */}
          <mesh position={[0, rise / 2 - 0.018, run / 2 + 0.002]} material={ledMat}>
            <planeGeometry args={[width * 0.9, 0.008]} />
          </mesh>
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
