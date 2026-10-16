import { useStore } from '../../store'
import { C } from './materials'

// Ground floor, along the left wall under the desk deck, like the reference: a counter (ribbed end
// panel, washing machine, cupboard) with a dark worktop, sunken sink and gooseneck tap, a dark
// splashback, a shelf of bowls with a warm LED tube under it, and a red two-door fridge.
// Local: the wall is at z = -0.4, the front faces +z (into the room), +x runs toward the back wall.
const counter = { color: '#b9b0b8', roughness: 0.6 }
const dark = { color: '#1d1c23', roughness: 0.45, metalness: 0.3 }

export default function Kitchen() {
  const lightsOn = useStore((s) => s.lightsOn)
  return (
    <group>
      <Counter />

      {/* dark splashback panel behind the counter */}
      <mesh position={[-0.42, 1.24, -0.385]} receiveShadow>
        <boxGeometry args={[1.62, 0.6, 0.03]} />
        <meshStandardMaterial color="#2a3a3e" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* shelf of bowls, with a warm LED tube underneath lighting the worktop */}
      <group position={[-0.45, 1.72, -0.25]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.04, 0.3]} />
          <meshStandardMaterial {...dark} />
        </mesh>
        {[-0.5, -0.12, 0.3].map((x, i) => (
          <group key={x} position={[x, 0.02, 0]}>
            {Array.from({ length: 4 + i }).map((_, k) => (
              <group key={k} position={[0, 0.03 + k * 0.045, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.11, 0.085, 0.04, 18]} />
                  <meshStandardMaterial color="#1f2326" roughness={0.5} />
                </mesh>
                <mesh position={[0, 0.021, 0]} rotation-x={Math.PI / 2}>
                  <torusGeometry args={[0.1, 0.012, 6, 20]} />
                  <meshStandardMaterial color="#2f6b45" roughness={0.6} />
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
  return (
    <group position={[-0.45, 0, 0]}>
      {/* carcass */}
      <mesh position={[0, 0.44, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.88, 0.66]} />
        <meshStandardMaterial {...counter} />
      </mesh>
      {/* worktop */}
      <mesh position={[0, 0.905, 0.01]} castShadow receiveShadow>
        <boxGeometry args={[1.64, 0.05, 0.74]} />
        <meshStandardMaterial {...dark} />
      </mesh>

      {/* ribbed end panel at the front end (-x) */}
      <group position={[-0.68, 0.44, 0.31]}>
        <mesh>
          <boxGeometry args={[0.24, 0.84, 0.02]} />
          <meshStandardMaterial color="#8f9ca2" roughness={0.5} metalness={0.3} />
        </mesh>
        {[-0.08, -0.03, 0.02, 0.07].map((x) => (
          <mesh key={x} position={[x, 0, 0.015]}>
            <boxGeometry args={[0.025, 0.78, 0.02]} />
            <meshStandardMaterial color="#b4c0c4" roughness={0.45} metalness={0.3} />
          </mesh>
        ))}
      </group>

      {/* washing machine */}
      <group position={[-0.24, 0.44, 0.31]}>
        <mesh>
          <boxGeometry args={[0.58, 0.84, 0.02]} />
          <meshStandardMaterial color="#d9d5d0" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.34, 0.012]}>
          <boxGeometry args={[0.5, 0.06, 0.01]} />
          <meshStandardMaterial color="#b8b3ae" />
        </mesh>
        <mesh position={[0.18, 0.34, 0.02]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.022, 0.022, 0.02, 12]} />
          <meshStandardMaterial color="#555" />
        </mesh>
        <mesh position={[0, -0.04, 0.02]}>
          <torusGeometry args={[0.18, 0.035, 10, 32]} />
          <meshStandardMaterial color="#9a958f" roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[0, -0.04, 0.014]}>
          <circleGeometry args={[0.16, 32]} />
          <meshStandardMaterial color="#2a2d36" roughness={0.1} metalness={0.5} />
        </mesh>
        <mesh position={[-0.04, 0.0, 0.016]}>
          <circleGeometry args={[0.07, 20]} />
          <meshBasicMaterial color="#5a2830" transparent opacity={0.6} />
        </mesh>
      </group>

      {/* cupboard with a dark handle */}
      <group position={[0.42, 0.44, 0.31]}>
        <mesh>
          <boxGeometry args={[0.72, 0.84, 0.02]} />
          <meshStandardMaterial color="#c9a6bd" roughness={0.6} />
        </mesh>
        <mesh position={[-0.28, 0.26, 0.02]}>
          <boxGeometry args={[0.03, 0.16, 0.03]} />
          <meshStandardMaterial {...dark} />
        </mesh>
      </group>

      {/* sunken sink + gooseneck tap */}
      <mesh position={[0.4, 0.934, 0.04]}>
        <boxGeometry args={[0.5, 0.012, 0.4]} />
        <meshStandardMaterial color="#5a5f68" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0.4, 0.937, 0.04]}>
        <boxGeometry args={[0.44, 0.012, 0.34]} />
        <meshStandardMaterial color="#141519" metalness={0.6} roughness={0.3} />
      </mesh>
      <group position={[0.4, 0.93, -0.22]}>
        <mesh position={[0, 0.17, 0]}>
          <cylinderGeometry args={[0.014, 0.018, 0.34, 10]} />
          <meshStandardMaterial color="#c4c9cf" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.34, 0.07]} rotation-y={Math.PI / 2}>
          <torusGeometry args={[0.07, 0.013, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#c4c9cf" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.31, 0.14]}>
          <cylinderGeometry args={[0.013, 0.013, 0.06, 8]} />
          <meshStandardMaterial color="#c4c9cf" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* a bottle + noodle cups on the worktop */}
      <mesh position={[-0.6, 1.02, -0.1]} castShadow>
        <cylinderGeometry args={[0.035, 0.04, 0.2, 10]} />
        <meshStandardMaterial color="#3a2a22" roughness={0.2} />
      </mesh>
      {[-0.32, -0.18].map((x, i) => (
        <mesh key={x} position={[x, 0.99, -0.12]} castShadow>
          <cylinderGeometry args={[0.055, 0.042, 0.11, 12]} />
          <meshStandardMaterial color={i ? C.white : C.pink} />
        </mesh>
      ))}
    </group>
  )
}

// Red two-door fridge (small freezer on top), dark handles, glowing slightly red like the reference
function Fridge() {
  const red = { color: '#d62f2a', roughness: 0.35, emissive: '#7a0d0b', emissiveIntensity: 0.5 }
  return (
    <group position={[0.85, 0, -0.02]}>
      <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 1.9, 0.68]} />
        <meshStandardMaterial {...red} />
      </mesh>
      {/* door gap + slightly proud doors */}
      <mesh position={[0, 1.3, 0.341]}>
        <boxGeometry args={[0.68, 0.012, 0.004]} />
        <meshStandardMaterial color="#5a0a08" />
      </mesh>
      {[
        [1.61, 0.56],
        [0.66, 1.24],
      ].map(([y, h]) => (
        <mesh key={y} position={[0, y, 0.346]} castShadow>
          <boxGeometry args={[0.66, h, 0.012]} />
          <meshStandardMaterial {...red} />
        </mesh>
      ))}
      {[1.78, 1.16].map((y) => (
        <mesh key={y} position={[-0.22, y, 0.37]} castShadow>
          <boxGeometry args={[0.16, 0.025, 0.035]} />
          <meshStandardMaterial color="#2a1a1a" roughness={0.5} />
        </mesh>
      ))}
      <pointLight position={[0, 1.0, 0.75]} color="#ff2a20" intensity={1.6} distance={2.2} />
    </group>
  )
}
