import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import { useStore } from '../../store'
import { playPiano } from '../../lib/pianoAudio'
import { C, K } from './materials'
import RBox from './RBox'

// Grand piano (self-playing). When the camera zooms in, it plays a loop,
// the keys move and little notes float up.
const WHITE_KEYS = 15
const KEY_W = 0.085
const BLACK_PATTERN = [1, 1, 0, 1, 1, 1, 0] // after C, D, (no E), F, G, A, (no B)

export default function GrandPiano() {
  const keys = useRef([])
  const pressed = useRef(new Float32Array(WHITE_KEYS))
  const notes = useRef([])
  const playing = useStore((s) => s.arrivedZone === 'piano')
  const glossy = K.lacquer('#0d0d11')

  useEffect(() => {
    if (!playing) return
    let n = 0
    const stop = playPiano((midi) => {
      pressed.current[(midi * 7) % WHITE_KEYS] = 1
      const note = notes.current[n++ % notes.current.length]
      if (note) note.userData.life = 1
    })
    return stop
  }, [playing])

  useFrame((_, dt) => {
    keys.current.forEach((k, i) => {
      if (!k) return
      pressed.current[i] = Math.max(0, pressed.current[i] - dt * 4)
      k.rotation.x = MathUtils.damp(k.rotation.x, pressed.current[i] * 0.12, 20, dt)
    })
    notes.current.forEach((m, i) => {
      if (!m) return
      const life = (m.userData.life = Math.max(0, (m.userData.life ?? 0) - dt * 0.6))
      m.visible = life > 0
      m.position.set(-0.4 + (i % 4) * 0.25 + Math.sin(life * 6 + i) * 0.08, 1.3 + (1 - life) * 1.3, 0.3)
      m.scale.setScalar(0.6 + life * 0.4)
    })
  })

  return (
    <group>
      {/* Body: straight front + rounded tail */}
      <mesh position={[0, 0.88, 0.35]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.3, 0.9]} />
        <meshPhysicalMaterial {...glossy} />
      </mesh>
      <mesh position={[0, 0.88, -0.2]} castShadow>
        <cylinderGeometry args={[0.7, 0.7, 0.3, 40]} />
        <meshPhysicalMaterial {...glossy} />
      </mesh>
      <mesh position={[0.25, 0.88, -0.45]} castShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.3, 32]} />
        <meshPhysicalMaterial {...glossy} />
      </mesh>

      {/* Lid, hinged on the left (straight) side and propped open on the right */}
      <group position={[-0.7, 1.04, 0]} rotation-z={0.5}>
        <mesh position={[0.7, 0, -0.05]} castShadow>
          <boxGeometry args={[1.4, 0.03, 1.5]} />
          <meshPhysicalMaterial {...glossy} />
        </mesh>
      </group>
      {/* Prop stick from the rim up to the underside of the lid */}
      <mesh position={[0.35, 1.32, 0.0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.58, 6]} />
        <meshPhysicalMaterial {...K.chrome()} />
      </mesh>

      {/* Legs */}
      {[
        [-0.6, 0.7],
        [0.6, 0.7],
        [0.1, -0.75],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.37, z]} castShadow>
          <cylinderGeometry args={[0.05, 0.04, 0.74, 10]} />
          <meshPhysicalMaterial {...glossy} />
        </mesh>
      ))}

      {/* Keyboard */}
      <mesh position={[0, 0.78, 0.86]}>
        <boxGeometry args={[1.38, 0.1, 0.2]} />
        <meshPhysicalMaterial {...glossy} />
      </mesh>
      {Array.from({ length: WHITE_KEYS }).map((_, i) => (
        <group key={i} ref={(g) => (keys.current[i] = g)} position={[-0.6 + i * KEY_W, 0.835, 0.8]}>
          <mesh position={[0, 0, 0.08]}>
            <boxGeometry args={[KEY_W - 0.008, 0.025, 0.17]} />
            <meshStandardMaterial color={C.ivory} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: WHITE_KEYS - 1 }).map((_, i) =>
        BLACK_PATTERN[i % 7] ? (
          <mesh key={`b${i}`} position={[-0.6 + i * KEY_W + KEY_W / 2, 0.86, 0.83]}>
            <boxGeometry args={[0.05, 0.03, 0.1]} />
            <meshStandardMaterial color={C.black} />
          </mesh>
        ) : null
      )}

      {/* Floating music notes (only visible while playing) */}
      {Array.from({ length: 8 }).map((_, i) => (
        <group key={`n${i}`} ref={(g) => (notes.current[i] = g)} visible={false}>
          <mesh>
            <sphereGeometry args={[0.05, 10, 10]} />
            <meshBasicMaterial color={i % 2 ? C.gold : C.teal} toneMapped={false} />
          </mesh>
          <mesh position={[0.045, 0.1, 0]}>
            <boxGeometry args={[0.012, 0.2, 0.012]} />
            <meshBasicMaterial color={i % 2 ? C.gold : C.teal} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Bench: padded lacquer top on satin legs */}
      <group position={[0, 0, 1.35]}>
        <RBox args={[0.8, 0.08, 0.36]} r={0.03} m={K.lacquer('#15151a')} position={[0, 0.46, 0]} />
        <RBox args={[0.74, 0.03, 0.3]} r={0.012} m={K.fabric('#2a2228')} position={[0, 0.51, 0]} />
        {[
          [-0.34, -0.13],
          [0.34, -0.13],
          [-0.34, 0.13],
          [0.34, 0.13],
        ].map(([x, z]) => (
          <RBox key={`${x}${z}`} args={[0.04, 0.42, 0.04]} r={0.01} m={K.satin('#7a868c')} position={[x, 0.21, z]} />
        ))}
      </group>
    </group>
  )
}
