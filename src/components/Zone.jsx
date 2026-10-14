import { Html } from '@react-three/drei'
import { Select } from '@react-three/postprocessing'
import { useStore } from '../store'

// Wraps a piece of furniture: positions it, and makes it clickable.
// Hover → glowing outline + label. Click → camera flies there.
export default function Zone({ zone, children }) {
  const hovered = useStore((s) => s.hoveredZone === zone.id)
  const entered = useStore((s) => s.entered)
  const busy = useStore((s) => s.activeZone !== null)
  const setHovered = useStore((s) => s.setHovered)
  const selectZone = useStore((s) => s.selectZone)
  const show = hovered && entered && !busy
  const [x, y, z, rot] = zone.place

  return (
    <group>
      <group
        position={[x, y, z]}
        rotation-y={rot}
        onPointerOver={(e) => {
          e.stopPropagation()
          if (!entered) return
          setHovered(zone.id)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(null)
          document.body.style.cursor = 'auto'
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (entered) selectZone(zone.id)
        }}
      >
        <Select enabled={show}>{children}</Select>
      </group>

      {/* Always mounted, just hidden — avoids remounting the label on every hover */}
      <Html position={[zone.focus[0], zone.focus[1] + 0.9, zone.focus[2]]} center style={{ pointerEvents: 'none' }}>
        <div className={`zone-label ${zone.main ? 'zone-label--main' : ''} ${show ? '' : 'zone-label--hidden'}`}>
          {zone.main && '★ '}
          {zone.label}
        </div>
      </Html>
    </group>
  )
}
