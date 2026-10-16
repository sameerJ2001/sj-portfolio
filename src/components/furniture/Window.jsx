import { useMemo, useRef } from 'react'
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
import { env, tickEnvironment } from '../../lib/environment'
import {
  makeBolt,
  makeCityGlow,
  makeClouds,
  makeForest,
  makeFrostTexture,
  makeGlassGlintTexture,
  makeGlow,
  makeGround,
  makeSkyline,
  makeStars,
} from '../../lib/outside'
import { C } from './materials'

// The big upstairs window, like the reference: a deep opening in the back wall (Room.jsx leaves the
// hole) framed by stepped chamfered layers, with frosted glass that glows like a light panel and a
// glossy, reflective surface over it, and a detective pinboard (notes joined by red string) on the
// glass. It's still live: the glow takes its colour from the real Sydney sky behind it (warm orange
// city light at night, bright cream by day, dimmer under cloud), rain runs down the glass and
// lightning flashes through. Behind the frost is the outside scene (forest, city skyline, sky, sun,
// moon, weather), faintly visible. Light pours in and casts shadows into the room.
// SHUTTER = true brings back the venetian shutter that raises, lowers and tilts on its own.
// Local: wall face at z ≈ 0, room is +z, outside is -z. Weather/time live in lib/environment.js.
const { w: W, h: H, cy: CY, chamfer: CH } = WINDOW
const HW = W / 2
const HH = H / 2
const TOP = CY + HH
const BOT = CY - HH
const SHUTTER = false
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
const FROST_NIGHT = new Color('#ff6418')
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
    // frost glow follows the sky: orange city at night, warm cream by day, greyer + dimmer under cloud
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
      {/* frosted pane glowing like a light panel; the outside scene shows through faintly */}
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
// Moves the shutter picks between: how far raised (1 = all the way up) and slat tilt (0 = open)
const MOVES = {
  day: [
    { open: 1, tilt: 0 },
    { open: 0.55, tilt: 0.15 },
    { open: 0.3, tilt: 0.35 },
    { open: 0, tilt: 0.2 },
  ],
  night: [
    { open: 0, tilt: 1.3 },
    { open: 0, tilt: 0.85 },
    { open: 0.45, tilt: 0.6 },
    { open: 1, tilt: 0 },
  ],
}
const SHUTTER_SECONDS = [10, 28]

// Half-width of the opening at height y (narrower where the corners are cut)
const halfWidthAt = (y) => HW - Math.max(0, CH - (TOP - y), CH - (y - BOT))

function Shutter() {
  const slats = useRef([])
  const bottom = useRef()
  const strings = useRef([])
  const st = useRef({ open: 0.55, tilt: 0.2, to: { open: 0.55, tilt: 0.2 }, timer: 6 })

  useFrame((_, dt) => {
    const s = st.current
    // Pick a new position every so often; mostly closed at night, mostly open by day
    if (env.shutter) s.to = env.shutter
    else if ((s.timer -= dt) <= 0) {
      const moves = Math.random() < env.daylight ? MOVES.day : MOVES.night
      let next
      do next = moves[Math.floor(Math.random() * moves.length)]
      while (next.open === s.to.open && next.tilt === s.to.tilt)
      s.to = next
      s.timer = SHUTTER_SECONDS[0] + Math.random() * (SHUTTER_SECONDS[1] - SHUTTER_SECONDS[0])
    }
    // Motor speed: constant, like a real blind
    const step = (v, to, speed) => v + Math.sign(to - v) * Math.min(Math.abs(to - v), speed * dt)
    s.open = step(s.open, s.to.open, 0.16)
    s.tilt = step(s.tilt, s.to.tilt, 0.7)

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
const CITY_FAR = [new Color('#1a1535'), new Color('#93a1bd')]
const FOREST_FAR = [new Color('#141220'), new Color('#5a6478')]
const FOREST_NEAR = [new Color('#060509'), new Color('#262b33')]
const SNOW_NIGHT = new Color('#c9d6f5')
const SNOW_DAY = new Color('#f4f7ff')
const GROUND = [new Color('#15161d'), new Color('#3c4a3a')]
const FOG_DAY = new Color('#c9cfd8')
const FOG_NIGHT = new Color('#2a2838')

function Outside() {
  const tex = useMemo(
    () => ({
      far: makeSkyline({ seed: 3, minH: 0.35, maxH: 0.95, windows: 0.22, signs: 0.15 }),
      forestFar: makeForest({ seed: 7, h: 427, count: 46, minW: 5, maxW: 14 }),
      forestNear: makeForest({ seed: 21, h: 512, count: 16, minW: 16, maxW: 40 }),
      ground: makeGround(),
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
  const r = useRef({})
  const set = (k) => (o) => (r.current[k] = o)

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

    // City: dark silhouettes with lit windows at night, hazy blue-grey by day
    o.far.material.color.copy(CITY_FAR[0]).lerp(CITY_FAR[1], day).lerp(env.skyLow, 0.2 + env.fog * 0.4)
    o.farLights.material.opacity = 0.1 + (1 - day) * 0.45 - env.fog * 0.3

    // Forest in front: trees fade into haze with distance, snow settles on them and the ground
    o.treesFar.material.color.copy(FOREST_FAR[0]).lerp(FOREST_FAR[1], day).lerp(env.skyLow, 0.25 + env.fog * 0.45)
    o.treesNear.material.color.copy(FOREST_NEAR[0]).lerp(FOREST_NEAR[1], day).lerp(env.skyLow, env.fog * 0.2)
    const snowCol = tmp.copy(SNOW_NIGHT).lerp(SNOW_DAY, day).multiplyScalar(0.95 - day * 0.22 + env.flash)
    o.snowFar.material.color.copy(snowCol).lerp(env.skyLow, 0.3)
    o.snowNear.material.color.copy(snowCol)
    o.snowFar.material.opacity = o.snowNear.material.opacity = env.snowCover
    o.ground.material.color.copy(GROUND[0]).lerp(GROUND[1], day).lerp(snowCol, env.snowCover)

    // orange city glow at night, reflected more strongly off low cloud
    o.cityGlow.material.opacity = (1 - day) * (0.55 + cloud * 0.35)

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
      {/* warm orange city glow on the horizon at night */}
      <mesh ref={set('cityGlow')} position={[0, CY - 0.15, -0.745]}>
        <planeGeometry args={[OW, OH * 0.95]} />
        <meshBasicMaterial map={tex.cityGlow} color="#ff7426" blending={AdditiveBlending} {...basic} />
      </mesh>
      <mesh ref={set('cloudA')} position={[0, CY + 0.6, -0.72]}>
        <planeGeometry args={[OW, 1.3]} />
        <meshBasicMaterial map={tex.clouds} {...basic} />
      </mesh>
      <mesh ref={set('far')} position={[0, CY - 0.7, -0.62]}>
        <planeGeometry args={[OW, 1.6]} />
        <meshBasicMaterial map={tex.far.shape} {...basic} />
      </mesh>
      <mesh ref={set('farLights')} position={[0, CY - 0.7, -0.619]}>
        <planeGeometry args={[OW, 1.6]} />
        <meshBasicMaterial map={tex.far.lights} blending={AdditiveBlending} {...basic} />
      </mesh>
      <mesh ref={set('cloudB')} position={[0.4, CY + 0.25, -0.56]}>
        <planeGeometry args={[OW, 1.0]} />
        <meshBasicMaterial map={tex.clouds} {...basic} />
      </mesh>
      <mesh ref={set('treesFar')} position={[0, CY + 0.1, -0.6]}>
        <planeGeometry args={[OW, 2.0]} />
        <meshBasicMaterial map={tex.forestFar.shape} {...basic} />
      </mesh>
      <mesh ref={set('snowFar')} position={[0, CY + 0.1, -0.599]}>
        <planeGeometry args={[OW, 2.0]} />
        <meshBasicMaterial map={tex.forestFar.snow} {...basic} />
      </mesh>
      <mesh ref={set('treesNear')} position={[0.3, CY + 0.15, -0.52]}>
        <planeGeometry args={[OW, 2.4]} />
        <meshBasicMaterial map={tex.forestNear.shape} {...basic} />
      </mesh>
      <mesh ref={set('snowNear')} position={[0.3, CY + 0.15, -0.519]}>
        <planeGeometry args={[OW, 2.4]} />
        <meshBasicMaterial map={tex.forestNear.snow} {...basic} />
      </mesh>
      <mesh ref={set('ground')} position={[0, BOT + 0.02, -0.47]}>
        <planeGeometry args={[OW, 0.5]} />
        <meshBasicMaterial map={tex.ground} {...basic} />
      </mesh>
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
const SODIUM = new Color('#ff8a3a') // city light at night
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
