import { C } from './materials'

// Ground floor, along the left wall under the desk wing: counter with sink + washing machine at the
// front of the room, red fridge behind it. Faces +z (towards the room); +x runs toward the back wall.
export default function Kitchen() {
  return (
    <group>
      {/* Counter */}
      <group position={[-0.4, 0, 0]}>
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.9, 0.7]} />
          <meshStandardMaterial color="#b9b4c4" />
        </mesh>
        <mesh position={[0, 0.92, 0.02]} castShadow>
          <boxGeometry args={[1.66, 0.05, 0.76]} />
          <meshStandardMaterial color="#2a2833" metalness={0.3} />
        </mesh>
        {/* Washing machine in the left half */}
        <mesh position={[-0.4, 0.42, 0.355]}>
          <planeGeometry args={[0.72, 0.78]} />
          <meshStandardMaterial color="#d6d2df" />
        </mesh>
        <mesh position={[-0.4, 0.4, 0.36]}>
          <ringGeometry args={[0.2, 0.25, 24]} />
          <meshStandardMaterial color="#8a8696" />
        </mesh>
        <mesh position={[-0.4, 0.4, 0.358]}>
          <circleGeometry args={[0.2, 24]} />
          <meshStandardMaterial color="#3a4a5a" roughness={0.1} metalness={0.4} />
        </mesh>
        {/* Cupboard door + sink in the right half */}
        <mesh position={[0.4, 0.45, 0.355]}>
          <planeGeometry args={[0.7, 0.8]} />
          <meshStandardMaterial color="#c9a6c8" />
        </mesh>
        <mesh position={[0.4, 0.94, 0.0]}>
          <boxGeometry args={[0.5, 0.02, 0.4]} />
          <meshStandardMaterial color="#5a5868" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[0.4, 1.08, -0.25]}>
          <boxGeometry args={[0.03, 0.28, 0.03]} />
          <meshStandardMaterial color={C.metal} metalness={0.8} />
        </mesh>
        {/* Glow strip under the counter top */}
        <mesh position={[0, 0.88, 0.395]}>
          <boxGeometry args={[1.6, 0.015, 0.01]} />
          <meshBasicMaterial color={C.cyan} toneMapped={false} />
        </mesh>
        {/* Instant noodle cups */}
        {[-0.55, -0.4].map((x, i) => (
          <mesh key={x} position={[x, 1.0, -0.1]}>
            <cylinderGeometry args={[0.06, 0.045, 0.12, 12]} />
            <meshStandardMaterial color={i ? C.white : C.pink} />
          </mesh>
        ))}
        {/* Wall shelf with stacked plates + a strip light under it */}
        <mesh position={[0, 1.75, -0.2]}>
          <boxGeometry args={[1.4, 0.04, 0.3]} />
          <meshStandardMaterial color={C.metal} />
        </mesh>
        {[-0.45, -0.1, 0.35].map((x, i) => (
          <mesh key={x} position={[x, 1.77 + (0.12 + i * 0.04) / 2, -0.2]}>
            <cylinderGeometry args={[0.13, 0.13, 0.12 + i * 0.04, 16]} />
            <meshStandardMaterial color={[C.teal, '#2f5a45', C.ivory][i]} />
          </mesh>
        ))}
        <mesh position={[0, 1.71, -0.1]}>
          <boxGeometry args={[1.1, 0.03, 0.03]} />
          <meshBasicMaterial color="#fff2c4" toneMapped={false} />
        </mesh>
      </group>

      {/* Red fridge, behind the counter */}
      <group position={[0.85, 0, 0]}>
        <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 1.9, 0.7]} />
          <meshStandardMaterial color="#d62f2a" roughness={0.35} emissive="#5a0d0b" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, 1.25, 0.352]}>
          <boxGeometry args={[0.68, 0.015, 0.01]} />
          <meshStandardMaterial color="#8e1e1a" />
        </mesh>
        {[1.5, 0.95].map((y) => (
          <mesh key={y} position={[-0.22, y, 0.37]}>
            <boxGeometry args={[0.16, 0.03, 0.03]} />
            <meshStandardMaterial color={C.metal} metalness={0.6} />
          </mesh>
        ))}
        {/* Magnets + takeaway menus */}
        {[
          [0.12, 1.6, C.white, 0.14, 0.18],
          [0.1, 0.75, C.gold, 0.16, 0.2],
        ].map(([x, y, color, w, h], i) => (
          <mesh key={i} position={[x, y, 0.353]}>
            <planeGeometry args={[w, h]} />
            <meshStandardMaterial color={color} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
