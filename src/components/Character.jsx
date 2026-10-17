import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, MeshBasicMaterial, MeshPhysicalMaterial, Vector3 } from 'three'
import { useStore } from '../store'
import { SEAT } from '../data/zones'
import RBox from './furniture/RBox'

// SJ-3PO: a gold protocol droid (an homage to the classic film droid, not a copy) sitting at the PC
// with his back to the room, looping through little "working" animations. When someone walks in
// (ENTER on the loader) he swivels round on the chair, waves, then gets back to work.
// Look: polished gold plating, glowing amber eyes, exposed wiring at the waist, one silver shin.
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

// Target pose for each action at time t (local seconds into the action).
// Shoulder (s) and elbow (e) angles: negative x swings forward/up, +z swings the +x arm out sideways.
function pose(action, t, T) {
  const p = {
    sLx: -0.75, sLz: 0, eLx: -0.85,
    sRx: -0.75, sRz: 0, eRx: -0.85, eRz: 0,
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
      p.sRx = -0.6
      p.eRx = -0.95 + Math.sin(T * 3) * 0.05
      p.sRz = 0.22 + Math.sin(T * 2.3) * 0.05
      p.headY = 0.1
      p.headX += bob * 0.5
      break
    case 'glance':
      p.eLx += Math.sin(T * 20) * 0.05
      p.headY = -0.55
      p.headX = 0.05
      break
    case 'sip': {
      // a little oil can lifted to the mouth grille in the middle of the action
      const lift = Math.sin(Math.min(1, t / 3.2) * Math.PI)
      p.sRx = MathUtils.lerp(-0.75, -0.6, lift)
      p.eRx = MathUtils.lerp(-0.85, -2.5, lift)
      p.sRz = MathUtils.lerp(0.15, -0.1, lift)
      p.headX = MathUtils.lerp(0.15, -0.25, lift)
      p.lean = MathUtils.lerp(0.08, -0.06, lift)
      p.mugInHand = true
      break
    }
    case 'stretch': {
      const up = Math.sin(Math.min(1, t / 2.6) * Math.PI)
      p.sLx = MathUtils.lerp(-0.75, -3.0, up)
      p.sRx = MathUtils.lerp(-0.75, -3.0, up)
      p.eLx = MathUtils.lerp(-0.85, -0.15, up)
      p.eRx = MathUtils.lerp(-0.85, -0.15, up)
      p.sLz = -0.2 * up
      p.sRz = 0.2 * up
      p.headX = MathUtils.lerp(0.2, -0.35, up)
      p.lean = MathUtils.lerp(0.08, -0.16, up)
      break
    }
    case 'wave': {
      // the room-side (+x) arm goes up, forearm wags side to side; head tilts, like a polite droid
      const on = MathUtils.smoothstep(t, 0.5, 1.1) * (1 - MathUtils.smoothstep(t, WAVE - 1.6, WAVE - 1.0))
      p.sRx = MathUtils.lerp(-0.4, -0.25, on)
      p.sRz = 1.25 * on
      p.eRx = MathUtils.lerp(-0.5, -0.2, on)
      p.eRz = (1.55 + Math.sin(t * 10) * 0.42) * on
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
const HEAD = new Vector3(SEAT.position[0], SEAT.position[1] + 1.2, SEAT.position[2])
const toCam = new Vector3()

// Angle from his forward (desk) direction to the camera, around the chair's post
function yawToCamera(camera) {
  toCam.copy(camera.position).sub(HEAD)
  return MathUtils.euclideanModulo(Math.atan2(toCam.x, toCam.z) - SEAT.facing + Math.PI, Math.PI * 2) - Math.PI
}

export default function Character() {
  const root = useRef()
  const swivel = useRef()
  const torso = useRef()
  const shoulderL = useRef()
  const shoulderR = useRef()
  const elbowL = useRef()
  const elbowR = useRef()
  const head = useRef()
  const handMug = useRef()
  const deskMug = useRef()
  const waveAt = useRef(null) // clock time the current wave started
  const wantWave = useRef(false)

  const m = useMemo(
    () => ({
      // a touch of warm emissive keeps the gold reading as gold in the dark, neon-lit loft
      gold: new MeshPhysicalMaterial({ color: '#f2c062', metalness: 0.85, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 4.5, emissive: '#5c3a0a', emissiveIntensity: 0.55 }),
      goldDeep: new MeshPhysicalMaterial({ color: '#c99436', metalness: 0.85, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.15, envMapIntensity: 3.6, emissive: '#3d2606', emissiveIntensity: 0.5 }),
      silver: new MeshPhysicalMaterial({ color: '#dfe5e8', metalness: 0.85, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 4.5, emissive: '#2c3236', emissiveIntensity: 0.5 }),
      joint: new MeshPhysicalMaterial({ color: '#2a2b30', metalness: 0.7, roughness: 0.35, clearcoat: 0.4, envMapIntensity: 1.6 }),
      black: new MeshPhysicalMaterial({ color: '#0d0d10', metalness: 0.3, roughness: 0.5 }),
      eye: new MeshBasicMaterial({ color: [3.2, 1.9, 0.45], toneMapped: false }),
      wires: ['#c0392b', '#2d6cdf', '#e3b21b', '#d8d8d8', '#2a9d58'].map(
        (color) => new MeshPhysicalMaterial({ color, roughness: 0.4, clearcoat: 0.6 }),
      ),
    }),
    [],
  )

  // Wave whenever someone walks in: the loader's ENTER flips `entered`
  useEffect(
    () =>
      useStore.subscribe((s, prev) => {
        if (s.entered && !prev.entered) wantWave.current = true
      }),
    [],
  )

  useFrame(({ clock, camera }, dt) => {
    root.current.visible = camera.position.distanceTo(HEAD) > 1.6

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
    m.eye.color.setRGB(blink ? 0.5 : 3.2, blink ? 0.3 : 1.9, blink ? 0.08 : 0.45)

    handMug.current.visible = p.mugInHand && elbowR.current.rotation.x < -1.9
    deskMug.current.visible = !handMug.current.visible
  })

  const cyl = (args, material, { key, ...props } = {}) => (
    <mesh key={key} castShadow material={material} {...props}>
      <cylinderGeometry args={[...args, 20]} />
    </mesh>
  )
  const ball = (r, material, { key, ...props } = {}) => (
    <mesh key={key} castShadow material={material} {...props}>
      <sphereGeometry args={[r, 20, 14]} />
    </mesh>
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
  // Gold mechanical hand: palm, four fingers and a thumb on the inner side
  const hand = (side) => (
    <group position={[0, -0.27, 0]}>
      {cyl([0.026, 0.026, 0.03], m.joint, { position: [0, 0.005, 0] })}
      <RBox args={[0.072, 0.075, 0.03]} r={0.012} material={m.gold} position={[0, -0.045, 0]} />
      {[-0.026, -0.009, 0.009, 0.026].map((x, i) => (
        <group key={x} position={[x, -0.083, 0]} rotation-x={0.25}>
          {cyl([0.0075, 0.0085, 0.05 - Math.abs(i - 1.5) * 0.006], m.gold, { position: [0, -0.024, 0] })}
          {ball(0.0085, m.joint, { position: [0, 0.002, 0] })}
        </group>
      ))}
      <group position={[-side * 0.036, -0.04, 0.008]} rotation={[0.4, 0, -side * 0.5]}>
        {cyl([0.008, 0.009, 0.045], m.gold, { position: [0, -0.022, 0] })}
      </group>
    </group>
  )
  // Shoulder ball, tapered gold upper arm, dark elbow with exposed wires, gold forearm, hand
  const arm = (side, shoulderRef, elbowRef) => (
    <group ref={shoulderRef} position={[side * 0.27, 0.5, 0]}>
      {ball(0.06, m.joint)}
      {cyl([0.052, 0.054, 0.025], m.goldDeep, { position: [0, -0.045, 0] })}
      {cyl([0.05, 0.042, 0.2], m.gold, { position: [0, -0.15, 0] })}
      <group ref={elbowRef} position={[0, -0.27, 0]}>
        {ball(0.042, m.joint)}
        {[-0.022, 0.022].map((x, i) => cyl([0.005, 0.005, 0.09], m.wires[i], { key: x, position: [x, 0.0, -0.03] }))}
        {cyl([0.044, 0.034, 0.2], m.gold, { position: [0, -0.13, 0] })}
        {cyl([0.046, 0.046, 0.02], m.goldDeep, { position: [0, -0.04, 0] })}
        {hand(side)}
        {side > 0 && (
          // oil can held upright when the forearm points up
          <group ref={handMug} position={[0, -0.34, 0.06]} rotation-x={Math.PI}>
            {oilCan}
          </group>
        )}
      </group>
    </group>
  )
  // Thigh bent forward at the hip, knee, shin down to a gold boot. His right shin (-x) is silver.
  const leg = (x) => {
    const shin = x < 0 ? m.silver : m.gold
    return (
      <group key={x} position={[x, 0.78, 0]} rotation-x={-Math.PI / 2}>
        {ball(0.07, m.joint)}
        {cyl([0.072, 0.06, 0.42], m.gold, { position: [0, -0.24, 0] })}
        {cyl([0.074, 0.074, 0.02], m.goldDeep, { position: [0, -0.06, 0] })}
        <group position={[0, -0.48, 0]} rotation-x={Math.PI / 2}>
          {ball(0.055, m.joint)}
          {/* kneecap */}
          {ball(0.045, m.gold, { position: [0, 0.01, 0.04], scale: [1, 1, 0.5] })}
          {cyl([0.058, 0.048, 0.34], shin, { position: [0, -0.2, 0] })}
          {cyl([0.06, 0.06, 0.018], m.goldDeep, { position: [0, -0.06, 0] })}
          {cyl([0.038, 0.038, 0.04], m.joint, { position: [0, -0.385, 0] })}
          <RBox args={[0.13, 0.07, 0.22]} r={0.03} material={m.gold} position={[0, -0.42, 0.04]} />
          <RBox args={[0.135, 0.015, 0.225]} r={0.006} material={m.black} position={[0, -0.452, 0.04]} />
        </group>
      </group>
    )
  }

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
            {/* pelvis plate with a dark belt line */}
            <RBox args={[0.34, 0.13, 0.22]} r={0.05} material={m.gold} position={[0, 0.04, 0]} />
            <RBox args={[0.345, 0.018, 0.225]} r={0.008} material={m.joint} position={[0, 0.1, 0]} />

            {/* exposed midsection: dark core, ribbed rings and a bundle of coloured wires */}
            {cyl([0.12, 0.13, 0.17], m.black, { position: [0, 0.19, 0] })}
            {[0.15, 0.21].map((y) => (
              <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2} material={m.goldDeep}>
                <torusGeometry args={[0.125, 0.008, 8, 28]} />
              </mesh>
            ))}
            {[-0.06, -0.03, 0, 0.03, 0.06].map((x, i) => (
              <mesh key={x} position={[x, 0.19, 0.125 - Math.abs(x) * 0.35]} rotation-z={x * 1.5} material={m.wires[i]}>
                <cylinderGeometry args={[0.007, 0.007, 0.17, 8]} />
              </mesh>
            ))}
            {[-0.05, 0.05].map((x, i) => (
              <mesh key={x} position={[x, 0.19, -0.12]} material={m.wires[i + 2]}>
                <cylinderGeometry args={[0.007, 0.007, 0.17, 8]} />
              </mesh>
            ))}

            {/* chest: rounded gold breastplate, raised centre panel with a little status light */}
            <RBox args={[0.44, 0.27, 0.25]} r={0.09} material={m.gold} position={[0, 0.43, 0]} />
            <RBox args={[0.34, 0.06, 0.22]} r={0.03} material={m.gold} position={[0, 0.3, 0]} />
            <RBox args={[0.13, 0.13, 0.03]} r={0.012} material={m.goldDeep} position={[0, 0.41, 0.125]} rotation-x={0.12} />
            {cyl([0.022, 0.022, 0.01], m.black, { position: [0, 0.43, 0.143], rotation: [Math.PI / 2 + 0.12, 0, 0] })}
            <mesh position={[0, 0.43, 0.149]} rotation-x={0.12}>
              <circleGeometry args={[0.011, 16]} />
              <meshBasicMaterial color={[0.6, 2.4, 1.2]} toneMapped={false} />
            </mesh>
            {[0.37, 0.355].map((y) => (
              <RBox key={y} args={[0.09, 0.006, 0.008]} r={0.002} material={m.black} position={[0, y, 0.142]} shadow={false} />
            ))}
            {/* back plate (what the room sees): spine ridge and two vent grilles */}
            <RBox args={[0.24, 0.24, 0.05]} r={0.02} material={m.gold} position={[0, 0.42, -0.115]} />
            <RBox args={[0.025, 0.25, 0.03]} r={0.008} material={m.goldDeep} position={[0, 0.42, -0.145]} />
            {[-0.065, 0.065].map((x) =>
              [0.38, 0.41, 0.44, 0.47].map((y) => (
                <RBox key={`${x}${y}`} args={[0.07, 0.008, 0.01]} r={0.003} material={m.black} position={[x, y, -0.14]} shadow={false} />
              )),
            )}
            {/* shoulder caps and collar ring */}
            {[-0.24, 0.24].map((x) => ball(0.07, m.gold, { key: x, position: [x, 0.52, 0], scale: [1, 0.8, 1] }))}
            <mesh position={[0, 0.6, 0]} rotation-x={Math.PI / 2} material={m.goldDeep}>
              <torusGeometry args={[0.07, 0.022, 10, 28]} />
            </mesh>
            {/* neck: dark servo column with a couple of wires */}
            {cyl([0.04, 0.05, 0.12], m.joint, { position: [0, 0.65, 0] })}
            {[-0.035, 0.035].map((x, i) => cyl([0.006, 0.006, 0.1], m.wires[i * 2], { key: x, position: [x, 0.65, 0.02], rotation: [0, 0, x * 4] }))}

            {arm(-1, shoulderL, elbowL)}
            {arm(1, shoulderR, elbowR)}

            {/* Head: domed gold skull, brow ridge, round glowing eyes, muzzle with a grille mouth, disc ears */}
            <group ref={head} position={[0, 0.79, 0]}>
              <mesh castShadow position={[0, 0.03, 0]} scale={[0.155, 0.165, 0.158]} material={m.gold}>
                <sphereGeometry args={[1, 32, 24]} />
              </mesh>
              {/* brow ridge */}
              <RBox args={[0.25, 0.04, 0.06]} r={0.018} material={m.gold} position={[0, 0.07, 0.122]} rotation-x={-0.2} />
              {/* eyes: dark sockets and glowing amber lenses */}
              {[-0.06, 0.06].map((x) => (
                <group key={x} position={[x, 0.022, 0.138]} rotation-x={Math.PI / 2}>
                  {cyl([0.043, 0.043, 0.03], m.black)}
                  <mesh position={[0, 0.0155, 0]} material={m.eye}>
                    <cylinderGeometry args={[0.031, 0.031, 0.002, 20]} />
                  </mesh>
                  <mesh position={[0, 0.0165, 0]}>
                    <cylinderGeometry args={[0.013, 0.013, 0.002, 16]} />
                    <meshBasicMaterial color="#2a1400" />
                  </mesh>
                </group>
              ))}
              {/* nose ridge and muzzle */}
              <RBox args={[0.03, 0.06, 0.03]} r={0.01} material={m.gold} position={[0, 0.0, 0.15]} />
              <RBox args={[0.16, 0.1, 0.07]} r={0.03} material={m.gold} position={[0, -0.075, 0.115]} />
              <RBox args={[0.085, 0.024, 0.02]} r={0.006} material={m.black} position={[0, -0.085, 0.146]} shadow={false} />
              {[-0.089, -0.081].map((y) => (
                <RBox key={y} args={[0.08, 0.003, 0.004]} r={0.001} material={m.goldDeep} position={[0, y, 0.157]} shadow={false} />
              ))}
              {/* chin servo */}
              {cyl([0.05, 0.04, 0.04], m.joint, { position: [0, -0.135, 0.02] })}
              {/* disc ears */}
              {[-1, 1].map((s) => (
                <group key={s} position={[s * 0.152, 0.01, -0.005]} rotation-z={Math.PI / 2}>
                  {cyl([0.055, 0.058, 0.026], m.gold)}
                  <mesh position={[0, s * 0.014, 0]} rotation-x={Math.PI / 2} material={m.joint}>
                    <torusGeometry args={[0.034, 0.006, 8, 24]} />
                  </mesh>
                  {cyl([0.014, 0.014, 0.034], m.goldDeep)}
                </group>
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
