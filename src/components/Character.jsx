import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import { SEAT } from '../data/zones'
import { C } from './furniture/materials'

// SJ, seated at the PC with his back to the room, looping through little "working" animations.
// Look: messy ginger hair, pale skin, light grey tee, dark jeans (matches the reference render).
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

const skin = '#e9b896'
const hair = '#b8502a'
const hairDark = '#8e3a1d'
const tee = '#b9b6b0'
const jeans = '#1f2433'

// Messy hair tufts on top of the head: [x, y, z, w, h, d]
const TUFTS = [
  [-0.1, 0.2, 0.06, 0.12, 0.08, 0.12],
  [0.08, 0.21, -0.02, 0.14, 0.09, 0.14],
  [-0.02, 0.23, -0.1, 0.12, 0.08, 0.12],
  [0.13, 0.17, 0.1, 0.09, 0.07, 0.1],
  [-0.15, 0.16, -0.08, 0.08, 0.08, 0.12],
  [0.0, 0.14, 0.17, 0.3, 0.07, 0.05], // fringe
  [0.05, 0.19, 0.12, 0.1, 0.06, 0.08],
]

// Target pose for each action at time t (local seconds into the action).
// Shoulder (s) and elbow (e) angles: negative x swings forward/up.
function pose(action, t, T) {
  const p = {
    sLx: -0.75, sLz: 0, eLx: -0.85,
    sRx: -0.75, sRz: 0, eRx: -0.85,
    headX: 0.2, headY: 0, lean: 0.08, mugInHand: false,
  }
  const bob = Math.sin(T * 4.2) * 0.04 // nodding to music
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
      // lift mug to mouth in the middle of the action
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
  }
  return p
}

// Hide SJ when the camera flies through his head on its way to the screen
const HEAD = new Vector3(SEAT.position[0], SEAT.position[1] + 1.2, SEAT.position[2])

export default function Character() {
  const root = useRef()
  const torso = useRef()
  const shoulderL = useRef()
  const shoulderR = useRef()
  const elbowL = useRef()
  const elbowR = useRef()
  const head = useRef()
  const handMug = useRef()
  const deskMug = useRef()

  useFrame(({ clock, camera }, dt) => {
    root.current.visible = camera.position.distanceTo(HEAD) > 1.6

    const T = clock.elapsedTime
    let t = T % LOOP
    let action = 'type'
    for (const [a, d] of SEQUENCE) {
      if (t < d) {
        action = a
        break
      }
      t -= d
    }
    const p = pose(action, t, T)
    const k = 10
    const damp = (obj, axis, to, speed = k) => (obj.rotation[axis] = MathUtils.damp(obj.rotation[axis], to, speed, dt))
    damp(shoulderL.current, 'x', p.sLx)
    damp(shoulderL.current, 'z', p.sLz)
    damp(shoulderR.current, 'x', p.sRx)
    damp(shoulderR.current, 'z', p.sRz)
    damp(elbowL.current, 'x', p.eLx)
    damp(elbowR.current, 'x', p.eRx)
    damp(head.current, 'x', p.headX, 8)
    damp(head.current, 'y', p.headY, 6)
    damp(torso.current, 'x', p.lean, 6)
    // breathing
    torso.current.scale.y = 1 + Math.sin(T * 2) * 0.012

    handMug.current.visible = p.mugInHand && elbowR.current.rotation.x < -1.9
    deskMug.current.visible = !handMug.current.visible
  })

  const box = (args, color, props = {}) => (
    <mesh castShadow {...props}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  )
  const mug = (
    <>
      <mesh castShadow>
        <cylinderGeometry args={[0.05, 0.045, 0.11, 14]} />
        <meshStandardMaterial color={C.pink} />
      </mesh>
      <mesh position={[0.06, 0, 0]} rotation-y={Math.PI / 2}>
        <torusGeometry args={[0.03, 0.01, 6, 12]} />
        <meshStandardMaterial color={C.pink} />
      </mesh>
    </>
  )
  // Upper arm in a short tee sleeve, bending at the elbow into a bare forearm
  const arm = (side, shoulderRef, elbowRef) => (
    <group ref={shoulderRef} position={[side * 0.27, 0.5, 0]}>
      {box([0.13, 0.15, 0.14], tee, { position: [0, -0.06, 0] })}
      {box([0.1, 0.14, 0.11], skin, { position: [0, -0.2, 0] })}
      <group ref={elbowRef} position={[0, -0.27, 0]}>
        {box([0.095, 0.26, 0.1], skin, { position: [0, -0.13, 0] })}
        {box([0.1, 0.09, 0.11], skin, { position: [0, -0.3, 0] })}
        {side > 0 && (
          // mug held upright when the forearm points up
          <group ref={handMug} position={[0, -0.34, 0.06]} rotation-x={Math.PI}>
            {mug}
          </group>
        )}
      </group>
    </group>
  )

  return (
    <group ref={root} position={SEAT.position} rotation-y={SEAT.facing}>
      {/* Mug on the desk (to SJ's right) */}
      <group ref={deskMug} position={[0.72, 0.835, 0.75]}>
        {mug}
      </group>

      {/* Body sits slightly forward on the chair */}
      <group position={[0, -0.28, 0.08]}>
        {/* Legs, bent forward at the hip */}
        {[-0.1, 0.1].map((x) => (
          <group key={x} position={[x, 0.78, 0]} rotation-x={-Math.PI / 2}>
            {box([0.16, 0.5, 0.18], jeans, { position: [0, -0.25, 0] })}
            {/* shins down */}
            <group position={[0, -0.48, 0]} rotation-x={Math.PI / 2}>
              {box([0.15, 0.42, 0.16], jeans, { position: [0, -0.2, 0] })}
              {box([0.17, 0.08, 0.26], C.white, { position: [0, -0.42, 0.04] })}
            </group>
          </group>
        ))}

        {/* Torso pivots at the hips so he can lean */}
        <group ref={torso} position={[0, 0.78, 0]}>
          {box([0.44, 0.56, 0.24], tee, { position: [0, 0.28, 0] })}
          {/* shoulders a touch wider than the waist */}
          {box([0.48, 0.12, 0.25], tee, { position: [0, 0.5, 0] })}
          {/* neck */}
          {box([0.13, 0.08, 0.12], skin, { position: [0, 0.6, 0] })}

          {arm(-1, shoulderL, elbowL)}
          {arm(1, shoulderR, elbowR)}

          {/* Head */}
          <group ref={head} position={[0, 0.79, 0]}>
            {box([0.32, 0.34, 0.31], skin)}
            {/* ears */}
            {box([0.04, 0.08, 0.06], skin, { position: [-0.17, 0, -0.01] })}
            {box([0.04, 0.08, 0.06], skin, { position: [0.17, 0, -0.01] })}
            {/* hair: cap, back, sides, then messy tufts */}
            {box([0.35, 0.1, 0.34], hair, { position: [0, 0.16, -0.01] })}
            {box([0.35, 0.3, 0.07], hair, { position: [0, 0.04, -0.15] })}
            {box([0.04, 0.16, 0.26], hairDark, { position: [-0.17, 0.09, -0.03] })}
            {box([0.04, 0.16, 0.26], hairDark, { position: [0.17, 0.09, -0.03] })}
            {TUFTS.map(([x, y, z, w, h, d], i) => (
              <mesh key={i} position={[x, y, z]} rotation={[i * 0.3, i * 0.7, (i % 3) * 0.15 - 0.15]} castShadow>
                <boxGeometry args={[w, h, d]} />
                <meshStandardMaterial color={i % 2 ? hair : '#c86234'} roughness={0.9} />
              </mesh>
            ))}
          </group>
        </group>
      </group>

      {/* Green CRT light on SJ's face and hands */}
      <pointLight position={[0, 1.15, 0.55]} color="#5dff8a" intensity={1.0} distance={1.4} />
    </group>
  )
}
