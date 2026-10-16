import { useMemo } from 'react'
import { MeshPhysicalMaterial } from 'three'
import { useStore } from '../../store'
import { C, K, makeStoneTexture } from './materials'
import RBox from './RBox'

// Ground floor, along the left wall under the desk deck, like the reference, in the sleek sci-fi
// material set (see K in materials.js): lacquered cabinet fronts, a polished stone worktop with a
// sunken steel sink and chrome gooseneck tap, a ribbed satin-metal end panel, a washing machine,
// a glossy dark splashback, a shelf of bowls with a warm LED tube under it, and a red lacquered
// two-door fridge. Local: the wall is at z = -0.4, the front faces +z, +x runs toward the back wall.
export default function Kitchen() {
  const lightsOn = useStore((s) => s.lightsOn)
  return (
    <group>
      <Counter />

      {/* glossy dark splashback behind the counter */}
      <RBox args={[1.62, 0.6, 0.03]} r={0.01} m={K.lacquer('#22343a')} position={[-0.42, 1.24, -0.385]} shadow={false} />

      {/* shelf of bowls, with a warm LED tube underneath lighting the worktop */}
      <group position={[-0.45, 1.72, -0.25]}>
        <RBox args={[1.5, 0.04, 0.3]} r={0.012} m={K.gunmetal()} />
        {[-0.5, -0.12, 0.3].map((x, i) => (
          <group key={x} position={[x, 0.02, 0]}>
            {Array.from({ length: 4 + i }).map((_, k) => (
              <group key={k} position={[0, 0.03 + k * 0.045, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.11, 0.085, 0.04, 24]} />
                  <meshPhysicalMaterial {...K.lacquer('#1f2326')} />
                </mesh>
                <mesh position={[0, 0.021, 0]} rotation-x={Math.PI / 2}>
                  <torusGeometry args={[0.1, 0.012, 8, 24]} />
                  <meshPhysicalMaterial {...K.lacquer('#2f6b45')} />
                </mesh>
              </group>
            ))}
          </group>
        ))}
        <mesh position={[0, -0.04, 0.1]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.018, 0.018, 1.3, 10]} />
          <meshBasicMaterial color={lightsOn ? [3, 2.7, 2.2] : '#555'} toneMapped={false} />
        </mesh>
        {lightsOn && <pointLight position={[0, -0.15, 0.25]} color="#ffe9c8" intensity={3} distance={2.4} />}
      </group>

      <Fridge />
    </group>
  )
}

function Counter() {
  const worktop = useMemo(() => {
    const map = makeStoneTexture()
    map.repeat.set(1.6, 0.75)
    return new MeshPhysicalMaterial({ map, roughness: 0.22, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.15 })
  }, [])
  return (
    <group position={[-0.45, 0, 0]}>
      {/* carcass + kick plinth */}
      <RBox args={[1.6, 0.82, 0.62]} r={0.02} m={K.satin('#4e5a60')} position={[0, 0.47, -0.04]} />
      <RBox args={[1.56, 0.07, 0.56]} r={0.01} m={K.gunmetal()} position={[0, 0.035, -0.06]} />
      {/* polished stone worktop */}
      <RBox args={[1.66, 0.06, 0.74]} r={0.02} position={[0, 0.91, 0.01]} material={worktop} />

      {/* ribbed satin-metal end panel at the front end (-x) */}
      <group position={[-0.68, 0.47, 0.28]}>
        <RBox args={[0.24, 0.8, 0.03]} r={0.01} m={K.satin('#7f9096')} shadow={false} />
        {[-0.08, -0.03, 0.02, 0.07].map((x) => (
          <RBox key={x} args={[0.026, 0.74, 0.024]} r={0.01} m={K.satin('#a8b6bb')} position={[x, 0, 0.02]} shadow={false} />
        ))}
      </group>

      {/* washing machine: lacquered white front, chrome door ring, dark glass */}
      <group position={[-0.24, 0.47, 0.28]}>
        <RBox args={[0.58, 0.8, 0.03]} r={0.012} m={K.lacquer('#d9d6d2')} shadow={false} />
        <RBox args={[0.5, 0.06, 0.012]} r={0.005} m={K.lacquer('#b9b4ae')} position={[0, 0.32, 0.02]} shadow={false} />
        <mesh position={[0.18, 0.32, 0.03]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.022, 0.022, 0.02, 16]} />
          <meshPhysicalMaterial {...K.chrome()} />
        </mesh>
        <mesh position={[0, -0.05, 0.024]}>
          <torusGeometry args={[0.18, 0.035, 14, 40]} />
          <meshPhysicalMaterial {...K.chrome('#b8c0c6')} />
        </mesh>
        <mesh position={[0, -0.05, 0.018]}>
          <circleGeometry args={[0.16, 40]} />
          <meshPhysicalMaterial color="#1c2230" roughness={0.05} metalness={0.3} clearcoat={1} />
        </mesh>
        <mesh position={[-0.04, -0.01, 0.02]}>
          <circleGeometry args={[0.07, 24]} />
          <meshBasicMaterial color="#5a2830" transparent opacity={0.5} />
        </mesh>
      </group>

      {/* lacquered cupboard with a chrome bar handle */}
      <group position={[0.42, 0.47, 0.28]}>
        <RBox args={[0.72, 0.8, 0.03]} r={0.012} m={K.lacquer('#c4a2b8')} shadow={false} />
        <RBox args={[0.022, 0.18, 0.022]} r={0.008} m={K.chrome()} position={[-0.28, 0.24, 0.035]} shadow={false} />
      </group>

      {/* sunken steel sink + chrome gooseneck tap */}
      <RBox args={[0.5, 0.014, 0.4]} r={0.006} m={K.satin('#8a949b')} position={[0.4, 0.942, 0.04]} shadow={false} />
      <mesh position={[0.4, 0.95, 0.04]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.44, 0.34]} />
        <meshPhysicalMaterial color="#15171b" metalness={0.7} roughness={0.25} />
      </mesh>
      <group position={[0.4, 0.94, -0.22]}>
        <mesh position={[0, 0.17, 0]}>
          <cylinderGeometry args={[0.014, 0.018, 0.34, 12]} />
          <meshPhysicalMaterial {...K.chrome()} />
        </mesh>
        <mesh position={[0, 0.34, 0.07]} rotation-y={Math.PI / 2}>
          <torusGeometry args={[0.07, 0.013, 10, 20, Math.PI]} />
          <meshPhysicalMaterial {...K.chrome()} />
        </mesh>
        <mesh position={[0, 0.31, 0.14]}>
          <cylinderGeometry args={[0.013, 0.013, 0.06, 10]} />
          <meshPhysicalMaterial {...K.chrome()} />
        </mesh>
      </group>

      {/* a bottle + noodle cups on the worktop */}
      <mesh position={[-0.6, 1.04, -0.1]} castShadow>
        <cylinderGeometry args={[0.035, 0.04, 0.2, 12]} />
        <meshPhysicalMaterial color="#3a2a22" roughness={0.1} clearcoat={1} transparent opacity={0.9} />
      </mesh>
      {[-0.32, -0.18].map((x, i) => (
        <mesh key={x} position={[x, 1.0, -0.12]} castShadow>
          <cylinderGeometry args={[0.055, 0.042, 0.11, 14]} />
          <meshStandardMaterial color={i ? C.white : C.pink} />
        </mesh>
      ))}
    </group>
  )
}

// Red lacquered two-door fridge (small freezer on top) with satin handles, glowing slightly red
function Fridge() {
  const red = { ...K.lacquer('#d62f2a'), emissive: '#7a0d0b', emissiveIntensity: 0.5 }
  return (
    <group position={[0.85, 0, -0.02]}>
      <RBox args={[0.7, 1.9, 0.66]} r={0.035} m={red} position={[0, 0.95, -0.01]} />
      {/* slightly proud doors with a dark gap between */}
      {[
        [1.61, 0.56],
        [0.66, 1.24],
      ].map(([y, h]) => (
        <RBox key={y} args={[0.67, h, 0.03]} r={0.02} m={red} position={[0, y, 0.33]} />
      ))}
      {[1.78, 1.16].map((y) => (
        <RBox key={y} args={[0.18, 0.03, 0.04]} r={0.012} m={K.satin('#5a4a4a')} position={[-0.2, y, 0.365]} />
      ))}
      <pointLight position={[0, 1.0, 0.75]} color="#ff2a20" intensity={1.6} distance={2.2} />
    </group>
  )
}
