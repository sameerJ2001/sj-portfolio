import { useStore } from '../../store'
import { C } from './materials'

// Bed (upstairs, lengthways under the window on a low platform), plus the bedside table with the
// journal and lamp at the head end. Local: wall at -z, the bed runs along x, pillows on the left (-x).
export default function Bed() {
  const lightsOn = useStore((s) => s.lightsOn)

  return (
    <group>
      <group>
        {/* Platform base */}
        <mesh position={[0, 0.13, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.26, 1.7]} />
          <meshStandardMaterial color="#cfcbd6" />
        </mesh>
        <mesh position={[0, 0.36, 0]} castShadow>
          <boxGeometry args={[2.2, 0.2, 1.55]} />
          <meshStandardMaterial color={C.ivory} />
        </mesh>
        {/* Blanket over the foot end */}
        <mesh position={[0.25, 0.48, 0.02]} castShadow>
          <boxGeometry args={[1.7, 0.06, 1.6]} />
          <meshStandardMaterial color="#c9452c" />
        </mesh>
        {[0.45, -0.45].map((z) => (
          <mesh key={z} position={[0.25, 0.515, z]}>
            <boxGeometry args={[1.7, 0.012, 0.08]} />
            <meshStandardMaterial color="#e8664a" />
          </mesh>
        ))}
        {/* Pillow */}
        <mesh position={[-0.82, 0.53, 0]} castShadow>
          <boxGeometry args={[0.4, 0.14, 1.1]} />
          <meshStandardMaterial color="#d9772b" />
        </mesh>
      </group>

      {/* Bedside table at the head of the bed, against the wall */}
      <group position={[-1.5, 0, -0.3]}>
        <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.55, 0.56, 0.55]} />
          <meshStandardMaterial color={C.wood} />
        </mesh>
        {/* Journal */}
        <mesh position={[-0.08, 0.58, 0.05]} rotation-y={0.3} castShadow>
          <boxGeometry args={[0.24, 0.04, 0.32]} />
          <meshStandardMaterial color="#7a3b2a" />
        </mesh>
        <mesh position={[-0.08, 0.6, 0.05]} rotation-y={0.3}>
          <boxGeometry args={[0.03, 0.005, 0.32]} />
          <meshStandardMaterial color={C.gold} metalness={0.8} />
        </mesh>
        {/* Lamp */}
        <mesh position={[0.15, 0.68, -0.12]}>
          <cylinderGeometry args={[0.02, 0.05, 0.22, 10]} />
          <meshStandardMaterial color={C.gold} metalness={0.8} />
        </mesh>
        <mesh position={[0.15, 0.86, -0.12]}>
          <cylinderGeometry args={[0.08, 0.13, 0.16, 16]} />
          <meshStandardMaterial
            color="#ffe2b0"
            emissive="#ffb347"
            emissiveIntensity={lightsOn ? 2.5 : 0.2}
            toneMapped={false}
          />
        </mesh>
        {lightsOn && <pointLight position={[0.15, 0.9, -0.12]} intensity={3} distance={3.5} color="#ffb347" />}
      </group>
    </group>
  )
}
