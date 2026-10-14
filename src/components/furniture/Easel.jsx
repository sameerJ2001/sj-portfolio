import { useMemo } from 'react'
import { C, makePaintingTexture } from './materials'

// Wooden easel holding a painting. Swap the procedural texture for a photo of your real painting.
export default function Easel() {
  const painting = useMemo(() => makePaintingTexture(7), [])

  return (
    <group>
      {/* Legs */}
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.85, 0.05]} rotation-z={x > 0 ? -0.08 : 0.08} castShadow>
          <boxGeometry args={[0.05, 1.75, 0.05]} />
          <meshStandardMaterial color={C.wood} />
        </mesh>
      ))}
      <mesh position={[0, 0.8, -0.3]} rotation-x={-0.35} castShadow>
        <boxGeometry args={[0.05, 1.7, 0.05]} />
        <meshStandardMaterial color={C.wood} />
      </mesh>
      {/* Ledge */}
      <mesh position={[0, 0.72, 0.1]}>
        <boxGeometry args={[0.75, 0.04, 0.12]} />
        <meshStandardMaterial color={C.woodDark} />
      </mesh>
      {/* Canvas */}
      <group position={[0, 1.18, 0.1]} rotation-x={-0.08}>
        <mesh castShadow>
          <boxGeometry args={[0.7, 0.88, 0.04]} />
          <meshStandardMaterial color={C.ivory} />
        </mesh>
        <mesh position={[0, 0, 0.021]}>
          <planeGeometry args={[0.64, 0.82]} />
          <meshStandardMaterial map={painting} />
        </mesh>
      </group>
      {/* Paint palette on the ledge */}
      <mesh position={[0.22, 0.75, 0.12]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial color="#d9b48a" />
      </mesh>
    </group>
  )
}
