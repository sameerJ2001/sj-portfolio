import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, ExtrudeGeometry, Shape } from 'three'
import { useStore } from '../../store'
import { ARCADE_GAMES } from '../../data/content'
import { createAttractScreen } from '../../lib/screens'
import ScreenHtml from '../ScreenHtml'
import { K, makeNeonTexture } from './materials'

// Playable upright arcade cabinet, shaped like the ones in the reference video: a deep hood that
// overhangs the screen and flares out past the sides on angled braces, a stepped crown with a logo,
// a lit marquee, a big tilted screen, a bulky two-player control deck, coin door and kick plate.
// Idle: attract mode. Walk up to it and the screen loads the game from ARCADE_GAMES (content.js).
// Local: back to the wall (-z), screen faces +z. Colours come from the zone's `cabinet`; the
// screen's spot (zone.screen) sits on the sloped face of PROFILE below.
const GAME_W = 640
const GAME_H = 480
const BODY_W = 0.66
const SIDE_T = 0.05

// Side silhouette as [z (front), y (up)] points, back-bottom first
const PROFILE = [
  [-0.375, 0],
  [0.33, 0],
  [0.33, 0.78], // kick panel + coin door
  [0.6, 0.88], // bulky control deck juts out
  [0.6, 0.99],
  [0.45, 1.08], // …and slopes back up to the screen
  [0.44, 1.13],
  [0.32, 1.64], // tilted screen face
  [0.48, 1.67], // hood reaches out over the screen
  [0.5, 1.94],
  [0.38, 2.0],
  [-0.375, 2.0],
]
const HOOD_W = 0.94 // the hood is wider than the body
// Side panels stand a little proud of the body all round the front
const SIDE_PROFILE = PROFILE.map(([z, y]) => [z > -0.3 ? z + 0.025 : z, y > 1.9 ? y + 0.02 : y])

function profileGeometry(points, width) {
  const s = new Shape()
  points.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)))
  const g = new ExtrudeGeometry(s, { depth: width, bevelEnabled: false })
  // shape x → cabinet z, extrusion → cabinet x (centred)
  g.rotateY(-Math.PI / 2)
  g.translate(width / 2, 0, 0)
  return g
}

// Angled brace under each side of the hood (seen from the front, it makes the top flare out)
function braceGeometry() {
  const s = new Shape()
  s.moveTo(BODY_W / 2 + SIDE_T, 1.12)
  s.lineTo(HOOD_W / 2, 1.67)
  s.lineTo(BODY_W / 2 + SIDE_T, 1.67)
  return new ExtrudeGeometry(s, { depth: 0.44, bevelEnabled: false })
}

export default function Arcade({ zone }) {
  const { body, glow } = zone.cabinet
  const game = ARCADE_GAMES[zone.id]
  const playing = useStore((s) => s.arrivedZone === zone.id)
  const attract = useMemo(() => createAttractScreen(game.title, glow), [game.title, glow])
  const marquee = useMemo(
    () => makeNeonTexture(game.title.toUpperCase(), glow, { w: 512, h: 128, font: 'bold 70px monospace' }),
    [game.title, glow]
  )
  const crown = useMemo(() => makeNeonTexture('SJ', '#ffffff', { w: 256, h: 128, font: 'bold 90px monospace' }), [])
  const geo = useMemo(
    () => ({ body: profileGeometry(PROFILE, BODY_W), side: profileGeometry(SIDE_PROFILE, SIDE_T), brace: braceGeometry() }),
    []
  )
  const sideColor = useMemo(() => new Color(body).multiplyScalar(0.72), [body])
  const marqueeLight = useRef()
  useFrame(({ clock }, dt) => {
    if (!playing) attract.tick(dt)
    // marquee tube hums a little
    marqueeLight.current.color.setScalar(1.6 + Math.sin(clock.elapsedTime * 13) * 0.05)
  })

  const dark = '#14121a'
  const [sx, sy, sz] = zone.screen.local
  const [sw, sh] = zone.screen.size
  const tilt = zone.screen.tilt

  return (
    <group>
      {/* body + side panels */}
      <mesh geometry={geo.body} castShadow receiveShadow>
        <meshPhysicalMaterial {...K.lacquer(body)} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={geo.side} position={[side * (BODY_W / 2 + SIDE_T / 2), 0, 0]} castShadow receiveShadow>
          <meshPhysicalMaterial {...K.lacquer(sideColor)} />
        </mesh>
      ))}
      {/* coloured stripe along the outside of each side panel */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (BODY_W / 2 + SIDE_T + 0.001), 1.2, 0.05]} rotation-y={side * (Math.PI / 2)}>
          <planeGeometry args={[0.5, 0.06]} />
          <meshBasicMaterial color={glow} toneMapped={false} />
        </mesh>
      ))}

      {/* hood: overhangs the screen and sticks out past both sides, on angled braces */}
      <mesh position={[0, 1.835, 0.06]} castShadow receiveShadow>
        <boxGeometry args={[HOOD_W, 0.34, 0.9]} />
        <meshPhysicalMaterial {...K.lacquer(body)} />
      </mesh>
      {[1, -1].map((side) => (
        <mesh key={side} geometry={geo.brace} position={[0, 0, 0.04]} scale-x={side} castShadow>
          <meshPhysicalMaterial {...K.lacquer(sideColor)} side={2} />
        </mesh>
      ))}

      {/* stepped crown with the logo */}
      <mesh position={[0, 2.045, 0.02]} castShadow>
        <boxGeometry args={[0.58, 0.07, 0.4]} />
        <meshPhysicalMaterial {...K.lacquer(body)} />
      </mesh>
      <mesh position={[0, 2.14, 0.02]} castShadow>
        <boxGeometry args={[0.36, 0.13, 0.3]} />
        <meshPhysicalMaterial {...K.lacquer(sideColor)} />
      </mesh>
      <mesh position={[0, 2.14, 0.172]}>
        <planeGeometry args={[0.3, 0.11]} />
        <meshBasicMaterial map={crown} transparent color={[1.6, 1.6, 1.6]} toneMapped={false} depthWrite={false} />
      </mesh>

      {/* marquee on the hood's front with the game's name; light strip underneath onto the screen */}
      <group position={[0, 1.83, 0.512]}>
        <mesh>
          <planeGeometry args={[HOOD_W - 0.08, 0.24]} />
          <meshBasicMaterial ref={marqueeLight} color={glow} toneMapped={false} transparent opacity={0.35} />
        </mesh>
        <mesh position={[0, 0, 0.002]}>
          <planeGeometry args={[HOOD_W - 0.12, 0.2]} />
          <meshBasicMaterial map={marquee} transparent color={[2, 2, 2]} toneMapped={false} depthWrite={false} />
        </mesh>
      </group>
      <mesh position={[0, 1.648, 0.4]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[BODY_W - 0.06, 0.05]} />
        <meshBasicMaterial color="#fff2d0" toneMapped={false} />
      </mesh>

      {/* screen: dark bezel, glass (attract mode), live game while you play */}
      <mesh position={[sx, sy, sz - 0.004]} rotation-x={tilt}>
        <planeGeometry args={[BODY_W - 0.04, sh + 0.08]} />
        <meshStandardMaterial color={dark} roughness={0.3} />
      </mesh>
      <mesh position={[sx, sy, sz]} rotation-x={tilt}>
        <planeGeometry args={[sw, sh]} />
        <meshBasicMaterial map={attract.texture} color={[1.2, 1.2, 1.2]} toneMapped={false} />
      </mesh>
      {playing && (
        <ScreenHtml screen={zone.screen} width={GAME_W} height={GAME_H}>
          <Game game={game} />
        </ScreenHtml>
      )}

      {/* bulky control deck: front lip wider than the body, two raised player stations */}
      <mesh position={[0, 0.935, 0.6]} castShadow>
        <boxGeometry args={[HOOD_W - 0.08, 0.12, 0.06]} />
        <meshPhysicalMaterial {...K.lacquer(body)} />
      </mesh>
      <group position={[0, 1.035, 0.525]} rotation-x={0.54}>
        <mesh position={[0, 0.002, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[BODY_W - 0.02, 0.19]} />
          <meshStandardMaterial color="#1c1a26" />
        </mesh>
        {[-0.17, 0.17].map((px, p) => (
          <group key={px} position={[px, 0, 0]}>
            <mesh position={[0, 0.03, 0]} castShadow>
              <boxGeometry args={[0.28, 0.06, 0.16]} />
              <meshPhysicalMaterial {...K.lacquer(sideColor)} />
            </mesh>
            {/* stick */}
            <mesh position={[-0.07, 0.09, 0.01]}>
              <cylinderGeometry args={[0.009, 0.009, 0.08, 8]} />
              <meshPhysicalMaterial {...K.chrome()} />
            </mesh>
            <mesh position={[-0.07, 0.135, 0.01]} castShadow>
              <sphereGeometry args={[0.028, 14, 10]} />
              <meshStandardMaterial color={p ? '#2ef2ff' : '#e0303a'} roughness={0.3} />
            </mesh>
            {/* buttons */}
            {[
              [0.03, 0.02, '#ffd86b'],
              [0.09, 0.02, '#ff3ea5'],
              [0.06, -0.04, '#ffffff'],
            ].map(([x, z, c]) => (
              <mesh key={`${x}${z}`} position={[x, 0.066, z]}>
                <cylinderGeometry args={[0.018, 0.018, 0.014, 12]} />
                <meshBasicMaterial color={c} toneMapped={false} />
              </mesh>
            ))}
          </group>
        ))}
        {/* glow strip along the front edge */}
        <mesh position={[0, 0.003, 0.094]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[BODY_W - 0.02, 0.012]} />
          <meshBasicMaterial color={glow} toneMapped={false} />
        </mesh>
      </group>
      {/* controller cables hanging under the deck */}
      {[-0.22, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.72, 0.58]}>
          <cylinderGeometry args={[0.008, 0.008, 0.3, 6]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}

      {/* coin door + kick plate */}
      <mesh position={[0, 0.48, 0.332]}>
        <planeGeometry args={[0.3, 0.38]} />
        <meshPhysicalMaterial {...K.satin('#3a3842')} />
      </mesh>
      {[-0.09, 0, 0.09].map((x) => (
        <mesh key={x} position={[x, 0.36, 0.333]}>
          <planeGeometry args={[0.025, 0.1]} />
          <meshStandardMaterial color="#0c0b10" />
        </mesh>
      ))}
      {[-0.055, 0.055].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.56, 0.334]}>
            <planeGeometry args={[0.05, 0.07]} />
            <meshBasicMaterial color="#ff6a3d" toneMapped={false} />
          </mesh>
          <mesh position={[x, 0.42, 0.334]}>
            <planeGeometry args={[0.06, 0.03]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.06, 0.336]}>
        <planeGeometry args={[BODY_W, 0.12]} />
        <meshStandardMaterial color={dark} />
      </mesh>

      <pointLight position={[0, 1.4, 0.8]} color={glow} intensity={1.5} distance={2.2} />
    </group>
  )
}

function Game({ game }) {
  const frame = useRef()

  // Grab keyboard focus for the game, and let ESC inside it step back out (same-origin pages only)
  const onLoad = () => {
    const f = frame.current
    f.focus({ preventScroll: true })
    try {
      f.contentWindow.focus()
      f.contentWindow.addEventListener('keydown', (e) => e.key === 'Escape' && useStore.getState().goHome())
    } catch {
      // cross-origin game: use the ← back button instead
    }
  }

  return (
    <div className="arcade-screen">
      {game.src ? (
        <iframe ref={frame} src={game.src} title={game.title} onLoad={onLoad} allow="autoplay; fullscreen; gamepad" />
      ) : (
        <p className="arcade-screen__empty">NO GAME LOADED — set a src in content.js</p>
      )}
      <div className="crt-glass" />
    </div>
  )
}
