import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PlaneGeometry, Shape, ShapeGeometry } from 'three'
import { useStore } from '../../store'
import { ARCADE_GAMES } from '../../data/content'
import { createAttractScreen } from '../../lib/screens'
import { buildCabinet } from '../../lib/arcadeCabinet'
import ScreenHtml from '../ScreenHtml'

// Playable upright arcade cabinet: the voxel body from lib/arcadeCabinet.js (2 cm voxels, matching
// the reference's MagicaVoxel look), a curved CRT tube set back in it running attract mode, and the
// game from ARCADE_GAMES (content.js) on the glass when you walk up. Local: back to the wall (-z),
// screen faces +z. Colours come from the zone's `cabinet`, the tube's spot from `zone.screen`.
const GAME_W = 640
const GAME_H = 480
// CRT glass: bulges out toward the middle like a real tube
function crtGlass(w, h, bulge) {
  const g = new PlaneGeometry(w, h, 24, 18)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) / (w / 2)
    const v = p.getY(i) / (h / 2)
    p.setZ(i, bulge * (1 - u * u) * (1 - v * v))
  }
  g.computeVertexNormals()
  return g
}

// Black rounded bezel around the tube
function bezelRing(w, h, border, r) {
  const rect = (path, hw, hh, rr) => {
    path.moveTo(-hw + rr, -hh)
    path.lineTo(hw - rr, -hh)
    path.quadraticCurveTo(hw, -hh, hw, -hh + rr)
    path.lineTo(hw, hh - rr)
    path.quadraticCurveTo(hw, hh, hw - rr, hh)
    path.lineTo(-hw + rr, hh)
    path.quadraticCurveTo(-hw, hh, -hw, hh - rr)
    path.lineTo(-hw, -hh + rr)
    path.quadraticCurveTo(-hw, -hh, -hw + rr, -hh)
    return path
  }
  const outer = rect(new Shape(), w / 2 + border, h / 2 + border, r + border)
  outer.holes.push(rect(new Shape(), w / 2, h / 2, r))
  return new ShapeGeometry(outer, 6)
}

export default function Arcade({ zone }) {
  const game = ARCADE_GAMES[zone.id]
  const { glow } = zone.cabinet
  const playing = useStore((s) => s.arrivedZone === zone.id)
  const attract = useMemo(() => createAttractScreen(game.title, glow), [game.title, glow])
  const vox = useMemo(() => {
    const { grid, palette } = buildCabinet(zone.cabinet, zone.screen)
    return grid.mesh(palette)
  }, [zone])
  const tube = useMemo(
    () => ({ glass: crtGlass(zone.screen.size[0], zone.screen.size[1], 0.018), bezel: bezelRing(...zone.screen.size, 0.03, 0.035) }),
    [zone],
  )
  const screenLight = useRef()
  useFrame(({ clock }, dt) => {
    if (!playing) attract.tick(dt)
    // the screen's glow flickers a touch, like a CRT
    screenLight.current.intensity = 2.2 + Math.sin(clock.elapsedTime * 31) * 0.08 + Math.sin(clock.elapsedTime * 2.3) * 0.15
  })

  const [sx, sy, sz] = zone.screen.local
  return (
    <group>
      <mesh geometry={vox.solid} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.55} metalness={0.08} envMapIntensity={0.6} />
      </mesh>
      <mesh geometry={vox.glow}>
        <meshBasicMaterial vertexColors color={[2.4, 2.4, 2.4]} toneMapped={false} />
      </mesh>

      {/* the tube, set back in the cabinet: black bezel, curved glowing glass running attract mode,
          a glossy layer that catches the room; the live game replaces it while you play */}
      <group position={[sx, sy, sz]} rotation-x={zone.screen.tilt}>
        <mesh geometry={tube.bezel} position-z={0.002}>
          <meshPhysicalMaterial color="#060608" roughness={0.35} clearcoat={0.6} />
        </mesh>
        {!playing && (
          <>
            <mesh geometry={tube.glass}>
              <meshBasicMaterial map={attract.texture} color={[1.9, 1.9, 1.9]} toneMapped={false} />
            </mesh>
            <mesh geometry={tube.glass} position-z={0.002}>
              <meshPhysicalMaterial color="#000000" transparent opacity={0.12} roughness={0.06} metalness={0.2} clearcoat={1} clearcoatRoughness={0.05} envMapIntensity={2} depthWrite={false} />
            </mesh>
          </>
        )}
      </group>
      {playing && (
        <ScreenHtml screen={zone.screen} width={GAME_W} height={GAME_H}>
          <Game game={game} />
        </ScreenHtml>
      )}

      <pointLight ref={screenLight} position={[0, 1.3, 0.85]} color={glow} intensity={2.2} distance={2.6} />
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
