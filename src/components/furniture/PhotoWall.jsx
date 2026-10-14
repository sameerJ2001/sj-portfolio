import { useMemo } from 'react'
import { useStore } from '../../store'
import { C, makePhotoTexture } from './materials'

// Framed prints on the back wall upstairs, between the arcades and the window (under the ceiling fan,
// so the blade shadows sweep across them), + a string of fairy lights above.
// Local layout: wall at z = 0, photos face +z, x runs along the wall.
// Later: load your real photos with drei's useTexture('/photos/xyz.jpg').
const LINE_Y = 1.45 // height of the middle of the gallery

// dy nudges each frame off the line so it looks hand-hung
const FRAMES = [
  { x: -0.95, dy: 0.05, w: 0.5, h: 0.64, hues: [20, 260] },
  { x: -0.3, dy: -0.15, w: 0.6, h: 0.44, hues: [190, 230] },
  { x: -0.3, dy: 0.42, w: 0.38, h: 0.3, hues: [45, 10] },
  { x: 0.28, dy: 0.08, w: 0.42, h: 0.58, hues: [330, 20] },
  { x: 0.86, dy: -0.12, w: 0.48, h: 0.38, hues: [140, 200] },
  { x: 0.84, dy: 0.38, w: 0.3, h: 0.3, hues: [280, 330] },
]

export default function PhotoWall() {
  const lightsOn = useStore((s) => s.lightsOn)
  const textures = useMemo(() => FRAMES.map((f) => makePhotoTexture(...f.hues)), [])

  return (
    <group>
      {FRAMES.map((f, i) => (
        <group key={i} position={[f.x, LINE_Y + f.dy, 0.03]}>
          <mesh castShadow>
            <boxGeometry args={[f.w + 0.08, f.h + 0.08, 0.04]} />
            <meshStandardMaterial color={i % 2 ? C.black : C.ivory} />
          </mesh>
          <mesh position={[0, 0, 0.021]}>
            <planeGeometry args={[f.w, f.h]} />
            <meshStandardMaterial map={textures[i]} />
          </mesh>
        </group>
      ))}

      {/* Fairy lights, draped along the same diagonal */}
      {Array.from({ length: 14 }).map((_, i) => {
        const t = i / 13
        const x = -1.2 + t * 2.4
        const y = LINE_Y + 0.8 - Math.sin(t * Math.PI * 2) ** 2 * 0.1
        return (
          <mesh key={`l${i}`} position={[x, y, 0.05]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial
              color="#ffe7a3"
              emissive="#ffcf6b"
              emissiveIntensity={lightsOn ? 3 : 1.5}
              toneMapped={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}
