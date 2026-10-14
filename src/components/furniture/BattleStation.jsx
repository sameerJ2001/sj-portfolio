import { useMemo, useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { Vector3 } from 'three'
import { useStore } from '../../store'
import { SEAT } from '../../data/zones'
import { createTerminalScreen, makeStatusScreenTexture } from '../../lib/screens'
import ScreenHtml from '../ScreenHtml'
import Desktop from '../os/Desktop'
import { C } from './materials'

// The main event: gold desk with a big green-phosphor CRT and a little blue CRT stacked on top,
// glowing + sparkling, with a floating "plumbob" so visitors know to click it first.
// Zoom in and the big CRT boots SJ-OS (components/os) — a real, clickable desktop on the glass.
// Local: wall behind (-z), the setup faces +z. The screen's spot comes from the 'pc' zone in zones.js.
const gold = { color: C.gold, metalness: 0.6, roughness: 0.28, emissive: '#7a5600', emissiveIntensity: 0.35 }
const shell = { color: '#2b2d33', roughness: 0.55, metalness: 0.15 }
const OS_W = 800
const OS_H = 600

// Hide the chair when the camera flies into it on the way to the screen
const CHAIR_CENTRE = new Vector3(SEAT.position[0], SEAT.position[1] + 0.8, SEAT.position[2])

export default function BattleStation({ zone }) {
  const ring = useRef()
  const light = useRef()
  const gem = useRef()
  const chair = useRef()
  const atPC = useStore((s) => s.arrivedZone === 'pc')
  const lightsOn = useStore((s) => s.lightsOn)
  const term = useMemo(createTerminalScreen, [])
  const status = useMemo(makeStatusScreenTexture, [])

  // Boot SJ-OS the first time you sit down, then keep it running (hidden) so open windows survive
  const [booted, setBooted] = useState(false)
  useEffect(() => {
    if (atPC) setBooted(true)
  }, [atPC])

  useFrame(({ clock, camera }, dt) => {
    const t = clock.elapsedTime
    const pulse = 0.5 + Math.sin(t * 2) * 0.5
    ring.current.material.opacity = 0.35 + pulse * 0.45
    light.current.intensity = (lightsOn ? 4 : 6) + pulse * 2
    gem.current.rotation.y = t * 1.5
    gem.current.position.y = 2.35 + Math.sin(t * 2.2) * 0.08
    chair.current.visible = camera.position.distanceTo(CHAIR_CENTRE) > 1.6
    if (!atPC) term.tick(dt)
  })

  const [sx, sy, sz] = zone.screen.local
  const [sw, sh] = zone.screen.size

  return (
    <group>
      {/* Glow ring on the floor, centred under the chair side so it clears the wall */}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.012, 0.2]}>
        <ringGeometry args={[1.0, 1.1, 64]} />
        <meshBasicMaterial color={C.gold} transparent toneMapped={false} />
      </mesh>

      <pointLight ref={light} position={[0, 1.7, 0.2]} color="#ffcc55" distance={5} />
      {/* Green phosphor spill onto SJ and the desk */}
      <pointLight position={[0, 1.1, 0.2]} color="#4dff8a" intensity={1.4} distance={2.2} />
      <Sparkles count={40} scale={[2.6, 1.6, 1.6]} position={[0, 1.4, -0.4]} size={3} speed={0.4} color="#ffd86b" />

      {/* Floating gem */}
      <mesh ref={gem} position={[0, 2.35, -0.4]}>
        <octahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial color={C.gold} emissive={C.gold} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>

      {/* Desk */}
      <mesh position={[0, 0.74, -0.4]} castShadow receiveShadow>
        <boxGeometry args={[2.1, 0.07, 0.85]} />
        <meshStandardMaterial {...gold} />
      </mesh>
      {[-0.98, 0.98].map((x) => (
        <mesh key={x} position={[x, 0.37, -0.4]} castShadow>
          <boxGeometry args={[0.07, 0.74, 0.75]} />
          <meshStandardMaterial color={C.goldDeep} metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Under the desk, like the reference: metal drawer cabinet + a yellow storage box */}
      <group position={[0.6, 0, -0.45]}>
        <mesh position={[0, 0.31, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.42, 0.62, 0.6]} />
          <meshStandardMaterial color="#6b7577" metalness={0.4} roughness={0.5} />
        </mesh>
        {[0.12, 0.31, 0.5].map((y) => (
          <group key={y}>
            <mesh position={[0, y - 0.09, 0.301]}>
              <planeGeometry args={[0.38, 0.008]} />
              <meshStandardMaterial color="#2c3133" />
            </mesh>
            <mesh position={[0, y, 0.31]}>
              <boxGeometry args={[0.12, 0.02, 0.02]} />
              <meshStandardMaterial color="#c0c6c8" metalness={0.7} />
            </mesh>
          </group>
        ))}
      </group>
      <mesh position={[-0.5, 0.13, -0.5]} rotation-y={0.15} castShadow receiveShadow>
        <boxGeometry args={[0.36, 0.26, 0.32]} />
        <meshStandardMaterial color="#c9a43a" roughness={0.7} />
      </mesh>
      {/* soda can */}
      <mesh position={[0.45, 0.835, -0.16]} castShadow>
        <cylinderGeometry args={[0.033, 0.033, 0.12, 12]} />
        <meshStandardMaterial color="#c8282e" metalness={0.5} roughness={0.35} />
      </mesh>

      {/* Big CRT: deep tapered shell, bezel, green glass */}
      <group>
        <mesh position={[0, 0.795, -0.5]}>
          <boxGeometry args={[0.34, 0.04, 0.28]} />
          <meshStandardMaterial {...shell} />
        </mesh>
        <mesh position={[sx, sy, sz - 0.054]} castShadow>
          <boxGeometry args={[sw + 0.13, sh + 0.14, 0.1]} />
          <meshStandardMaterial {...shell} />
        </mesh>
        <mesh position={[0, sy - 0.01, sz - 0.27]} castShadow>
          <boxGeometry args={[sw + 0.01, sh + 0.06, 0.34]} />
          <meshStandardMaterial {...shell} />
        </mesh>
        <mesh position={[0, sy - 0.02, sz - 0.48]} castShadow>
          <boxGeometry args={[0.34, 0.28, 0.1]} />
          <meshStandardMaterial {...shell} />
        </mesh>
        {/* gold badge + power LED on the bezel */}
        <mesh position={[sx + sw / 2 - 0.02, sy - sh / 2 - 0.035, sz - 0.002]}>
          <planeGeometry args={[0.025, 0.012]} />
          <meshBasicMaterial color="#3dff9a" toneMapped={false} />
        </mesh>
        <mesh position={[sx, sy - sh / 2 - 0.035, sz - 0.002]}>
          <planeGeometry args={[0.1, 0.018]} />
          <meshStandardMaterial {...gold} />
        </mesh>
        {/* glass: the animated terminal when idle; SJ-OS sits on top of it while you're here */}
        <mesh position={[sx, sy, sz]}>
          <planeGeometry args={[sw, sh]} />
          <meshBasicMaterial map={term.texture} color={[1.25, 1.25, 1.25]} toneMapped={false} />
        </mesh>
        {booted && (
          <ScreenHtml screen={zone.screen} width={OS_W} height={OS_H} visible={atPC}>
            <Desktop width={OS_W} height={OS_H} />
          </ScreenHtml>
        )}
      </group>

      {/* Little blue CRT stacked on top, set back and to one side */}
      <group position={[-0.1, sy + sh / 2 + 0.02, -0.52]}>
        <mesh position={[0, 0.15, 0]} castShadow>
          <boxGeometry args={[0.36, 0.3, 0.3]} />
          <meshStandardMaterial {...shell} />
        </mesh>
        <mesh position={[0, 0.155, 0.151]}>
          <planeGeometry args={[0.27, 0.2]} />
          <meshBasicMaterial map={status} color={[1.3, 1.3, 1.3]} toneMapped={false} />
        </mesh>
      </group>

      {/* Tower with RGB strip */}
      <mesh position={[0.82, 1.02, -0.5]} castShadow>
        <boxGeometry args={[0.24, 0.5, 0.48]} />
        <meshStandardMaterial {...gold} />
      </mesh>
      <mesh position={[0.82, 1.02, -0.258]}>
        <planeGeometry args={[0.04, 0.42]} />
        <meshBasicMaterial color="#ff5fd2" toneMapped={false} />
      </mesh>

      {/* Chunky retro keyboard + mouse */}
      <mesh position={[0.02, 0.795, -0.1]} rotation-x={0.06} castShadow>
        <boxGeometry args={[0.56, 0.035, 0.18]} />
        <meshStandardMaterial {...shell} />
      </mesh>
      {[-0.05, -0.1, -0.15].map((z) => (
        <mesh key={z} position={[0.02, 0.815, z + 0.04]} rotation-x={-Math.PI / 2 + 0.06}>
          <planeGeometry args={[0.5, 0.035]} />
          <meshStandardMaterial color="#3d4048" />
        </mesh>
      ))}
      <mesh position={[-0.42, 0.778, -0.1]}>
        <boxGeometry args={[0.22, 0.006, 0.2]} />
        <meshStandardMaterial color={C.black} />
      </mesh>
      <mesh position={[-0.42, 0.795, -0.1]}>
        <boxGeometry args={[0.07, 0.03, 0.11]} />
        <meshStandardMaterial {...shell} />
      </mesh>

      {/* Gaming chair (SJ sits here) */}
      <group ref={chair} position={[0, 0, 0.55]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[0.55, 0.09, 0.5]} />
          <meshStandardMaterial color={C.black} roughness={0.6} />
        </mesh>
        {/* tall back with side bolsters and a gold stripe */}
        <mesh position={[0, 0.82, 0.27]} castShadow>
          <boxGeometry args={[0.5, 0.66, 0.09]} />
          <meshStandardMaterial color={C.black} roughness={0.6} />
        </mesh>
        {[-0.26, 0.26].map((x) => (
          <mesh key={x} position={[x, 0.8, 0.24]} castShadow>
            <boxGeometry args={[0.07, 0.6, 0.13]} />
            <meshStandardMaterial color="#1c1a24" roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, 0.82, 0.316]}>
          <planeGeometry args={[0.1, 0.58]} />
          <meshStandardMaterial color={C.gold} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* armrests */}
        {[-0.31, 0.31].map((x) => (
          <group key={x} position={[x, 0, 0.02]}>
            <mesh position={[0, 0.63, 0]}>
              <boxGeometry args={[0.06, 0.04, 0.3]} />
              <meshStandardMaterial color="#1c1a24" />
            </mesh>
            <mesh position={[0, 0.55, 0.05]}>
              <boxGeometry args={[0.03, 0.14, 0.03]} />
              <meshStandardMaterial color="#333" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.44, 12]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        {/* five-star base */}
        {Array.from({ length: 5 }).map((_, i) => (
          <group key={i} rotation-y={(i / 5) * Math.PI * 2}>
            <mesh position={[0, 0.04, 0.15]}>
              <boxGeometry args={[0.05, 0.04, 0.3]} />
              <meshStandardMaterial color="#333" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}
