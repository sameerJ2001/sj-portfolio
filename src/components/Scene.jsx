import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, Outline, Selection, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import { Vector2 } from 'three'
import { useStore } from '../store'
import { env } from '../lib/environment'
import { ZONES, UP, zoneById } from '../data/zones'
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

// Fill light for the whole room: cool industrial grey-blue at night, lifted a little in daytime (less when overcast),
// and flashed by lightning.
function Ambience({ lightsOn }) {
  const amb = useRef()
  const hemi = useRef()
  useFrame(() => {
    const day = env.daylight * (1 - env.cloud * 0.5)
    amb.current.intensity = (lightsOn ? 0.85 : 0.4) + day * 0.5 + env.flash * 1.5
    hemi.current.intensity = (lightsOn ? 0.95 : 0.45) + day * 0.55
  })
  return (
    <>
      <ambientLight ref={amb} color="#9aa2c2" />
      <hemisphereLight ref={hemi} args={['#8e9ccc', '#2b2522']} />
    </>
  )
}
const piano = zoneById('piano').place

export default function Scene() {
  const lightsOn = useStore((s) => s.lightsOn)

  return (
    <Canvas gl={{ preserveDrawingBuffer: import.meta.env.DEV }} shadows="percentage" dpr={[1, 2]} camera={{ fov: 30, near: 0.1, far: 200 }}>
      <color attach="background" args={['#0b0a14']} />

      {/* Soft reflections for the gold and metal — built in, no HDR download */}
      <Environment resolution={256}>
        <Lightformer intensity={1.2} position={[0, 5, 5]} scale={[10, 3, 1]} color="#ff7ad1" />
        <Lightformer intensity={1.2} position={[-5, 2, 0]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} color="#5ee7ff" />
        <Lightformer intensity={0.8} position={[5, 3, -3]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} color="#ffcf6b" />
      </Environment>

      <Ambience lightsOn={lightsOn} />
      <directionalLight
        position={[6, 12, 6]}
        intensity={lightsOn ? 1.6 : 0.6}
        color="#b9c3ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />
      {/* Warm work lights: under the desk wing (kitchen) and over the piano */}
      {lightsOn && (
        <>
          <pointLight position={[-2.8, 2.1, 2.2]} color="#ffb070" intensity={2} distance={5} />
          <pointLight position={[piano[0], 3.6, piano[2]]} color="#ffcf8a" intensity={5} distance={6} />
        </>
      )}

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
          <Outline visibleEdgeColor={0xffd86b} hiddenEdgeColor={0xffd86b} edgeStrength={6} blur />
          <Bloom luminanceThreshold={0.9} intensity={1.2} mipmapBlur />
          <ChromaticAberration offset={aberration} />
          <Vignette offset={0.3} darkness={0.45} />
        </EffectComposer>
      </Selection>

      <CameraRig />
    </Canvas>
  )
}
