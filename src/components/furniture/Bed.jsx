import { useStore } from '../../store'
import { K } from './materials'
import RBox from './RBox'

// Sleek platform bed (upstairs, lengthways under the window), in the sci-fi material set: a gunmetal
// platform floating on a recessed plinth with a faint amber underglow, a soft rounded mattress,
// blanket and pillow, and a satin-metal bedside table with the journal and a chrome lamp.
// Local: wall at -z, the bed runs along x, pillows on the left (-x).
export default function Bed() {
  const lightsOn = useStore((s) => s.lightsOn)
  const glow = <meshBasicMaterial color={lightsOn ? [2.4, 1.1, 0.4] : [0.6, 0.3, 0.1]} toneMapped={false} />

  return (
    <group>
      {/* recessed plinth, amber underglow, gunmetal platform */}
      <RBox args={[2.16, 0.07, 1.46]} r={0.015} m={K.gunmetal('#16171c')} position={[0, 0.035, 0]} />
      <mesh position={[0, 0.03, 0.735]}>
        <planeGeometry args={[2.1, 0.02]} />
        {glow}
      </mesh>
      <mesh position={[1.085, 0.03, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[1.4, 0.02]} />
        {glow}
      </mesh>
      <RBox args={[2.4, 0.16, 1.7]} r={0.03} m={K.gunmetal('#2b2e36')} position={[0, 0.15, 0]} />

      {/* mattress, blanket over the foot end, pillow */}
      <RBox args={[2.2, 0.2, 1.55]} r={0.07} m={K.fabric('#e4e0d6')} position={[0, 0.33, 0]} />
      <RBox args={[1.72, 0.07, 1.62]} r={0.03} m={K.fabric('#c9452c')} position={[0.25, 0.45, 0.01]} />
      {[0.45, -0.45].map((z) => (
        <RBox key={z} args={[1.72, 0.012, 0.07]} r={0.005} m={K.fabric('#e8664a')} position={[0.25, 0.487, z]} shadow={false} />
      ))}
      <RBox args={[0.42, 0.14, 1.1]} r={0.06} m={K.fabric('#d9772b')} position={[-0.82, 0.5, 0]} />

      {/* satin-metal bedside table at the head of the bed, against the wall */}
      <group position={[-1.5, 0, -0.3]}>
        <RBox args={[0.55, 0.54, 0.55]} r={0.025} m={K.satin('#5d6b70')} position={[0, 0.27, 0]} />
        <RBox args={[0.57, 0.03, 0.57]} r={0.012} m={K.lacquer('#1e2126')} position={[0, 0.555, 0]} />
        <RBox args={[0.45, 0.01, 0.01]} r={0.004} m={K.chrome()} position={[0, 0.36, 0.281]} shadow={false} />
        {/* journal */}
        <group position={[-0.08, 0.59, 0.05]} rotation-y={0.3}>
          <RBox args={[0.24, 0.04, 0.32]} r={0.008} m={K.fabric('#7a3b2a')} />
          <RBox args={[0.03, 0.006, 0.32]} r={0.002} m={K.chrome('#d9b45a')} position={[0, 0.022, 0]} shadow={false} />
        </group>
        {/* chrome lamp with a glowing shade */}
        <mesh position={[0.15, 0.69, -0.12]}>
          <cylinderGeometry args={[0.015, 0.05, 0.22, 16]} />
          <meshPhysicalMaterial {...K.chrome()} />
        </mesh>
        <mesh position={[0.15, 0.87, -0.12]}>
          <cylinderGeometry args={[0.08, 0.13, 0.16, 24]} />
          <meshStandardMaterial color="#ffe2b0" emissive="#ffb347" emissiveIntensity={lightsOn ? 2.5 : 0.2} toneMapped={false} />
        </mesh>
        {lightsOn && <pointLight position={[0.15, 0.9, -0.12]} intensity={3} distance={3.5} color="#ffb347" />}
      </group>
    </group>
  )
}
