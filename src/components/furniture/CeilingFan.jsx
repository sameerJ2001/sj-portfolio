import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D } from 'three'
import { useStore } from '../../store'
import { C } from './materials'

// Ceiling fan with a light kit, hung from a short beam off the back wall (like the reference).
// Like the reference video, the bulb sits on top of the hub, above the blades, so the blades are lit
// from above and, as they turn, their shadows slowly sweep around the room: over the photo wall,
// the arcades, the floor, and every few seconds right across SJ at his desk.
// Local: y = 0 is the top of the walls; `wall` is how far back the back wall is from the fan.
const SPEED = 0.45 // rad/s (slow, like the video)
const BLADE_Y = -0.74

export default function CeilingFan({ wall, drop }) {
  const lightsOn = useStore((s) => s.lightsOn)
  const blades = useRef()
  const spot = useRef()
  const glow = useRef()
  const bulb = useRef()
  const target = useMemo(() => new Object3D(), [])

  useFrame((_, dt) => {
    const b = blades.current
    b.rotation.y += dt * SPEED
    const on = lightsOn ? 1 : 0
    spot.current.intensity = 14 * on
    glow.current.intensity = 0.9 * on
    bulb.current.color.setScalar(on ? 2.2 : 0.25)
  })

  const wood = { color: '#c98a4b', roughness: 0.65 }
  const dark = { color: '#24222b', roughness: 0.5, metalness: 0.4 }

  return (
    <group>
      {/* beam back to the wall + downrod */}
      <mesh position={[0, -0.14, (wall + 0.2) / 2]} castShadow>
        <boxGeometry args={[0.24, 0.2, Math.abs(wall) + 0.2]} />
        <meshStandardMaterial color={C.metal} />
      </mesh>
      <mesh position={[0, -0.42, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.4, 8]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      <mesh position={[0, -0.24, 0]}>
        <cylinderGeometry args={[0.07, 0.05, 0.05, 12]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      {/* motor housing (doesn't cast a shadow, so the light inside can shine past it) */}
      <mesh position={[0, -0.68, 0]}>
        <cylinderGeometry args={[0.13, 0.15, 0.12, 20]} />
        <meshStandardMaterial {...dark} />
      </mesh>

      {/* blades */}
      <group ref={blades} position={[0, BLADE_Y, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation-y={(i * Math.PI) / 2}>
            <mesh position={[0.2, 0.01, 0]} castShadow>
              <boxGeometry args={[0.18, 0.025, 0.05]} />
              <meshStandardMaterial {...dark} />
            </mesh>
            <mesh position={[0.5, 0, 0]} rotation-x={0.12} castShadow>
              <boxGeometry args={[0.58, 0.02, 0.2]} />
              <meshStandardMaterial {...wood} />
            </mesh>
          </group>
        ))}
      </group>

      {/* bulb on top of the hub, above the blades */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 0.07, 18]} />
        <meshBasicMaterial ref={bulb} toneMapped={false} color="#ffe6b8" />
      </mesh>
      <mesh position={[0, -0.8, 0]}>
        <cylinderGeometry args={[0.04, 0.02, 0.06, 10]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      <pointLight ref={glow} position={[0, -0.6, 0.12]} color="#ffd9a0" distance={2.2} />

      {/* the shadow-casting light, above the blades, aimed at the floor */}
      <primitive object={target} position={[0, -drop, 0]} />
      <spotLight
        ref={spot}
        target={target}
        position={[0, -0.47, 0]}
        color="#ffdcae"
        angle={1.25}
        penumbra={0.4}
        distance={10}
        decay={1.3}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-camera-near={0.05}
        shadow-camera-far={8}
      />
    </group>
  )
}
