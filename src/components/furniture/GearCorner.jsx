import { C } from './materials'
import { Crate } from './Decor'

// Gear on the reference's storage crates: dumbbells on one crate, tennis racket + balls on the other,
// surfboard leaning against the right-hand crate. Local: front faces +z, x runs along the crates.
export default function GearCorner() {
  return (
    <group>
      <Crate position={[-0.5, 0, 0]} />
      <Crate position={[0.48, 0, 0.08]} rotation-y={0.12} />

      {/* Surfboard leaning on the right crate */}
      <group position={[1.05, 0.98, -0.05]} rotation={[0, 0.2, 0.18]}>
        <mesh scale={[0.26, 1.0, 0.07]} castShadow>
          <sphereGeometry args={[1, 24, 24]} />
          <meshStandardMaterial color={C.ivory} />
        </mesh>
        <mesh position={[0, 0, 0.004]} scale={[0.04, 0.95, 0.072]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color={C.coral} />
        </mesh>
      </group>

      {/* Dumbbells on the left crate */}
      {[-0.68, -0.32].map((x) => (
        <group key={x} position={[x, 0.6, 0]} rotation-x={Math.PI / 2}>
          <mesh>
            <cylinderGeometry args={[0.018, 0.018, 0.3, 8]} />
            <meshStandardMaterial color="#888" metalness={0.8} />
          </mesh>
          {[-0.12, 0.12].map((y) => (
            <mesh key={y} position={[0, y, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 0.07, 6]} />
              <meshStandardMaterial color={C.black} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Tennis racket lying on the right crate */}
      <group position={[0.42, 0.56, 0.1]} rotation={[-Math.PI / 2, 0, 0.6]}>
        <mesh scale={[1, 1.3, 1]}>
          <torusGeometry args={[0.13, 0.015, 8, 24]} />
          <meshStandardMaterial color={C.teal} />
        </mesh>
        <mesh scale={[1, 1.3, 1]}>
          <circleGeometry args={[0.13, 24]} />
          <meshStandardMaterial color="#e8f0e0" transparent opacity={0.5} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.25, 8]} />
          <meshStandardMaterial color={C.black} />
        </mesh>
      </group>

      {/* Tennis balls */}
      <mesh position={[0.75, 0.57, 0.2]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#d7f04a" />
      </mesh>
      <mesh position={[-0.2, 0.05, 0.5]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#d7f04a" />
      </mesh>
    </group>
  )
}
