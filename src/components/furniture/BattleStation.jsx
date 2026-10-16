import { useMemo, useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { Vector3 } from 'three'
import { useStore } from '../../store'
import { SEAT } from '../../data/zones'
import { createGraphScreen, createTerminalScreen, makeStatusScreenTexture } from '../../lib/screens'
import ScreenHtml from '../ScreenHtml'
import Desktop from '../os/Desktop'
import { K } from './materials'

// The workstation, like the reference: a plain grey metal desk, a chunky beige retro computer (a big
// green-phosphor CRT on a desktop case, a small CRT stacked on top, a keyboard), boxes underneath, a
// soda can, a dark office chair, and a second beige terminal on the floor running a green graphics
// screen. Matte, softly rounded edges throughout. A small green marker
// floats above it so visitors know to click it first.
// Zoom in and the big CRT boots SJ-OS (components/os) — a real, clickable desktop on the glass.
// Local: wall behind (-z), the setup faces +z. The screen's spot comes from the 'pc' zone in zones.js.
const desk = K.satin('#858c8d')
const beige = { color: '#8f887d', roughness: 0.6 }
const beigeDark = { color: '#756f65', roughness: 0.65 }
const tan = { color: '#a68e80', roughness: 0.6 }
const bezel = { color: '#2a2a26', roughness: 0.6 }
const OS_W = 800
const OS_H = 600
const TOP = 0.77 // desk surface

// Hide the chair when the camera flies into it on the way to the screen
const CHAIR_CENTRE = new Vector3(SEAT.position[0], SEAT.position[1] + 0.8, SEAT.position[2])

function Box({ args, r = 0.012, mat, ...props }) {
  return (
    <RoundedBox args={args} radius={r} smoothness={2} castShadow receiveShadow {...props}>
      <meshPhysicalMaterial {...mat} />
    </RoundedBox>
  )
}

export default function BattleStation({ zone }) {
  const gem = useRef()
  const chair = useRef()
  const atPC = useStore((s) => s.arrivedZone === 'pc')
  const term = useMemo(createTerminalScreen, [])
  const graph = useMemo(createGraphScreen, [])
  const status = useMemo(makeStatusScreenTexture, [])

  // Boot SJ-OS the first time you sit down, then keep it running (hidden) so open windows survive
  const [booted, setBooted] = useState(false)
  useEffect(() => {
    if (atPC) setBooted(true)
  }, [atPC])

  useFrame(({ clock, camera }, dt) => {
    const t = clock.elapsedTime
    gem.current.rotation.y = t * 1.2
    gem.current.position.y = 2.25 + Math.sin(t * 2) * 0.05
    chair.current.visible = camera.position.distanceTo(CHAIR_CENTRE) > 1.6
    if (!atPC) term.tick(dt)
    graph.tick(dt)
  })

  const [sx, sy, sz] = zone.screen.local
  const [sw, sh] = zone.screen.size
  const crtBottom = sy - sh / 2 - 0.07

  return (
    <group>
      {/* Green phosphor spill onto SJ and the desk */}
      <pointLight position={[0, 1.25, 0.12]} color="#4dff8a" intensity={0.55} distance={1.3} />

      {/* Small floating marker: click me first */}
      <mesh ref={gem} position={[0, 2.25, -0.4]}>
        <octahedronGeometry args={[0.08, 0]} />
        <meshBasicMaterial color={[0.6, 2.2, 1.1]} toneMapped={false} />
      </mesh>

      {/* Desk: top, legs, back rail */}
      <Box args={[2.1, 0.05, 0.85]} r={0.015} mat={desk} position={[0, TOP - 0.025, -0.4]} />
      {[-0.99, 0.99].flatMap((x) => [-0.78, -0.04].map((z) => [x, z])).map(([x, z]) => (
        <Box key={`${x}${z}`} args={[0.05, TOP - 0.05, 0.05]} r={0.008} mat={desk} position={[x, (TOP - 0.05) / 2, z]} />
      ))}
      <Box args={[1.98, 0.05, 0.03]} r={0.008} mat={desk} position={[0, 0.2, -0.78]} />

      {/* Under the desk: a cardboard box and a yellow storage box */}
      <Box args={[0.44, 0.34, 0.36]} r={0.01} mat={{ color: '#9a8466', roughness: 0.9 }} position={[0.55, 0.17, -0.5]} rotation-y={-0.08} />
      <mesh position={[0.55, 0.341, -0.5]} rotation={[-Math.PI / 2, 0, -0.08]}>
        <planeGeometry args={[0.44, 0.04]} />
        <meshStandardMaterial color="#c9b48a" roughness={0.9} />
      </mesh>
      <Box args={[0.38, 0.26, 0.32]} r={0.012} mat={{ color: '#c9a43a', roughness: 0.75 }} position={[-0.45, 0.13, -0.5]} rotation-y={0.15} />

      {/* Desktop case under the big CRT: drive slots + power LED */}
      <group position={[0, TOP, sz - 0.2]}>
        <Box args={[0.66, crtBottom - TOP, 0.46]} mat={beige} position={[0, (crtBottom - TOP) / 2, 0]} />
        {[-0.18, 0.12].map((x) => (
          <mesh key={x} position={[x, (crtBottom - TOP) * 0.55, 0.232]}>
            <planeGeometry args={[0.2, 0.02]} />
            <meshStandardMaterial {...bezel} />
          </mesh>
        ))}
        <mesh position={[0.28, (crtBottom - TOP) * 0.4, 0.232]}>
          <planeGeometry args={[0.018, 0.018]} />
          <meshBasicMaterial color={[2.5, 0.3, 0.3]} toneMapped={false} />
        </mesh>
      </group>

      {/* Big CRT: chunky beige shell with a tapered back, dark bezel, green glass */}
      <group>
        {[
          [0, sh / 2 + 0.05, sw + 0.16, 0.1],
          [0, -sh / 2 - 0.05, sw + 0.16, 0.1],
          [-sw / 2 - 0.05, 0, 0.1, sh],
          [sw / 2 + 0.05, 0, 0.1, sh],
        ].map(([x, y, w, h], i) => (
          <Box key={i} args={[w, h, 0.12]} r={0.02} mat={beige} position={[sx + x, sy + y, sz - 0.04]} />
        ))}
        <mesh position={[sx, sy, sz - 0.004]}>
          <planeGeometry args={[sw + 0.02, sh + 0.02]} />
          <meshStandardMaterial {...bezel} />
        </mesh>
        <Box args={[sw + 0.06, sh + 0.08, 0.26]} r={0.03} mat={beigeDark} position={[sx, sy, sz - 0.24]} />
        <Box args={[0.36, 0.28, 0.14]} r={0.03} mat={beigeDark} position={[sx, sy, sz - 0.42]} />
        <mesh position={[sx + sw / 2 + 0.03, sy - sh / 2 - 0.05, sz + 0.021]}>
          <planeGeometry args={[0.02, 0.012]} />
          <meshBasicMaterial color={[0.5, 2.6, 1.0]} toneMapped={false} />
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

      {/* Small CRT stacked on top, set back */}
      <group position={[-0.06, sy + sh / 2 + 0.08, sz - 0.24]}>
        <Box args={[0.36, 0.28, 0.3]} r={0.025} mat={beige} position={[0, 0.14, 0]} />
        {[-0.08, 0.06].map((x) => (
          <Box key={x} args={[0.06, 0.035, 0.06]} r={0.01} mat={beigeDark} position={[x, 0.295, -0.04]} />
        ))}
        <mesh position={[0.15, 0.04, 0.152]}>
          <planeGeometry args={[0.016, 0.016]} />
          <meshBasicMaterial color={[2.5, 0.3, 0.3]} toneMapped={false} />
        </mesh>
        <Box args={[0.28, 0.2, 0.02]} r={0.006} mat={bezel} position={[0, 0.145, 0.151]} />
        <mesh position={[0, 0.145, 0.163]}>
          <planeGeometry args={[0.24, 0.17]} />
          <meshBasicMaterial map={status} color={[1.25, 1.25, 1.25]} toneMapped={false} />
        </mesh>
      </group>

      {/* Chunky beige keyboard + mouse */}
      <group position={[0.02, TOP, -0.08]} rotation-x={0.06}>
        <Box args={[0.58, 0.04, 0.2]} r={0.01} mat={beige} position={[0, 0.02, 0]} />
        {Array.from({ length: 4 }).map((_, row) =>
          Array.from({ length: 13 }).map((_, k) => (
            <mesh key={`${row}-${k}`} position={[-0.24 + k * 0.04, 0.044, -0.06 + row * 0.04]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[0.032, 0.032]} />
              <meshStandardMaterial color={row === 3 && k > 3 && k < 9 ? '#c9c2b0' : '#5f5a50'} roughness={0.7} />
            </mesh>
          ))
        )}
      </group>
      <Box args={[0.07, 0.03, 0.11]} r={0.012} mat={beige} position={[-0.42, TOP + 0.015, -0.08]} />

      {/* soda can */}
      <mesh position={[0.45, TOP + 0.06, -0.2]} castShadow>
        <cylinderGeometry args={[0.033, 0.033, 0.12, 12]} />
        <meshStandardMaterial color="#c8282e" metalness={0.5} roughness={0.35} />
      </mesh>

      {/* Second terminal on the floor past the end of the desk, angled to the room: a beige case with a
          green graphics screen, a vent grille, and its keyboard lying in front */}
      <group position={[1.42, 0, 0.42]} rotation-y={-0.55}>
        <Box args={[0.74, 0.42, 0.6]} r={0.03} mat={tan} position={[0, 0.21, -0.06]} />
        <Box args={[0.66, 0.05, 0.4]} r={0.02} mat={{ ...tan, color: '#967f72' }} position={[0.02, 0.445, -0.1]} />
        {[[-0.16, -0.14, 0.16], [0.16, -0.14, 0.16]].map(([x, z, w]) => (
          <Box key={`${x}${z}`} args={[w, 0.05, 0.1]} r={0.012} mat={{ ...tan, color: '#b29a8b' }} position={[x, 0.49, z]} />
        ))}
        <mesh position={[-0.11, 0.22, 0.243]}>
          <planeGeometry args={[0.34, 0.26]} />
          <meshStandardMaterial {...bezel} />
        </mesh>
        <mesh position={[-0.11, 0.22, 0.246]}>
          <planeGeometry args={[0.3, 0.225]} />
          <meshBasicMaterial map={graph.texture} color={[1.15, 1.15, 1.15]} toneMapped={false} />
        </mesh>
        {[0.1, 0.16, 0.22, 0.28].map((y) => (
          <mesh key={y} position={[0.22, y, 0.243]}>
            <planeGeometry args={[0.12, 0.02]} />
            <meshStandardMaterial {...bezel} />
          </mesh>
        ))}
        <mesh position={[0.22, 0.36, 0.244]}>
          <planeGeometry args={[0.018, 0.018]} />
          <meshBasicMaterial color={[2.5, 0.3, 0.3]} toneMapped={false} />
        </mesh>
        <pointLight position={[-0.11, 0.25, 0.55]} color="#4dff8a" intensity={0.8} distance={1.4} />
        <group position={[-0.05, 0, 0.42]} rotation-y={0.25}>
          <Box args={[0.46, 0.035, 0.16]} r={0.01} mat={beige} position={[0, 0.018, 0]} />
          {Array.from({ length: 3 }).map((_, row) => (
            <mesh key={row} position={[0, 0.037, -0.04 + row * 0.04]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[0.4, 0.028]} />
              <meshStandardMaterial color="#5f5a50" roughness={0.7} />
            </mesh>
          ))}
        </group>
      </group>

      {/* Office chair (SJ sits here): dark teal-grey, tall rounded back, armrests, five-star base */}
      <group ref={chair} position={[0, 0, 0.55]}>
        <Box args={[0.52, 0.08, 0.48]} r={0.03} mat={{ color: '#2f383b', roughness: 0.8 }} position={[0, 0.46, 0]} />
        <Box args={[0.46, 0.66, 0.08]} r={0.035} mat={{ color: '#2f383b', roughness: 0.8 }} position={[0, 0.86, 0.26]} rotation-x={-0.08} />
        {[-0.13, 0, 0.13].map((x) => (
          <Box key={x} args={[0.1, 0.56, 0.03]} r={0.012} mat={{ color: '#262e31', roughness: 0.8 }} position={[x, 0.87, 0.215]} rotation-x={-0.08} />
        ))}
        <Box args={[0.1, 0.06, 0.04]} r={0.01} mat={{ color: '#4a5559', roughness: 0.6 }} position={[0, 0.55, 0.25]} />
        {[-0.29, 0.29].map((x) => (
          <group key={x} position={[x, 0, 0.02]}>
            <Box args={[0.05, 0.04, 0.28]} r={0.015} mat={{ color: '#7d9599', roughness: 0.35, metalness: 0.5 }} position={[0, 0.64, 0]} />
            <Box args={[0.03, 0.15, 0.03]} r={0.006} mat={{ color: '#7d9599', roughness: 0.35, metalness: 0.5 }} position={[0, 0.55, 0.1]} />
            <Box args={[0.03, 0.15, 0.03]} r={0.006} mat={{ color: '#7d9599', roughness: 0.35, metalness: 0.5 }} position={[0, 0.55, -0.1]} />
          </group>
        ))}
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.42, 12]} />
          <meshStandardMaterial color="#4a5559" metalness={0.5} roughness={0.4} />
        </mesh>
        {Array.from({ length: 5 }).map((_, i) => (
          <group key={i} rotation-y={(i / 5) * Math.PI * 2}>
            <Box args={[0.05, 0.035, 0.3]} r={0.01} mat={{ color: '#3c4649', roughness: 0.6 }} position={[0, 0.06, 0.15]} />
            <mesh position={[0, 0.025, 0.29]} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.025, 0.025, 0.03, 10]} />
              <meshStandardMaterial color="#1a1d1f" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}
