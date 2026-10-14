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
} from 'three'
import { WINDOW } from '../../data/zones'
import { env, tickEnvironment } from '../../lib/environment'
import { makeBolt, makeClouds, makeForest, makeGlow, makeGround, makeSkyline, makeStars } from '../../lib/outside'
import { C } from './materials'

// The big upstairs window: a real opening in the back wall (Room.jsx leaves the hole) with a chunky
// chamfered frame, a venetian shutter that raises, lowers and tilts on its own, and a live view
// outside (like the reference video): a winter forest in front of a faint city skyline, with a
// day/night sky, sun + moon, clouds, and rain / snow / fog / lightning. Snow settles on the
// branches and ground while it snows and melts after.
// Sun or moonlight shines in through the slats and casts striped shadows into the room.
// Local: wall face at z ≈ 0, room is +z, outside is -z. Weather/time live in lib/environment.js.
const { w: W, h: H, cy: CY, chamfer: CH } = WINDOW
const HW = W / 2
const HH = H / 2
const TOP = CY + HH
const BOT = CY - HH
const FRAME = '#c9c4bb'
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
      <Shutter />
      <Outside />
      <WindowLights />
    </group>
  )
}

function Frame() {
  const plate = useMemo(() => {
    const M = 0.18
    const s = new Shape()
    s.moveTo(-HW - M, -HH - M)
    s.lineTo(HW + M, -HH - M)
    s.lineTo(HW + M, HH + M)
    s.lineTo(-HW - M, HH + M)
    const hole = new Path()
    OCT.forEach(([x, y], i) => (i ? hole.lineTo(x, y) : hole.moveTo(x, y)))
    s.holes.push(hole)
    return new ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false })
  }, [])

  // One deep panel along each edge of the opening, from the back of the wall to the face plate
  const D = 0.06 - WALL_BACK
  const panels = OCT.map(([x0, y0], i) => {
    const [x1, y1] = OCT[(i + 1) % OCT.length]
    const len = Math.hypot(x1 - x0, y1 - y0)
    const nx = (y1 - y0) / len
    const ny = -(x1 - x0) / len
    return { len, angle: Math.atan2(y1 - y0, x1 - x0), x: (x0 + x1) / 2 + nx * 0.03, y: (y0 + y1) / 2 + ny * 0.03 }
  })

  return (
    <group position={[0, CY, 0]}>
      <mesh geometry={plate} position={[0, 0, 0.06]} castShadow receiveShadow>
        <meshStandardMaterial color={FRAME} roughness={0.7} />
      </mesh>
      {panels.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, WALL_BACK + D / 2]} rotation-z={p.angle} castShadow receiveShadow>
          <boxGeometry args={[p.len + 0.01, 0.06, D]} />
          <meshStandardMaterial color={i % 2 ? '#b5ad9f' : FRAME} roughness={0.75} />
        </mesh>
      ))}
      {/* Deep sill inside the room, with the plant */}
      <mesh position={[0, -HH - 0.02, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[W - 2 * CH + 0.3, 0.05, 0.3]} />
        <meshStandardMaterial color={FRAME} roughness={0.7} />
      </mesh>
      <mesh position={[-HW + 0.45, -HH + 0.08, 0.2]} castShadow>
        <cylinderGeometry args={[0.07, 0.055, 0.14, 12]} />
        <meshStandardMaterial color={C.coral} />
      </mesh>
      <mesh position={[-HW + 0.45, -HH + 0.22, 0.2]} castShadow>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshStandardMaterial color="#3f8f5a" />
      </mesh>
    </group>
  )
}

const DROPS = 60
function Glass() {
  const glass = useMemo(() => {
    const s = new Shape()
    OCT.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
    return new ShapeGeometry(s)
  }, [])
  const drops = useRef([])
  const dropMat = useMemo(() => new MeshBasicMaterial({ color: '#cfe9ff', transparent: true, opacity: 0.45, depthWrite: false }), [])
  const seeds = useMemo(
    () => Array.from({ length: DROPS }, (_, i) => ({ x: (Math.random() - 0.5) * (W - 2 * CH), speed: 0.25 + Math.random() * 0.5, off: i * 0.37 })),
    []
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
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
      <mesh geometry={glass}>
        <meshBasicMaterial color="#cfe0ff" transparent opacity={0.05} depthWrite={false} />
      </mesh>
      {/* Raindrops running down the glass */}
      {seeds.map((s, i) => (
        <mesh key={i} ref={(m) => (drops.current[i] = m)} position={[s.x, 0, 0.003]} material={dropMat}>
          <planeGeometry args={[0.008, 0.1]} />
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
// beam through the shutter. Lightning flashes both.
const PINK = new Color(C.pink)
const SNOW_LIGHT = new Color('#b8d8ff') // the cool blue-white glow snow gives off, like the video
function WindowLights() {
  const glow = useRef()
  const beam = useRef()
  const target = useMemo(() => new Object3D(), [])

  useFrame(() => {
    const day = env.daylight
    glow.current.color.copy(PINK).lerp(env.skyLow, 0.35 + day * 0.65).lerp(SNOW_LIGHT, env.snowCover * 0.55).lerp(WHITE, env.flash * 0.6)
    glow.current.intensity = 1.2 + day * 2.2 * (1 - env.cloud * 0.4) + env.flash * 30

    // Beam comes from wherever the sun (or moon) is in the sky
    const sx = env.sunElev > 0 ? env.sunX : -env.sunX
    const elev = Math.abs(env.sunElev)
    // (kept below the top of the wall so it only gets in through the window)
    beam.current.position.set(sx * 2.4, CY + 0.3 + elev * 1.0, -3.0)
    target.position.set(-sx * 0.7, 0, 2.2)
    beam.current.color.copy(env.light).lerp(WHITE, env.flash)
    beam.current.intensity = env.lightAmount * 60 + env.flash * 80
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
