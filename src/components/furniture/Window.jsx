import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  ExtrudeGeometry,
  Float32BufferAttribute,
  MeshBasicMaterial,
  Object3D,
  Path,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  Vector3,
} from 'three'
import { WINDOW } from '../../data/zones'
import { useStore } from '../../store'
import { env, tickEnvironment } from '../../lib/environment'
import {
  makeBolt,
  makeCityGlow,
  makeClouds,
  drawSydneyTower,
  makeCityLayer,
  makeFrostTexture,
  makeGlassGlintTexture,
  makeGlow,
  makeHarbour,
  makeHaze,
  makeNeonFog,
  makeStars,
  makeWater,
  WATERLINE,
} from '../../lib/outside'
import { createFlickerSign, createMoonlightBillboard } from '../../lib/screens'
import { C } from './materials'

// The big upstairs window, like the reference: a deep opening in the back wall (Room.jsx leaves the
// hole) framed by stepped chamfered layers, with frosted glass that glows like a light panel and a
// glossy, reflective surface over it, and a detective pinboard (notes joined by red string) on the
// glass. It's still live: the glow takes its colour from the real Sydney sky behind it (warm orange
// city light at night, bright cream by day, dimmer under cloud), rain runs down the glass and
// lightning flashes through. Behind the frost is the outside scene (forest, city skyline, sky, sun,
// moon, weather), faintly visible. Light pours in and casts shadows into the room.
// A venetian shutter opens and closes at random times through the day, and rolls up out of the way
// whenever you click the window (SHUTTER = false removes it).
// Local: wall face at z ≈ 0, room is +z, outside is -z. Weather/time live in lib/environment.js.
const { w: W, h: H, cy: CY, chamfer: CH } = WINDOW
const HW = W / 2
const HH = H / 2
const TOP = CY + HH
const BOT = CY - HH
const SHUTTER = true
const WALL_BACK = -0.17 // back face of the wall, in this local space

// The opening: a rectangle with its corners cut off, counter-clockwise
const OCT = [
  [-HW + CH, -HH],
  [HW - CH, -HH],
  [HW, -HH + CH],
  [HW, HH - CH],
  [HW - CH, HH],
  [-HW + CH, HH],
  [-HW, HH - CH],
  [-HW, -HH + CH],
]

export default function Window() {
  useFrame((_, dt) => tickEnvironment(Math.min(dt, 0.1)))

  return (
    <group>
      <Frame />
      <Glass />
      <PinBoard />
      {SHUTTER && <Shutter />}
      <Outside />
      <WindowLights />
    </group>
  )
}

// An octagon around the opening, grown outward by margin m (chamfers kept parallel)
function octShape(m, hole) {
  const hw = HW + m
  const hh = HH + m
  const ch = CH + m * 0.414
  const pts = [[-hw + ch, -hh], [hw - ch, -hh], [hw, -hh + ch], [hw, hh - ch], [hw - ch, hh], [-hw + ch, hh], [-hw, hh - ch], [-hw, -hh + ch]]
  const p = hole ? new Path() : new Shape()
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)))
  return p
}

// Stepped chamfered frame: four layers stepping inward and back toward the glass, each one
// running back to the rear of the wall so there are no gaps. Their edges catch the window's glow.
const STEPS = [
  { outer: 0.28, inner: 0.15, front: 0.06, color: '#3b4749' },
  { outer: 0.15, inner: 0.1, front: 0.025, color: '#445355' },
  { outer: 0.1, inner: 0.05, front: -0.01, color: '#4d5e61' },
  { outer: 0.05, inner: 0, front: -0.045, color: '#58696c' },
]
function Frame() {
  const rings = useMemo(
    () =>
      STEPS.map(({ outer, inner, front, color }) => {
        const s = octShape(outer)
        s.holes.push(octShape(inner, true))
        const geo = new ExtrudeGeometry(s, { depth: front - WALL_BACK, bevelEnabled: false })
        geo.translate(0, 0, WALL_BACK)
        return { geo, color }
      }),
    []
  )
  return (
    <group position={[0, CY, 0]}>
      {rings.map(({ geo, color }, i) => (
        <mesh key={i} geometry={geo} castShadow receiveShadow>
          <meshStandardMaterial color={color} roughness={0.55} metalness={0.25} />
        </mesh>
      ))}
      {/* ridged sill along the bottom of the opening */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, -HH + 0.012 + i * 0.006, -0.06 + i * 0.03]}>
          <boxGeometry args={[W - 2 * CH - 0.02, 0.012, 0.012]} />
          <meshStandardMaterial color="#6d8084" roughness={0.4} metalness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

const DROPS = 60
const FROST_NIGHT = new Color('#6a8cff')
const FROST_DAY = new Color('#ffe4bf')
const FROST_GREY = new Color('#9aa3ad')
function Glass() {
  const glass = useMemo(() => {
    const s = new Shape()
    OCT.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
    const g = new ShapeGeometry(s)
    // map UVs to the opening's bounding box so textures fill it
    const pos = g.attributes.position
    const uv = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) + HW) / W
      uv[i * 2 + 1] = (pos.getY(i) + HH) / H
    }
    g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
    return g
  }, [])
  const tex = useMemo(() => ({ frost: makeFrostTexture(), glint: makeGlassGlintTexture() }), [])
  const frost = useRef()
  const glint = useRef()
  const drops = useRef([])
  const dropMat = useMemo(() => new MeshBasicMaterial({ color: '#cfe9ff', transparent: true, opacity: 0.45, depthWrite: false }), [])
  const seeds = useMemo(
    () => Array.from({ length: DROPS }, (_, i) => ({ x: (Math.random() - 0.5) * (W - 2 * CH), speed: 0.25 + Math.random() * 0.5, off: i * 0.37 })),
    []
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const day = env.daylight
    // Clear glass with just a faint haze (violet at night, cream by day, greyer under cloud) so the
    // city and the live weather show through; fog fogs it up a little more.
    frost.current.opacity = 0.035 + day * 0.02 + env.fog * 0.3
    const c = frost.current.color
    c.copy(FROST_NIGHT).lerp(FROST_DAY, day).lerp(FROST_GREY, env.cloud * 0.35 * day)
    c.multiplyScalar((1.85 - day * 0.25) * (1 - env.cloud * 0.2) * (1 - env.storm * 0.35) + env.flash * 2)
    glint.current.opacity = 0.18 + day * 0.1
    const wet = env.rain
    dropMat.opacity = 0.45 * wet
    drops.current.forEach((m, i) => {
      if (!m) return
      m.visible = wet > 0.05
      const s = seeds[i]
      m.position.y = HH - ((t * s.speed + s.off) % 1) * H
    })
  })

  return (
    <group position={[0, CY, -0.1]}>
      {/* faint haze on the glass; the city and the weather outside show through */}
      <mesh geometry={glass}>
        <meshBasicMaterial ref={frost} map={tex.frost} transparent opacity={0.96} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* glossy glass surface: picks up highlights and reflections from the room */}
      <mesh geometry={glass} position={[0, 0, 0.004]}>
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.12} roughness={0.22} metalness={0.1} clearcoat={1} clearcoatRoughness={0.18} envMapIntensity={3} depthWrite={false} />
      </mesh>
      <mesh geometry={glass} position={[0, 0, 0.006]}>
        <meshBasicMaterial ref={glint} map={tex.glint} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Raindrops running down the glass */}
      {seeds.map((s, i) => (
        <mesh key={i} ref={(m) => (drops.current[i] = m)} position={[s.x, 0, 0.008]} material={dropMat}>
          <planeGeometry args={[0.008, 0.1]} />
        </mesh>
      ))}
    </group>
  )
}

// SJ's pinboard on the glass, like the reference: notes, photos and printouts pinned up and joined
// with red string. (Later: make the notes clickable — projects, CTF writeups, ideas.)
const NOTES = [
  // [x, y, w, h, colour, tilt]
  [-0.92, 0.14, 0.16, 0.1, '#e9e4d8', 0.05],
  [-0.7, 0.02, 0.12, 0.17, '#c4cf86', -0.04],
  [-0.74, -0.24, 0.11, 0.08, '#3a3f44', 0.08],
  [-0.48, 0.1, 0.14, 0.19, '#dcdfd2', 0.03],
  [-0.44, -0.2, 0.1, 0.12, '#a9b07a', -0.06],
  [-0.22, 0.25, 0.17, 0.12, '#e6e1d6', -0.02],
  [-0.16, -0.02, 0.11, 0.14, '#cfc8b6', 0.06],
  [0.02, 0.26, 0.13, 0.09, '#4a4f55', 0.04],
  [0.06, -0.24, 0.1, 0.15, '#c4cf86', -0.05],
  [0.24, 0.1, 0.14, 0.11, '#e9e4d8', 0.02],
  [0.3, -0.14, 0.12, 0.17, '#b8b38f', -0.03],
  [0.52, 0.2, 0.17, 0.1, '#3a3f44', 0.05],
]
const STRINGS = [[0, 1], [1, 3], [3, 5], [5, 7], [3, 6], [6, 8], [6, 9], [9, 11], [9, 10], [2, 4], [4, 6], [1, 2], [7, 9]]
function PinBoard() {
  const strings = useMemo(
    () =>
      STRINGS.map(([a, b]) => {
        const [x0, y0, , h0] = NOTES[a]
        const [x1, y1, , h1] = NOTES[b]
        const p0 = [x0, y0 + h0 / 2 - 0.02]
        const p1 = [x1, y1 + h1 / 2 - 0.02]
        const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1])
        return { x: (p0[0] + p1[0]) / 2, y: (p0[1] + p1[1]) / 2, len, angle: Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) }
      }),
    []
  )
  return (
    <group position={[-0.05, CY + 0.02, -0.088]}>
      {NOTES.map(([x, y, w, h, color, tilt], i) => (
        <group key={i} position={[x, y, 0]} rotation-z={tilt}>
          <mesh>
            <planeGeometry args={[w, h]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
          {/* a few scribbled lines on the lighter notes */}
          {color > '#9' &&
            [0.25, 0.05, -0.15].map((ly) => (
              <mesh key={ly} position={[-w * 0.08, ly * h, 0.001]}>
                <planeGeometry args={[w * 0.6, 0.006]} />
                <meshBasicMaterial color="#5a5a52" />
              </mesh>
            ))}
          <mesh position={[0, h / 2 - 0.02, 0.008]}>
            <sphereGeometry args={[0.011, 8, 6]} />
            <meshStandardMaterial color="#c4161c" roughness={0.3} />
          </mesh>
        </group>
      ))}
      {strings.map(({ x, y, len, angle }, i) => (
        <mesh key={`s${i}`} position={[x, y, 0.006]} rotation-z={angle}>
          <boxGeometry args={[len, 0.005, 0.003]} />
          <meshStandardMaterial color="#b0121a" emissive="#5a0508" emissiveIntensity={0.6} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

// ---------- shutter ----------
const SLATS = 15
const SLAT_D = 0.085
const RAIL = 0.07 // headrail height
// Positions the shutter picks between at random, any time of day: how far raised (1 = all the way
// up) and slat tilt (0 = slats open, 1.3 = shut). Weighted so it's mostly fully open or fully shut.
const MOVES = [
  [{ open: 1, tilt: 0 }, 3],
  [{ open: 0, tilt: 1.3 }, 2],
  [{ open: 0, tilt: 0.2 }, 1.5],
  [{ open: 0.5, tilt: 0.25 }, 1],
  [{ open: 0.3, tilt: 0.6 }, 1],
]
const MOVES_TOTAL = MOVES.reduce((a, [, w]) => a + w, 0)
const OUT_OF_THE_WAY = { open: 1, tilt: 0 }
const SHUTTER_SECONDS = [15, 45] // how long it stays put before moving again

// Half-width of the opening at height y (narrower where the corners are cut)
const halfWidthAt = (y) => HW - Math.max(0, CH - (TOP - y), CH - (y - BOT))

function Shutter() {
  const slats = useRef([])
  const bottom = useRef()
  const strings = useRef([])
  const st = useRef({ open: 0.55, tilt: 0.2, to: { open: 0.55, tilt: 0.2 }, timer: 6 })

  useFrame((_, dt) => {
    const s = st.current
    // Clicking the window rolls the shutter up out of the way; otherwise it moves at random
    const atWindow = useStore.getState().activeZone === 'window'
    if (atWindow) {
      s.to = OUT_OF_THE_WAY
      s.timer = 4 // after you leave, wait a moment before it starts moving again
    } else if (env.shutter) s.to = env.shutter
    else if ((s.timer -= dt) <= 0) {
      let next
      do {
        let r = Math.random() * MOVES_TOTAL
        next = MOVES.find(([, w]) => (r -= w) < 0)[0]
      } while (next === s.to)
      s.to = next
      s.timer = SHUTTER_SECONDS[0] + Math.random() * (SHUTTER_SECONDS[1] - SHUTTER_SECONDS[0])
    }
    // Motor speed: constant, like a real blind (quick when it's getting out of your way)
    const step = (v, to, speed) => v + Math.sign(to - v) * Math.min(Math.abs(to - v), speed * dt)
    s.open = step(s.open, s.to.open, atWindow ? 0.7 : 0.16)
    s.tilt = step(s.tilt, s.to.tilt, atWindow ? 2.5 : 0.7)

    const railY = TOP - RAIL
    const bottomY = railY - 0.02 - (1 - s.open) * (H - RAIL - 0.06)
    const pitch = (railY - bottomY) / SLATS
    // Raised slats stack up flat; tilt only when there's room to swing
    const tilt = s.tilt * Math.min(1, Math.max(0, (pitch - 0.022) / SLAT_D))
    slats.current.forEach((m, i) => {
      if (!m) return
      const y = railY - (i + 1) * pitch
      m.position.y = y
      m.scale.x = Math.max(0.01, 2 * halfWidthAt(y) - 0.03)
      m.rotation.x = tilt
    })
    bottom.current.position.y = bottomY
    bottom.current.scale.x = 2 * halfWidthAt(bottomY) - 0.03
    strings.current.forEach((m) => {
      if (!m) return
      m.scale.y = Math.max(0.001, railY - bottomY)
      m.position.y = (railY + bottomY) / 2
    })
  })

  const slatMat = <meshStandardMaterial color="#cdb998" roughness={0.6} />
  return (
    <group position={[0, 0, -0.01]}>
      <mesh position={[0, TOP - RAIL / 2, 0]} castShadow>
        <boxGeometry args={[W - 2 * CH - 0.02, RAIL, 0.09]} />
        <meshStandardMaterial color="#bdb4a5" roughness={0.6} />
      </mesh>
      {Array.from({ length: SLATS }).map((_, i) => (
        <mesh key={i} ref={(m) => (slats.current[i] = m)} castShadow receiveShadow>
          <boxGeometry args={[1, 0.02, SLAT_D]} />
          {slatMat}
        </mesh>
      ))}
      <mesh ref={bottom} castShadow>
        <boxGeometry args={[1, 0.028, SLAT_D + 0.01]} />
        <meshStandardMaterial color="#a89f90" roughness={0.6} />
      </mesh>
      {[-0.55, 0.55].map((f, i) => (
        <mesh key={f} ref={(m) => (strings.current[i] = m)} position={[HW * f, 0, 0.034]}>
          <boxGeometry args={[0.006, 1, 0.006]} />
          <meshStandardMaterial color="#efe9dd" />
        </mesh>
      ))}
    </group>
  )
}

// ---------- the view outside ----------
const OW = 4.8 // outside layers are wider/taller than the opening so it works from any angle
const OH = 2.6
const PRECIP = 240
const dummy = new Object3D()
const tmp = new Color()
const WHITE = new Color('#ffffff')
// Futuristic Sydney, night → day: the far suburbs melt into the haze, the CBD and the harbour's
// landmarks in the middle, neon towers framing the sides stay darkest
const CITY = {
  far: [new Color('#141b3a'), new Color('#8b9ab3')],
  mid: [new Color('#0b1124'), new Color('#5f6f88')],
  harbour: [new Color('#2b3352'), new Color('#e4e9f0')],
  near: [new Color('#05070e'), new Color('#2c3444')],
}
const WATER = [new Color('#0b1730'), new Color('#3f78a8')]
const WATER_Y = -0.3 // the waterline, relative to the window's centre
const HAZE_NIGHT = new Color('#1a2a50')
const NEON_FOG = [new Color('#d8dde6'), new Color('#ff2448')] // day, night
const HAZE_DAY = new Color('#b9c6d6')
const CARS = 36
const CAR_COLOURS = ['#fff4e0', '#ff3a4f', '#2ef2ff', '#ff2fa8', '#ffe2a8']
const FOG_DAY = new Color('#c9cfd8')
const FOG_NIGHT = new Color('#2a2838')

function Outside() {
  const tex = useMemo(
    () => ({
      // Sydney across the harbour: low far skyline, the CBD with Sydney Tower, the Opera House and
      // Harbour Bridge on the water, neon towers framing both sides of the view
      far: makeCityLayer({ seed: 3, w: 1024, h: 512, base: WATERLINE, minW: 10, maxW: 34, minH: 0.04, maxH: 0.16, gap: [0, 3], floor: 4, windowsOn: 0.3, signs: 0, billboards: 0, crowns: 0.05 }),
      mid: (() => {
        const mid = makeCityLayer({ seed: 9, w: 2048, h: 1024, base: WATERLINE, minW: 50, maxW: 120, minH: 0.08, maxH: 0.42, gap: [4, 22], floor: 8, windowsOn: 0.3, signs: 0.15, billboards: 0.12, crowns: 0.35 })
        drawSydneyTower(mid, 0.47 * 2048, WATERLINE * 1024, 1024)
        return mid
      })(),
      harbour: makeHarbour(),
      water: makeWater({ reflections: [[0.47, '#ffcc66', 18, 0.9, 0.9], [0.34, '#2ef2ff', 60, 0.6, 0.6], [0.66, '#2ef2ff', 120, 0.5, 0.45]] }),
      near: makeCityLayer({ seed: 17, w: 1024, h: 1024, minW: 90, maxW: 140, minH: 0.75, maxH: 0.95, gap: [3, 8], floor: 12, windowsOn: 0.4, signs: 0.8, billboards: 0.7, crowns: 0.4, edges: [[0, 0.24], [0.78, 1]] }),
      haze: makeHaze(),
      clouds: makeClouds(),
      stars: makeStars(),
      glow: makeGlow(),
      cityGlow: makeCityGlow(),
      bolt: makeBolt(),
    }),
    []
  )
  const sky = useMemo(() => {
    const g = new PlaneGeometry(OW, OH)
    g.setAttribute('color', new Float32BufferAttribute(new Float32Array(12), 3))
    return g
  }, [])
  const precip = useMemo(
    () =>
      Array.from({ length: PRECIP }, () => ({
        x: (Math.random() - 0.5) * OW * 0.9,
        y: Math.random() * OH,
        z: -0.38 + Math.random() * 0.22,
        v: 0.7 + Math.random() * 0.6,
        p: Math.random() * Math.PI * 2,
      })),
    []
  )
  // flying traffic: lights drifting across in lanes between the towers
  const cars = useMemo(
    () =>
      Array.from({ length: CARS }, (_, i) => ({
        x: (Math.random() - 0.5) * OW,
        y: CY - 0.2 + Math.floor(Math.random() * 5) * 0.16 + Math.random() * 0.03,
        z: -0.7 + Math.random() * 0.16,
        v: (0.08 + Math.random() * 0.35) * (i % 2 ? 1 : -1),
        len: 0.6 + Math.random() * 1.6,
        color: new Color(CAR_COLOURS[i % CAR_COLOURS.length]),
      })),
    []
  )
  // the MOON LIGHT billboard on the left tower, neon signs that stutter and swap colour, neon fog
  const neon = useMemo(() => {
    const fog = makeNeonFog()
    const fogB = fog.clone()
    fogB.needsUpdate = true
    return {
      billboard: createMoonlightBillboard(),
      signs: [
        { sign: createFlickerSign('BAR', ['#ff2fa8', '#2ef2ff']), at: [-1.12, CY + 0.3, -0.494], size: [0.07, 0.21] },
        { sign: createFlickerSign('OPEN', ['#ff3048', '#3a7bff'], { vertical: false }), at: [-1.4, CY - 0.46, -0.494], size: [0.2, 0.09] },
        { sign: createFlickerSign('HOTEL', ['#2ef2ff', '#39ff9c']), at: [1.42, CY + 0.12, -0.494], size: [0.07, 0.33] },
      ],
      fog,
      fogB,
    }
  }, [])
  const signMeshes = useRef([])
  const r = useRef({})
  const set = (k) => (o) => (r.current[k] = o)
  useEffect(() => {
    cars.forEach((c, i) => r.current.cars.setColorAt(i, c.color))
    r.current.cars.instanceColor.needsUpdate = true
  }, [cars])

  useFrame(({ clock }, dt) => {
    const o = r.current
    const t = clock.elapsedTime
    const { daylight: day, cloud } = env

    const col = sky.attributes.color
    for (let i = 0; i < 4; i++) {
      const c = i < 2 ? env.skyTop : env.skyLow
      col.setXYZ(i, c.r, c.g, c.b)
    }
    col.needsUpdate = true

    o.stars.material.opacity = (1 - day) ** 3 * (1 - cloud) * 0.9

    // Lightning bolt somewhere new on each strike
    if (env.flash > 0.95 && !o.bolt.visible) {
      tex.bolt.redraw()
      o.bolt.position.x = (Math.random() - 0.5) * (W - 0.6)
    }
    o.bolt.visible = env.flash > 0.35
    o.bolt.material.opacity = env.flash
    // Sun and moon arc across the sky, opposite each other, hidden by cloud
    o.sun.position.set(env.sunX * 1.9, 0.2 + env.sunElev * 2.1, -0.76)
    o.sun.visible = env.sunElev > -0.15
    o.sunCore.material.color.copy(env.light).multiplyScalar(1.15)
    o.sunGlow.material.opacity = 0.55 * (1 - cloud * 0.9)
    o.sunCore.material.opacity = 1 - cloud * 0.85
    o.moon.position.set(-env.sunX * 1.9, 0.2 - env.sunElev * 2.1, -0.76)
    o.moon.visible = env.sunElev < 0.15
    o.moon.material.opacity = (1 - cloud * 0.9) * (1 - day)

    // Clouds drift; brighter by day, darker in storms
    tmp.copy(env.skyLow).lerp(WHITE, 0.25 + day * 0.5).multiplyScalar((0.35 + day * 0.65) * (1 - env.storm * 0.5) + env.flash)
    ;[o.cloudA, o.cloudB].forEach((m, i) => {
      m.material.map.offset.x = t * (0.004 + i * 0.003)
      m.material.color.copy(tmp)
      m.material.opacity = 0.03 + cloud * (0.75 - i * 0.15)
    })

    // City: dark towers and blazing neon at night, hazy blue-grey glass by day; haze thickens with fog
    for (const [k, haze] of [['far', 0.25], ['mid', 0.1], ['harbour', 0.05], ['near', 0]]) {
      o[k].material.color.copy(CITY[k][0]).lerp(CITY[k][1], day).lerp(env.skyLow, haze + env.fog * 0.4)
      o[k + 'Lights'].material.color.setScalar((0.25 + (1 - day) * 1.5) * (1 - env.fog * 0.4 * (1 - haze)) + env.flash * 0.5)
    }
    o.water.material.color.copy(WATER[0]).lerp(WATER[1], day).lerp(env.skyLow, 0.15 + env.fog * 0.3)
    o.waterLights.material.color.setScalar(0.1 + (1 - day) * 1.3)
    o.waterLights.position.y = CY + WATER_Y - 0.5 + Math.sin(t * 0.8) * 0.004 // the reflections shimmer
    tmp.copy(HAZE_NIGHT).lerp(HAZE_DAY, day).lerp(env.skyLow, 0.3)
    o.haze1.material.color.copy(tmp)
    o.haze1.material.opacity = 0.4 + env.fog * 0.45

    // Billboard + signs: brighter at night; the neon fog drifts, crimson after dark
    neon.billboard.tick(dt)
    o.billboard.material.color.setScalar(0.9 + (1 - day) * 0.9)
    o.bbGlow.material.opacity = 0.15 + (1 - day) * 0.45
    neon.signs.forEach(({ sign }, i) => signMeshes.current[i]?.material.color.setScalar(sign.tick(dt) * (0.8 + (1 - day) * 1.0)))
    neon.fog.offset.x = t * 0.012
    neon.fogB.offset.x = 0.37 - t * 0.008
    tmp.copy(NEON_FOG[0]).lerp(NEON_FOG[1], 1 - day)
    o.fogA.material.color.copy(tmp)
    o.fogB.material.color.copy(tmp)
    o.fogA.material.opacity = 0.1 + (1 - day) * 0.26 + env.fog * 0.3
    o.fogB.material.opacity = 0.06 + (1 - day) * 0.18 + env.fog * 0.3

    // Flying traffic
    cars.forEach((c, i) => {
      c.x += c.v * dt
      if (c.x > OW / 2) c.x -= OW
      if (c.x < -OW / 2) c.x += OW
      dummy.position.set(c.x, c.y, c.z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(c.len, 1, 1)
      dummy.updateMatrix()
      o.cars.setMatrixAt(i, dummy.matrix)
    })
    o.cars.instanceMatrix.needsUpdate = true
    o.cars.material.opacity = 0.3 + (1 - day) * 0.7

    // neon city glow at night, reflected more strongly off low cloud
    o.cityGlow.material.opacity = (1 - day) * (0.3 + cloud * 0.35)

    o.fog.material.color.copy(FOG_NIGHT).lerp(FOG_DAY, day)
    o.fog.material.opacity = env.fog * 0.6 + env.rain * 0.12 + env.snow * 0.06

    // Rain streaks and snowflakes between the city and the glass
    const rainN = Math.round(PRECIP * env.rain)
    const snowN = Math.round(PRECIP * env.snow)
    o.rain.count = rainN
    o.snow.count = snowN
    const n = Math.max(rainN, snowN)
    for (let i = 0; i < n; i++) {
      const p = precip[i]
      if (i < rainN) {
        const y = (((p.y - t * 6.5 * p.v) % OH) + OH) % OH
        dummy.position.set(p.x - y * 0.12 + 0.12 * OH, y + CY - OH / 2, p.z)
        dummy.rotation.set(0, 0, -0.12)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        o.rain.setMatrixAt(i, dummy.matrix)
      }
      if (i < snowN) {
        const y = (((p.y - t * 0.3 * p.v) % OH) + OH) % OH
        dummy.position.set(p.x + Math.sin(t * 1.3 + p.p) * 0.08, y + CY - OH / 2, p.z)
        dummy.rotation.set(0, 0, t + p.p)
        dummy.scale.setScalar(0.6 + p.v * 0.5)
        dummy.updateMatrix()
        o.snow.setMatrixAt(i, dummy.matrix)
      }
    }
    o.rain.instanceMatrix.needsUpdate = true
    o.snow.instanceMatrix.needsUpdate = true
    o.rain.material.color.copy(tmp.copy(WHITE).multiplyScalar(0.55 + day * 0.35 + env.flash))

    // Snow piling up on the outside ledge
    o.snowLedge.scale.y = Math.max(0.001, env.snowCover)
    o.snowLedge.visible = env.snowCover > 0.01
  })

  const basic = { toneMapped: false, depthWrite: false, transparent: true }
  return (
    <group>
      <mesh geometry={sky} position={[0, CY, -0.8]}>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </mesh>
      <mesh ref={set('stars')} position={[0, CY, -0.79]}>
        <planeGeometry args={[OW, OH]} />
        <meshBasicMaterial map={tex.stars} blending={AdditiveBlending} {...basic} />
      </mesh>
      <group ref={set('sun')}>
        <mesh ref={set('sunGlow')}>
          <planeGeometry args={[1.2, 1.2]} />
          <meshBasicMaterial map={tex.glow} color="#ffd9a0" {...basic} />
        </mesh>
        <mesh ref={set('sunCore')} position={[0, 0, 0.001]}>
          <circleGeometry args={[0.16, 32]} />
          <meshBasicMaterial {...basic} />
        </mesh>
      </group>
      <mesh ref={set('moon')}>
        <circleGeometry args={[0.12, 32]} />
        <meshBasicMaterial color={[1.4, 1.45, 1.6]} {...basic} />
      </mesh>
      <mesh ref={set('bolt')} position={[0, CY + 0.35, -0.7]} visible={false}>
        <planeGeometry args={[0.7, 1.6]} />
        <meshBasicMaterial map={tex.bolt} color={[2, 2, 2.4]} {...basic} />
      </mesh>
      {/* cool neon glow over the city at night */}
      <mesh ref={set('cityGlow')} position={[0, CY - 0.15, -0.745]}>
        <planeGeometry args={[OW, OH * 0.95]} />
        <meshBasicMaterial map={tex.cityGlow} color="#3f7dff" blending={AdditiveBlending} {...basic} />
      </mesh>
      <mesh ref={set('cloudA')} position={[0, CY + 0.6, -0.72]}>
        <planeGeometry args={[OW, 1.3]} />
        <meshBasicMaterial map={tex.clouds} {...basic} />
      </mesh>
      {/* Sydney, back to front: far skyline, haze, the CBD and Sydney Tower, the Opera House and the
          Harbour Bridge, the harbour with its reflections, flying traffic, neon towers at the sides */}
      <mesh ref={set('far')} position={[0, CY, -0.74]}>
        <planeGeometry args={[OW, OH]} />
        <meshBasicMaterial map={tex.far.shape} {...basic} />
      </mesh>
      <mesh ref={set('farLights')} position={[0, CY, -0.739]}>
        <planeGeometry args={[OW, OH]} />
        <meshBasicMaterial map={tex.far.lights} blending={AdditiveBlending} {...basic} />
      </mesh>
      <mesh ref={set('haze1')} position={[0, CY - 0.3, -0.7]}>
        <planeGeometry args={[OW, 2.0]} />
        <meshBasicMaterial map={tex.haze} {...basic} />
      </mesh>
      <mesh ref={set('cloudB')} position={[0.4, CY + 0.25, -0.66]}>
        <planeGeometry args={[OW, 1.0]} />
        <meshBasicMaterial map={tex.clouds} {...basic} />
      </mesh>
      <mesh ref={set('mid')} position={[0, CY, -0.64]}>
        <planeGeometry args={[OW, OH]} />
        <meshBasicMaterial map={tex.mid.shape} {...basic} />
      </mesh>
      <mesh ref={set('midLights')} position={[0, CY, -0.639]}>
        <planeGeometry args={[OW, OH]} />
        <meshBasicMaterial map={tex.mid.lights} blending={AdditiveBlending} {...basic} />
      </mesh>
      <mesh ref={set('harbour')} position={[0, CY, -0.6]}>
        <planeGeometry args={[OW, OH]} />
        <meshBasicMaterial map={tex.harbour.shape} {...basic} />
      </mesh>
      <mesh ref={set('harbourLights')} position={[0, CY, -0.599]}>
        <planeGeometry args={[OW, OH]} />
        <meshBasicMaterial map={tex.harbour.lights} blending={AdditiveBlending} {...basic} />
      </mesh>
      <mesh ref={set('water')} position={[0, CY + WATER_Y - 0.5, -0.57]}>
        <planeGeometry args={[OW, 1.0]} />
        <meshBasicMaterial map={tex.water.shape} {...basic} />
      </mesh>
      <mesh ref={set('waterLights')} position={[0, CY + WATER_Y - 0.5, -0.569]}>
        <planeGeometry args={[OW, 1.0]} />
        <meshBasicMaterial map={tex.water.lights} blending={AdditiveBlending} {...basic} />
      </mesh>
      <instancedMesh ref={set('cars')} args={[undefined, undefined, CARS]} frustumCulled={false}>
        <planeGeometry args={[0.03, 0.008]} />
        <meshBasicMaterial blending={AdditiveBlending} {...basic} />
      </instancedMesh>
      {/* neon fog rolling low over the harbour */}
      <mesh ref={set('fogA')} position={[0, CY - 0.4, -0.545]}>
        <planeGeometry args={[OW, 0.9]} />
        <meshBasicMaterial map={neon.fog} {...basic} />
      </mesh>
      <mesh ref={set('fogB')} position={[0, CY - 0.48, -0.515]}>
        <planeGeometry args={[OW, 0.8]} />
        <meshBasicMaterial map={neon.fogB} {...basic} />
      </mesh>
      <mesh ref={set('near')} position={[0, CY, -0.5]}>
        <planeGeometry args={[OW, OH]} />
        <meshBasicMaterial map={tex.near.shape} {...basic} />
      </mesh>
      <mesh ref={set('nearLights')} position={[0, CY, -0.499]}>
        <planeGeometry args={[OW, OH]} />
        <meshBasicMaterial map={tex.near.lights} blending={AdditiveBlending} {...basic} />
      </mesh>
      {/* the MOON LIGHT billboard on the left tower (frame, red halo, pixel screen), and neon signs */}
      <group position={[-1.4, CY + 0.08, -0.495]}>
        <mesh ref={set('bbGlow')} position-z={-0.003}>
          <planeGeometry args={[1.1, 1.5]} />
          <meshBasicMaterial map={tex.glow} color="#ff2a3a" blending={AdditiveBlending} {...basic} />
        </mesh>
        <mesh position-z={-0.002}>
          <planeGeometry args={[0.48, 0.92]} />
          <meshBasicMaterial color="#0b0a10" />
        </mesh>
        <mesh ref={set('billboard')}>
          <planeGeometry args={[0.44, 0.88]} />
          <meshBasicMaterial map={neon.billboard.texture} toneMapped={false} />
        </mesh>
      </group>
      {neon.signs.map(({ sign, at, size }, i) => (
        <mesh key={i} ref={(m) => (signMeshes.current[i] = m)} position={at}>
          <planeGeometry args={size} />
          <meshBasicMaterial map={sign.texture} transparent toneMapped={false} />
        </mesh>
      ))}
      <mesh ref={set('fog')} position={[0, CY, -0.44]}>
        <planeGeometry args={[OW, OH]} />
        <meshBasicMaterial {...basic} />
      </mesh>
      <instancedMesh ref={set('rain')} args={[undefined, undefined, PRECIP]} frustumCulled={false}>
        <planeGeometry args={[0.006, 0.14]} />
        <meshBasicMaterial {...basic} opacity={0.55} />
      </instancedMesh>
      <instancedMesh ref={set('snow')} args={[undefined, undefined, PRECIP]} frustumCulled={false}>
        <planeGeometry args={[0.022, 0.022]} />
        <meshBasicMaterial color="#ffffff" {...basic} opacity={0.9} />
      </instancedMesh>
      {/* outside ledge, where snow piles up */}
      <mesh position={[0, BOT - 0.03, -0.24]}>
        <boxGeometry args={[W + 0.4, 0.06, 0.16]} />
        <meshStandardMaterial color={C.metalDark} />
      </mesh>
      <mesh ref={set('snowLedge')} position={[0, BOT, -0.24]}>
        <boxGeometry args={[W + 0.36, 0.08, 0.15]} />
        <meshStandardMaterial color="#f2f5ff" roughness={0.9} />
      </mesh>
    </group>
  )
}

// Light into the room: a soft glow that takes on the sky's colour, and a shadow-casting sun/moon
// beam through the shutter. At night both turn warm sodium orange (the city outside), flooding the
// bed area like the reference while the rest of the room stays teal. Lightning flashes both.
const PINK = new Color(C.pink)
const SNOW_LIGHT = new Color('#b8d8ff') // the cool blue-white glow snow gives off, like the video
const SODIUM = new Color('#8a7cff') // the city's cool neon light pouring in at night
const NIGHT_BEAM = new Vector3(0.9, CY + 0.45, -3.2)
const NIGHT_TARGET = new Vector3(-0.4, 0, 1.3)
const tmpPos = new Vector3()
function WindowLights() {
  const glow = useRef()
  const beam = useRef()
  const target = useMemo(() => new Object3D(), [])

  useFrame(() => {
    const day = env.daylight
    const night = 1 - day
    glow.current.color.copy(PINK).lerp(env.skyLow, 0.35 + day * 0.65).lerp(SODIUM, night * 0.75)
    glow.current.color.lerp(SNOW_LIGHT, env.snowCover * 0.4).lerp(WHITE, env.flash * 0.6)
    glow.current.intensity = 0.7 + day * 1.6 * (1 - env.cloud * 0.4) + night * 4.2 + env.flash * 30

    // Beam comes from wherever the sun (or moon) is in the sky
    const sx = env.sunElev > 0 ? env.sunX : -env.sunX
    const elev = Math.abs(env.sunElev)
    // (kept below the top of the wall so it only gets in through the window)
    // (at night it comes from the city instead: low, warm, slatted across the bed)
    beam.current.position.copy(tmpPos.set(sx * 2.4, CY + 0.3 + elev * 1.0, -3.0)).lerp(NIGHT_BEAM, night)
    target.position.set(-sx * 0.7, 0, 2.2).lerp(NIGHT_TARGET, night)
    beam.current.color.copy(env.light).lerp(SODIUM, night * 0.9).lerp(WHITE, env.flash)
    beam.current.intensity = env.lightAmount * 20 + night * 26 * (1 - env.fog * 0.4) + env.flash * 60
  })

  return (
    <group>
      <pointLight ref={glow} position={[0, CY, 0.9]} distance={4.5} />
      <primitive object={target} />
      <spotLight
        ref={beam}
        target={target}
        angle={0.42}
        penumbra={0.55}
        distance={12}
        decay={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={12}
      />
    </group>
  )
}
