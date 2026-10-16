import { RoundedBox } from '@react-three/drei'

// A softly rounded box with a physical material: the building block for the sleek furniture.
// <RBox args={[w, h, d]} r={0.02} m={K.satin()} position={...} />  (or pass a ready-made material={...})
export default function RBox({ args, r = 0.015, m, shadow = true, children, ...props }) {
  return (
    <RoundedBox args={args} radius={Math.min(r, ...args.map((a) => a / 2 - 0.001))} smoothness={3} castShadow={shadow} receiveShadow {...props}>
      {m && <meshPhysicalMaterial {...m} />}
      {children}
    </RoundedBox>
  )
}
