import { Crate } from './Decor'
import { Dumbbell, Surfboard, TennisBall, TennisRacket } from './Gear'

// Gear on the reference's storage crates, modelled realistically (see Gear.jsx): two hex dumbbells
// on the left crate, a tennis racket and a ball on the right one, a shortboard leaning against it,
// and a ball that rolled onto the floor. Local: front faces +z, x runs along the crates.
const CRATE_TOP = 0.5

export default function GearCorner() {
  return (
    <group>
      <Crate position={[-0.5, 0, 0]} />
      <Crate position={[0.48, 0, 0.08]} rotation-y={0.12} />

      {/* shortboard standing on its tail, deck to the room, leaning back against the wall side */}
      <Surfboard position={[1.27, 0.93, -0.02]} rotation={[-0.16, 0.35, 0.14]} />

      {/* hex dumbbells lying on the left crate */}
      <Dumbbell position={[-0.66, CRATE_TOP + 0.058, 0.02]} rotation-y={Math.PI / 2 + 0.08} />
      <Dumbbell position={[-0.34, CRATE_TOP + 0.058, -0.02]} rotation-y={Math.PI / 2 - 0.15} />

      {/* tennis racket lying on the right crate, a ball beside it, and one on the floor */}
      <TennisRacket position={[0.36, CRATE_TOP + 0.012, 0.26]} rotation={[-Math.PI / 2, 0, -0.9]} />
      <TennisBall position={[0.74, CRATE_TOP + 0.033, 0.2]} />
      <TennisBall position={[-0.2, 0.033, 0.52]} />
    </group>
  )
}
