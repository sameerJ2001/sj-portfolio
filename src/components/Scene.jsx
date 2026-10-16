import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, Outline, Selection, Vignette, ChromaticAberration, Noise, N8AO } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'
import { useStore } from '../store'
import { env } from '../lib/environment'
import { ZONES, UP } from '../data/zones'
import CameraRig from './CameraRig'
import Character from './Character'
import Zone from './Zone'
import Room from './furniture/Room'
import BattleStation from './furniture/BattleStation'
import GrandPiano from './furniture/GrandPiano'
import PhotoWall from './furniture/PhotoWall'
import Window from './furniture/Window'
import Easel from './furniture/Easel'
import Bed from './furniture/Bed'
import Kitchen from './furniture/Kitchen'
import GearCorner from './furniture/GearCorner'
import Arcade from './furniture/Arcade'

// Which 3D piece belongs to which zone id (see data/zones.js). Each piece gets its zone as a prop.
const FURNITURE = {
  pc: BattleStation,
  piano: GrandPiano,
  photos: PhotoWall,
  window: Window,
  easel: Easel,
  journal: Bed,
  kitchen: Kitchen,
  gear: GearCorner,
  'arcade-blue': Arcade,
  'arcade-red': Arcade,
}

const aberration = new Vector2(0.0006, 0.0006)

// Very low fill so the room reads in the dark: almost all the light comes from things that glow
// (neon signs, screens, lamps, the window). Lifted a little in daytime, flashed by lightning.
function Ambience({ lightsOn }) {
  const amb = useRef()
  const hemi = useRef()
  useFrame(() => {
    const day = env.daylight * (1 - env.cloud * 0.5)
    amb.current.intensity = (lightsOn ? 0.34 : 0.18) + day * 0.4 + env.flash * 1.5
    hemi.current.intensity = (lightsOn ? 0.5 : 0.26) + day * 0.45
  })
  return (
    <>
      <ambientLight ref={amb} color="#8fb4c0" />
      <hemisphereLight ref={hemi} args={['#6fb3b6', '#2a2226']} />
    </>
  )
}

export default function Scene() {
  const lightsOn = useStore((s) => s.lightsOn)

  return (
    <Canvas gl={{ preserveDrawingBuffer: import.meta.env.DEV }} shadows="percentage" dpr={[1, 2]} camera={{ fov: 30, near: 0.1, far: 200 }}>
      <color attach="background" args={['#0b0a14']} />

      {/* Faint neon-coloured reflections for the metal — kept low so they don't light the room */}
      <Environment resolution={256} environmentIntensity={0.3}>
        <Lightformer intensity={1.2} position={[0, 5, 5]} scale={[10, 3, 1]} color="#ff7ad1" />
        <Lightformer intensity={1.2} position={[-5, 2, 0]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} color="#5ee7ff" />
        <Lightformer intensity={0.8} position={[5, 3, -3]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} color="#ffcf6b" />
      </Environment>

      <Ambience lightsOn={lightsOn} />
      {/* a whisper of cool night air from above, so edges don't vanish completely */}
      <directionalLight position={[6, 12, 6]} intensity={0.22} color="#7fa6c0" />

      {/* Floating dust in the air */}
      <Sparkles count={60} scale={[8, UP * 2, 8]} position={[0, UP, 0]} size={1.5} speed={0.15} opacity={0.4} color="#c9b8ff" />

      <Selection>
        <Room />
        {ZONES.map((zone) => {
          const Piece = FURNITURE[zone.id]
          return (
            <Zone key={zone.id} zone={zone}>
              <Piece zone={zone} />
            </Zone>
          )
        })}
        <Character />

        <EffectComposer multisampling={4} autoClear={false}>
          {/* soft contact shadows in every crease, like the reference's voxel render */}
          <N8AO aoRadius={0.5} distanceFalloff={0.6} intensity={2.6} color="#05080a" quality="medium" halfRes />
          <Outline visibleEdgeColor={0xffd86b} hiddenEdgeColor={0xffd86b} edgeStrength={6} blur />
          <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.3} intensity={1.7} mipmapBlur />
          <ChromaticAberration offset={aberration} />
          <Noise blendFunction={BlendFunction.OVERLAY} opacity={0.12} />
          <Vignette offset={0.3} darkness={0.6} />
        </EffectComposer>
      </Selection>

      <CameraRig />
    </Canvas>
  )
}
