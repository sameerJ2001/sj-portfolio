import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { LatheGeometry, MathUtils, MeshBasicMaterial, MeshPhysicalMaterial, Quaternion, Vector2, Vector3 } from 'three'
import { useStore } from '../store'
import { SEAT } from '../data/zones'
import RBox from './furniture/RBox'
import { badgeTexture, edgeTube, eyeTexture, hoodBand, limbMaps, loft, mount, panelMaps, thetaAt, wireBundle } from './droid/build'

// SJ-3PO: a gold protocol droid modelled on the classic film droid, sitting at the PC with his back
// to the room and looping through little "working" animations. When someone walks in (ENTER on the
// loader) he swivels round on the chair, waves, then gets back to work.
// Built to the reference: bullet-shaped head with round glowing eyes, triangle nose and slot mouth,
// a cream badge on the back of the head, ribbed neck with two hoses, sculpted breastplate with the
// ringed chest disc, a slotted back panel, exposed red/black wiring at the waist, U-ridged pelvis,
// flared gauntlet forearms, skeletal hands, ribbed knees and ankles, and the silver right shin.
// Edit SEQUENCE to change what he does and for how long (seconds).
const SEQUENCE = [
  ['type', 4],
  ['mouse', 2.5],
  ['type', 3],
  ['glance', 2],
  ['sip', 3.2],
  ['type', 4],
  ['mouse', 2],
  ['stretch', 2.6],
  ['type', 3.5],
  ['glance', 1.8],
]
const LOOP = SEQUENCE.reduce((a, [, d]) => a + d, 0)
const WAVE = 5.2 // seconds: swivel round, wave, swivel back

// How far the office chair has swivelled (radians). BattleStation reads it so the chair turns with him.
export const chairSwivel = { y: 0 }

// ---- armour shapes (lofts: rings of { y, half-width w, half-depth d, forward offset z }) ----------
// Head, in the head's frame: narrow chin pushed forward, widest at the eyes, tall bullet dome
const HEAD_N = 2.3
const HEAD = [
  { y: -0.14, w: 0.03, d: 0.035, z: 0.03 },
  { y: -0.135, w: 0.055, d: 0.06, z: 0.026 },
  { y: -0.12, w: 0.072, d: 0.08, z: 0.02 },
  { y: -0.09, w: 0.086, d: 0.095, z: 0.014 },
  { y: -0.05, w: 0.098, d: 0.105, z: 0.008 },
  { y: -0.01, w: 0.108, d: 0.112, z: 0.004 },
  { y: 0.03, w: 0.113, d: 0.117, z: 0 },
  { y: 0.07, w: 0.112, d: 0.117 },
  { y: 0.11, w: 0.104, d: 0.11 },
  { y: 0.145, w: 0.088, d: 0.095 },
  { y: 0.175, w: 0.062, d: 0.068 },
  { y: 0.195, w: 0.034, d: 0.038 },
  { y: 0.207, w: 0.012, d: 0.014 },
  { y: 0.212, w: 0.003, d: 0.004 },
]
// Breastplate, in the torso frame (origin at the hips): broad and boxy, pecs pushed forward
const CHEST_N = 2.8
const CHEST = [
  { y: 0.275, w: 0.15, d: 0.1, z: 0.01 },
  { y: 0.29, w: 0.168, d: 0.113, z: 0.012 },
  { y: 0.33, w: 0.195, d: 0.128, z: 0.014 },
  { y: 0.39, w: 0.212, d: 0.135, z: 0.014 },
  { y: 0.45, w: 0.222, d: 0.138, z: 0.012 },
  { y: 0.5, w: 0.222, d: 0.132, z: 0.008 },
  { y: 0.545, w: 0.205, d: 0.12, z: 0.004 },
  { y: 0.575, w: 0.17, d: 0.1 },
  { y: 0.6, w: 0.11, d: 0.072 },
  { y: 0.612, w: 0.06, d: 0.05 },
]
// Pelvis plate: top edge dips into a U at the front (the wires show above it)
const PELVIS_N = 2.4
const PELVIS = [
  { y: -0.05, w: 0.045, d: 0.055, z: 0.012 },
  { y: -0.035, w: 0.1, d: 0.09, z: 0.012 },
  { y: 0.0, w: 0.145, d: 0.112, z: 0.01 },
  { y: 0.05, w: 0.165, d: 0.118, z: 0.008 },
  { y: 0.1, w: 0.17, d: 0.118, z: 0.006, dip: 0.03 },
  { y: 0.16, w: 0.165, d: 0.114, z: 0.004, dip: 0.058, dipBack: 0.015 },
]
const pelvisTop = (th) => 0.16 - 0.058 * Math.max(0, Math.cos(th)) ** 3
const arc = (a, b, f, step = 0.05) => {
  const pts = []
  for (let t = a; t <= b + 1e-6; t += step) pts.push([t, f(t)])
  return pts
}

// Engraved panel lines, drawn in (θ, y) on each plate's texture. θ: 0 front, +π/2 his left (+x).
function drawHead(line) {
  line(arc(-Math.PI, Math.PI, () => 0.045)) // seam between face and dome
  for (const s of [-1, 1]) {
    line([[s * 1.12, 0.045], [s * 1.1, 0], [s * 1.05, -0.05], [s * 0.95, -0.095], [s * 0.75, -0.125]]) // face border
    line([[s * 0.24, -0.035], [s * 0.33, -0.07], [s * 0.3, -0.105]], 2.5) // muzzle
    for (const y of [-0.03, -0.012, 0.006]) line([[s * 2.0, y], [s * 2.55, y]]) // grooves on the back
  }
}
function drawChest(line) {
  line([[0, 0.61], [0, 0.46]])
  for (const s of [-1, 1]) {
    line([[0, 0.46], [s * 0.3, 0.445], [s * 0.65, 0.445], [s * 1.0, 0.47], [s * 1.2, 0.5]]) // under the pecs
    line([[s * 1.3, 0.34], [s * 1.4, 0.45], [s * 1.35, 0.56], [s * 1.1, 0.592]]) // arm sockets
    line([[s * 2.1, 0.33], [s * Math.PI, 0.33]])
  }
  line(arc(-1.45, 1.45, () => 0.3))
}
function drawPelvis(line) {
  for (const off of [0.014, 0.026, 0.038]) line(arc(-1.4, 1.4, (t) => pelvisTop(t) - off))
  for (const s of [-1, 1]) {
    line([[s * 1.25, 0.03], [s * 0.6, -0.005], [0, -0.04]])
    line([[s * 2.0, 0.07], [s * Math.PI, 0.07]])
  }
}

// Target pose for each action at time t (local seconds into the action).
// Shoulder (s) and elbow (e) angles: negative x swings forward/up, +z swings the +x arm out sideways.
function pose(action, t, T) {
  const p = {
    // hands resting on the keyboard (shoulders forward, arms angled in)
    sLx: -0.92, sLz: 0.16, eLx: -0.82,
    sRx: -0.92, sRz: -0.16, eRx: -0.82, eRz: 0, wRy: 0,
    headX: 0.2, headY: 0, headZ: 0, lean: 0.08, mugInHand: false,
  }
  const bob = Math.sin(T * 4.2) * 0.04 // nodding along to the beeps
  switch (action) {
    case 'type':
      p.eLx += Math.sin(T * 22) * 0.08
      p.eRx += Math.sin(T * 19 + 1) * 0.08
      p.headX += bob
      break
    case 'mouse':
      p.eLx += Math.sin(T * 18) * 0.04
      // right hand over to the mouse at the end of the keyboard
      p.sRx = -0.82
      p.eRx = -0.92 + Math.sin(T * 3) * 0.04
      p.sRz = 0.34 + Math.sin(T * 2.3) * 0.03
      p.headY = 0.1
      p.headX += bob * 0.5
      break
    case 'glance':
      p.eLx += Math.sin(T * 20) * 0.05
      p.headY = -0.55
      p.headX = 0.05
      break
    case 'sip': {
      // a little oil can lifted to the mouth in the middle of the action
      const lift = Math.sin(Math.min(1, t / 3.2) * Math.PI)
      p.sRx = MathUtils.lerp(-0.92, -0.6, lift)
      p.eRx = MathUtils.lerp(-0.82, -2.5, lift)
      p.sRz = MathUtils.lerp(0.15, -0.1, lift)
      p.headX = MathUtils.lerp(0.15, -0.25, lift)
      p.lean = MathUtils.lerp(0.08, -0.06, lift)
      p.mugInHand = true
      break
    }
    case 'stretch': {
      const up = Math.sin(Math.min(1, t / 2.6) * Math.PI)
      p.sLx = MathUtils.lerp(-0.92, -3.0, up)
      p.sRx = MathUtils.lerp(-0.92, -3.0, up)
      p.eLx = MathUtils.lerp(-0.82, -0.15, up)
      p.eRx = MathUtils.lerp(-0.82, -0.15, up)
      p.sLz = -0.2 * up
      p.sRz = 0.2 * up
      p.headX = MathUtils.lerp(0.2, -0.35, up)
      p.lean = MathUtils.lerp(0.08, -0.16, up)
      break
    }
    case 'wave': {
      // the room-side (+x) arm goes up, palm turned to the visitor, forearm wags; polite head tilt
      const on = MathUtils.smoothstep(t, 0.5, 1.1) * (1 - MathUtils.smoothstep(t, WAVE - 1.6, WAVE - 1.0))
      p.sRx = MathUtils.lerp(-0.4, -0.25, on)
      p.sRz = 1.25 * on
      p.eRx = MathUtils.lerp(-0.5, -0.2, on)
      p.eRz = (1.55 + Math.sin(t * 10) * 0.42) * on
      p.wRy = Math.PI * on
      p.sLx = -0.45
      p.eLx = -0.75
      p.headX = -0.05
      p.headZ = -0.18 * on
      p.lean = -0.02
      break
    }
  }
  return p
}

// Hide him when the camera flies through his head on its way to the screen
const HEAD_POS = new Vector3(SEAT.position[0], SEAT.position[1] + 1.2, SEAT.position[2])
const toCam = new Vector3()

// Angle from his forward (desk) direction to the camera, around the chair's post
function yawToCamera(camera) {
  toCam.copy(camera.position).sub(HEAD_POS)
  return MathUtils.euclideanModulo(Math.atan2(toCam.x, toCam.z) - SEAT.facing + Math.PI, Math.PI * 2) - Math.PI
}

const Y = new Vector3(0, 1, 0)
const FOREARM = new LatheGeometry(
  [
    [0.026, -0.226], [0.056, -0.226], [0.062, -0.218], [0.06, -0.206], [0.052, -0.19],
    [0.047, -0.15], [0.045, -0.07], [0.043, -0.035], [0.04, -0.022], [0.024, -0.018],
  ].map(([r, y]) => new Vector2(r, y)),
  28,
)

// Materials and geometry are built once (canvas textures need the DOM, so not at import time)
function useDroid() {
  return useMemo(() => {
    const GOLD = {
      color: '#f2c062', metalness: 0.85, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1,
      // a touch of warm emissive keeps the gold reading as gold in the dark, neon-lit loft
      envMapIntensity: 4.5, emissive: '#5c3a0a', emissiveIntensity: 0.55,
    }
    const plated = (maps, extra = {}) =>
      new MeshPhysicalMaterial({ ...GOLD, map: maps.map, emissiveMap: maps.map, bumpMap: maps.bump, bumpScale: 1.4, ...extra })

    const head = loft(HEAD, HEAD_N)
    const chest = loft(CHEST, CHEST_N)
    const pelvis = loft(PELVIS, PELVIS_N)
    const limb = limbMaps()
    return {
      geo: {
        head,
        hood: hoodBand(HEAD),
        chest,
        pelvis,
        chestLip: edgeTube(CHEST[0], CHEST_N, 0.006),
        pelvisLip: edgeTube(PELVIS[PELVIS.length - 1], PELVIS_N, 0.0055),
        wires: wireBundle({ y0: 0.12, y1: 0.295, w: 0.125, d: 0.092 }),
      },
      m: {
        head: plated(panelMaps(head, drawHead, { seed: 3 })),
        chest: plated(panelMaps(chest, drawChest, { seed: 7 })),
        pelvis: plated(panelMaps(pelvis, drawPelvis, { w: 1024, h: 256, seed: 9 })),
        limb: plated(limb),
        gold: new MeshPhysicalMaterial(GOLD),
        goldDeep: new MeshPhysicalMaterial({ ...GOLD, color: '#c99436', roughness: 0.35, envMapIntensity: 3.6, emissive: '#3d2606', emissiveIntensity: 0.5 }),
        silver: plated(limb, { color: '#dfe5e8', emissive: '#2c3236', emissiveIntensity: 0.5 }),
        joint: new MeshPhysicalMaterial({ color: '#2a2b30', metalness: 0.7, roughness: 0.35, clearcoat: 0.4, envMapIntensity: 1.6 }),
        grey: new MeshPhysicalMaterial({ color: '#5a5d63', metalness: 0.6, roughness: 0.4, envMapIntensity: 1.6 }),
        black: new MeshPhysicalMaterial({ color: '#0d0d10', metalness: 0.3, roughness: 0.5 }),
        wires: new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.45, clearcoat: 0.6 }),
        eye: new MeshBasicMaterial({ map: eyeTexture(), color: [0.98, 0.95, 0.84], toneMapped: false }),
        badge: new MeshPhysicalMaterial({ map: badgeTexture(), metalness: 0.35, roughness: 0.35, clearcoat: 0.8, envMapIntensity: 2 }),
      },
    }
  }, [])
}

export default function Character() {
  const root = useRef()
  const swivel = useRef()
  const torso = useRef()
  const shoulderL = useRef()
  const shoulderR = useRef()
  const elbowL = useRef()
  const elbowR = useRef()
  const wristR = useRef()
  const head = useRef()
  const handMug = useRef()
  const deskMug = useRef()
  const waveAt = useRef(null) // clock time the current wave started
  const wantWave = useRef(false)
  const { geo, m } = useDroid()

  // Wave whenever someone walks in: the loader's ENTER flips `entered`
  useEffect(
    () =>
      useStore.subscribe((s, prev) => {
        if (s.entered && !prev.entered) wantWave.current = true
      }),
    [],
  )

  useFrame(({ clock, camera }, dt) => {
    root.current.visible = camera.position.distanceTo(HEAD_POS) > 1.6

    const T = clock.elapsedTime
    if (wantWave.current) {
      wantWave.current = false
      waveAt.current = T
    }
    const tw = waveAt.current === null ? Infinity : T - waveAt.current

    let action = 'type'
    let t = T % LOOP
    if (tw < WAVE) {
      action = 'wave'
      t = tw
    } else {
      for (const [a, d] of SEQUENCE) {
        if (t < d) {
          action = a
          break
        }
        t -= d
      }
    }
    // Swivel the chair round to face the visitor for the wave; the head finishes the turn
    const facing = tw < WAVE - 1.4
    const turn = facing ? MathUtils.clamp(yawToCamera(camera), -2.6, 2.6) : 0
    const p = pose(action, t, T)
    if (facing) p.headY = turn * 0.08
    const k = 10
    const damp = (obj, axis, to, speed = k) => (obj.rotation[axis] = MathUtils.damp(obj.rotation[axis], to, speed, dt))
    damp(shoulderL.current, 'x', p.sLx)
    damp(shoulderL.current, 'z', p.sLz)
    damp(shoulderR.current, 'x', p.sRx)
    damp(shoulderR.current, 'z', p.sRz)
    damp(elbowL.current, 'x', p.eLx)
    damp(elbowR.current, 'x', p.eRx)
    damp(elbowR.current, 'z', p.eRz)
    damp(wristR.current, 'y', p.wRy, 8)
    damp(head.current, 'x', p.headX, 8)
    damp(head.current, 'y', p.headY, 6)
    damp(head.current, 'z', p.headZ, 6)
    damp(torso.current, 'x', p.lean, 6)
    // servo hum
    torso.current.scale.y = 1 + Math.sin(T * 2) * 0.006

    damp(swivel.current, 'y', turn * 0.92, facing ? 3.2 : 2.4)
    chairSwivel.y = swivel.current.rotation.y

    // Eyes flicker now and then
    const blink = T % 6.3 < 0.09 || (T + 1.7) % 11.1 < 0.07
    m.eye.color.setRGB(blink ? 0.4 : 0.98, blink ? 0.38 : 0.95, blink ? 0.32 : 0.84)

    handMug.current.visible = p.mugInHand && elbowR.current.rotation.x < -1.9
    deskMug.current.visible = !handMug.current.visible
  })

  const cyl = (args, material, { key, ...props } = {}) => (
    <mesh key={key} castShadow material={material} {...props}>
      <cylinderGeometry args={[...args, 24]} />
    </mesh>
  )
  const ball = (r, material, { key, ...props } = {}) => (
    <mesh key={key} castShadow material={material} {...props}>
      <sphereGeometry args={[r, 20, 14]} />
    </mesh>
  )
  const ring = (r, tube, material, { key, rotation = [Math.PI / 2, 0, 0], ...props } = {}) => (
    <mesh key={key} material={material} rotation={rotation} {...props}>
      <torusGeometry args={[r, tube, 8, 32]} />
    </mesh>
  )
  // A thin rod between two points (hoses, stray wires)
  const rod = (a, b, r, material, key) => {
    const va = new Vector3(...a)
    const dir = new Vector3(...b).sub(va)
    return (
      <mesh key={key} material={material} position={va.addScaledVector(dir, 0.5).toArray()} quaternion={new Quaternion().setFromUnitVectors(Y, dir.clone().normalize())}>
        <cylinderGeometry args={[r, r, dir.length(), 8]} />
      </mesh>
    )
  }
  // Detail stuck onto a plate's surface, facing outwards
  const onPlate = (rings, n, th, y, out, children, key) => (
    <group key={key} {...mount(rings, n, th, y, out)}>
      {children}
    </group>
  )

  // Little oil can (droids don't do coffee)
  const oilCan = (
    <>
      {cyl([0.042, 0.048, 0.1], m.goldDeep)}
      {cyl([0.043, 0.043, 0.012], m.black, { position: [0, 0.03, 0] })}
      {cyl([0.012, 0.03, 0.03], m.silver, { position: [0, 0.064, 0] })}
      {cyl([0.004, 0.006, 0.08], m.silver, { position: [0.03, 0.09, 0], rotation: [0, 0, -0.9] })}
    </>
  )
  // Skeletal finger: gold segments on dark knuckle joints, each joint curled toward the palm (-z)
  const finger = (segs, curl, i = 0) =>
    i < segs.length && (
      <group rotation-x={curl}>
        {ball(0.0074, m.joint)}
        {cyl([0.0055, 0.0062, segs[i]], m.gold, { position: [0, -segs[i] / 2, 0] })}
        <group position={[0, -segs[i], 0]}>{finger(segs, curl, i + 1)}</group>
      </group>
    )
  const FINGERS = [
    [-0.024, [0.036, 0.027, 0.021]],
    [-0.008, [0.041, 0.03, 0.024]],
    [0.008, [0.04, 0.029, 0.023]],
    [0.024, [0.032, 0.024, 0.019]],
  ]
  // Hand: dark mechanical palm, gold back plate, knuckle bar, four fingers, thumb on the inner side
  const hand = (side) => (
    <group>
      <RBox args={[0.064, 0.06, 0.022]} r={0.008} material={m.joint} position={[0, -0.035, -0.004]} />
      <RBox args={[0.068, 0.062, 0.012]} r={0.005} material={m.gold} position={[0, -0.035, 0.009]} />
      {cyl([0.008, 0.008, 0.066], m.joint, { position: [0, -0.068, 0], rotation: [0, 0, Math.PI / 2] })}
      {FINGERS.map(([x, segs]) => (
        <group key={x} position={[x * side, -0.07, 0]}>
          {finger(segs, 0.24)}
        </group>
      ))}
      <group position={[-side * 0.034, -0.028, -0.008]} rotation={[0.5, 0, -side * 0.6]}>
        {finger([0.03, 0.024], 0.25)}
      </group>
    </group>
  )
  // Shoulder cap, upper arm with a bolt and a little vent, hinged elbow, flared gauntlet forearm
  const arm = (side, shoulderRef, elbowRef, wristRef) => (
    <group ref={shoulderRef} position={[side * 0.27, 0.5, 0]}>
      {ball(0.064, m.limb)}
      {ring(0.056, 0.006, m.goldDeep, { position: [0, -0.055, 0] })}
      {cyl([0.055, 0.047, 0.2], m.limb, { position: [0, -0.15, 0] })}
      <group position={[side * 0.053, -0.13, 0]} rotation-z={Math.PI / 2}>
        {cyl([0.011, 0.011, 0.008], m.goldDeep)}
        {cyl([0.004, 0.004, 0.01], m.black)}
      </group>
      <RBox args={[0.01, 0.045, 0.026]} r={0.003} material={m.goldDeep} position={[side * 0.05, -0.085, -0.022]} />
      {[-0.008, 0, 0.008].map((z) => (
        <RBox key={z} args={[0.003, 0.034, 0.003]} r={0.001} material={m.black} position={[side * 0.0555, -0.085, -0.022 + z]} shadow={false} />
      ))}
      <group ref={elbowRef} position={[0, -0.27, 0]}>
        {cyl([0.026, 0.026, 0.07], m.joint, { rotation: [0, 0, Math.PI / 2] })}
        {[-1, 1].map((s) => cyl([0.03, 0.03, 0.008], m.gold, { key: s, position: [s * 0.037, 0, 0], rotation: [0, 0, Math.PI / 2] }))}
        {rod([-0.012, 0.03, 0.03], [-0.008, -0.04, 0.034], 0.0035, m.wires, 'w1')}
        {rod([0.012, 0.03, 0.028], [0.014, -0.04, 0.03], 0.0035, m.joint, 'w2')}
        <mesh geometry={FOREARM} material={m.limb} castShadow />
        {ring(0.046, 0.006, m.goldDeep, { position: [0, -0.05, 0] })}
        {[-0.012, 0.012].map((z) => (
          <RBox key={z} args={[0.008, 0.1, 0.01]} r={0.003} material={m.goldDeep} position={[side * 0.046, -0.125, z]} />
        ))}
        {cyl([0.024, 0.024, 0.025], m.joint, { position: [0, -0.235, 0] })}
        <group ref={wristRef} position={[0, -0.245, 0]}>
          {hand(side)}
        </group>
        {side > 0 && (
          // oil can held upright when the forearm points up
          <group ref={handMug} position={[0, -0.34, 0.06]} rotation-x={Math.PI}>
            {oilCan}
          </group>
        )}
      </group>
    </group>
  )
  // Thigh bent forward at the hip, ribbed knee, shin down to a gold boot. His right shin (-x) is silver.
  const leg = (x) => {
    const shin = x < 0 ? m.silver : m.limb
    return (
      <group key={x} position={[x, 0.78, 0]} rotation-x={-Math.PI / 2}>
        {ball(0.07, m.joint)}
        {ring(0.074, 0.007, m.goldDeep, { position: [0, -0.045, 0] })}
        {cyl([0.075, 0.063, 0.44], m.limb, { position: [0, -0.24, 0] })}
        {[-0.415, -0.432].map((y) => ring(0.063, 0.006, m.goldDeep, { key: y, position: [0, y, 0] }))}
        <group position={[0, -0.48, 0]} rotation-x={Math.PI / 2}>
          {ball(0.055, m.joint)}
          {ball(0.05, m.gold, { position: [0, 0.005, 0.045], scale: [1, 1.1, 0.55] })}
          {[-0.05, -0.064, -0.078].map((y) => ring(0.057, 0.0065, shin, { key: y, position: [0, y, 0] }))}
          {cyl([0.056, 0.048, 0.3], shin, { position: [0, -0.2, 0] })}
          {[-0.35, -0.362, -0.374].map((y) => ring(0.049, 0.006, shin, { key: y, position: [0, y, 0] }))}
          {cyl([0.036, 0.036, 0.03], m.joint, { position: [0, -0.388, 0] })}
          <RBox args={[0.12, 0.07, 0.2]} r={0.03} material={m.gold} position={[0, -0.42, 0.035]} />
          {ball(1, m.gold, { position: [0, -0.428, 0.12], scale: [0.06, 0.035, 0.05] })}
          <RBox args={[0.124, 0.014, 0.21]} r={0.006} material={m.black} position={[0, -0.452, 0.035]} />
        </group>
      </group>
    )
  }

  const eyeX = 0.046
  const eyeY = 0.012

  return (
    <group ref={root} position={SEAT.position} rotation-y={SEAT.facing}>
      {/* Oil can on the desk (to his left, the room side) */}
      <group ref={deskMug} position={[0.72, 0.84, 0.75]}>
        {oilCan}
      </group>

      {/* Everything on the chair turns with the swivel */}
      <group ref={swivel}>
        {/* Body sits slightly forward on the chair */}
        <group position={[0, -0.28, 0.08]}>
          {[-0.1, 0.1].map(leg)}

          {/* Torso pivots at the hips so he can lean */}
          <group ref={torso} position={[0, 0.78, 0]}>
            {/* pelvis: U-ridged plate with a rolled top edge and hip pistons */}
            <mesh geometry={geo.pelvis} material={m.pelvis} castShadow />
            <mesh geometry={geo.pelvisLip} material={m.goldDeep} />
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.17, 0.045, 0]}>
                <RBox args={[0.028, 0.09, 0.075]} r={0.012} material={m.gold} />
                {cyl([0.012, 0.012, 0.006], m.black, { position: [s * 0.015, 0.02, 0], rotation: [0, 0, Math.PI / 2] })}
              </group>
            ))}

            {/* exposed midsection: ribbed grey core wrapped in red / black wiring */}
            {cyl([0.075, 0.075, 0.18], m.joint, { position: [0, 0.2, 0], scale: [1, 1, 0.75] })}
            {[0.14, 0.17, 0.2, 0.23, 0.26].map((y) => ring(0.076, 0.007, m.grey, { key: y, position: [0, y, 0], scale: [1, 0.75, 1] }))}
            <mesh geometry={geo.wires} material={m.wires} castShadow />

            {/* breastplate with its rolled bottom edge */}
            <mesh geometry={geo.chest} material={m.chest} castShadow />
            <mesh geometry={geo.chestLip} material={m.goldDeep} />
            {/* the ringed chest disc */}
            {onPlate(CHEST, CHEST_N, 0, 0.36, 0, (
              <>
                {cyl([0.062, 0.062, 0.01], m.gold, { rotation: [Math.PI / 2, 0, 0] })}
                {[0.056, 0.045, 0.034, 0.022, 0.011].map((r, i) =>
                  ring(r, 0.0032, i % 2 ? m.goldDeep : m.gold, { key: r, position: [0, 0, 0.005], rotation: [0, 0, 0] }),
                )}
                {cyl([0.006, 0.006, 0.014], m.goldDeep, { rotation: [Math.PI / 2, 0, 0] })}
              </>
            ))}
            {/* rivets on his left pec and the collar fitting */}
            {[[0.42, 0.505, 0.007], [0.5, 0.49, 0.006], [0.3, 0.525, 0.004]].map(([th, y, r]) =>
              onPlate(CHEST, CHEST_N, th, y, 0, ball(r, m.goldDeep), th),
            )}
            {onPlate(CHEST, CHEST_N, 0, 0.578, 0, cyl([0.012, 0.012, 0.012], m.goldDeep, { rotation: [Math.PI / 2, 0, 0] }))}
            {/* back panel (what the room sees): five deep slots over a row of fine slats */}
            {onPlate(CHEST, CHEST_N, Math.PI, 0.47, 0, (
              <>
                <RBox args={[0.25, 0.2, 0.03]} r={0.008} material={m.gold} position={[0, 0, -0.006]} />
                {[-0.098, 0.098].map((y) => (
                  <RBox key={y} args={[0.25, 0.008, 0.008]} r={0.003} material={m.goldDeep} position={[0, y, 0.011]} />
                ))}
                {[-0.123, 0.123].map((x) => (
                  <RBox key={x} args={[0.008, 0.2, 0.008]} r={0.003} material={m.goldDeep} position={[x, 0, 0.011]} />
                ))}
                {[-0.08, -0.04, 0, 0.04, 0.08].map((x) => (
                  <RBox key={x} args={[0.03, 0.085, 0.006]} r={0.004} material={m.black} position={[x, 0.03, 0.009]} shadow={false} />
                ))}
                <RBox args={[0.23, 0.01, 0.008]} r={0.003} material={m.goldDeep} position={[0, -0.03, 0.011]} />
                {Array.from({ length: 15 }, (_, i) => (
                  <RBox key={i} args={[0.006, 0.028, 0.006]} r={0.002} material={m.black} position={[-0.098 + i * 0.014, -0.065, 0.009]} shadow={false} />
                ))}
              </>
            ))}

            {/* ribbed neck with the two hoses down the front */}
            {cyl([0.045, 0.045, 0.12], m.joint, { position: [0, 0.66, 0] })}
            {[0, 1, 2, 3, 4, 5].map((i) => ring(0.063 - i * 0.0008, 0.0075, i % 2 ? m.goldDeep : m.gold, { key: i, position: [0, 0.616 + i * 0.012, 0] }))}
            {[-1, 1].map((s) => (
              <group key={s}>
                {rod([s * 0.032, 0.62, 0.058], [s * 0.036, 0.578, 0.1], 0.0045, m.silver)}
                {cyl([0.0065, 0.0065, 0.012], m.goldDeep, { position: [s * 0.036, 0.576, 0.1] })}
              </group>
            ))}

            {arm(-1, shoulderL, elbowL)}
            {arm(1, shoulderR, elbowR, wristR)}

            {/* Head */}
            <group ref={head} position={[0, 0.79, 0]}>
              <mesh geometry={geo.head} material={m.head} castShadow />
              {/* slotted hood band over the top and down the sides, with the little fitting on top */}
              <mesh geometry={geo.hood} material={m.gold} castShadow />
              {cyl([0.006, 0.006, 0.014], m.goldDeep, { position: [0, 0.226, 0] })}
              <mesh position={[0, 0.236, 0]} material={m.gold}>
                <torusGeometry args={[0.008, 0.0025, 6, 16]} />
              </mesh>
              {/* big round eyes in thick goggle rims: cream lens, vertical slats, black pupil */}
              {[-1, 1].map((s) =>
                onPlate(HEAD, HEAD_N, thetaAt(HEAD, HEAD_N, s * eyeX, eyeY), eyeY, -0.001, (
                  <>
                    <mesh position-z={0.0025} material={m.eye}>
                      <circleGeometry args={[0.027, 32]} />
                    </mesh>
                    <mesh position-z={0.004} material={m.gold} castShadow>
                      <torusGeometry args={[0.032, 0.0105, 12, 36]} />
                    </mesh>
                  </>
                ), s),
              )}
              {/* nose bridge between the rims, and the nose ridge running down to the muzzle */}
              {onPlate(HEAD, HEAD_N, 0, eyeY, 0.004, <RBox args={[0.024, 0.016, 0.012]} r={0.005} material={m.gold} />)}
              {onPlate(HEAD, HEAD_N, 0, -0.03, -0.002, (
                <mesh material={m.gold} rotation-x={Math.PI - 0.2} scale={[1, 1, 0.5]} castShadow>
                  <coneGeometry args={[0.017, 0.046, 3]} />
                </mesh>
              ))}
              {/* slot mouth with a lip below */}
              {onPlate(HEAD, HEAD_N, 0, -0.078, 0, (
                <>
                  <RBox args={[0.05, 0.009, 0.01]} r={0.003} material={m.black} shadow={false} />
                  <RBox args={[0.056, 0.009, 0.014]} r={0.003} material={m.gold} position={[0, -0.009, 0.004]} />
                </>
              ))}
              {/* round ears at the bottom of the band */}
              {[-1, 1].map((s) =>
                onPlate(HEAD, HEAD_N, s * 1.55, -0.075, 0.002, (
                  <>
                    {cyl([0.02, 0.021, 0.016], m.gold, { rotation: [Math.PI / 2, 0, 0] })}
                    <mesh position-z={0.0085} material={m.goldDeep}>
                      <torusGeometry args={[0.013, 0.003, 6, 20]} />
                    </mesh>
                    {cyl([0.006, 0.006, 0.02], m.goldDeep, { rotation: [Math.PI / 2, 0, 0] })}
                  </>
                ), `ear${s}`),
              )}
              {/* cream badge on the back of the head */}
              {onPlate(HEAD, HEAD_N, Math.PI, 0.075, 0.0015, (
                <>
                  <mesh material={m.badge}>
                    <circleGeometry args={[0.04, 40]} />
                  </mesh>
                  <mesh material={m.goldDeep}>
                    <torusGeometry args={[0.04, 0.003, 6, 40]} />
                  </mesh>
                </>
              ))}
            </group>
          </group>
        </group>
      </group>

      {/* Green CRT light on his face and hands */}
      <pointLight position={[0, 1.15, 0.55]} color="#5dff8a" intensity={1.0} distance={1.4} />
    </group>
  )
}
