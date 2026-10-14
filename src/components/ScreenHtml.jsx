import { useCallback } from 'react'
import { Html } from '@react-three/drei'

// Puts real, usable DOM (SJ-OS, an arcade game iframe…) onto a zone's screen.
// You lay the content out in CSS pixels (`width` x `height`); drei scales it so it spans the screen's
// world size exactly. Lives inside the furniture's group, so `screen.local` is in furniture space.
//
// drei renders this content in its own React root, appended inside the canvas's event source. Without
// care, every click on the screen would also bubble to the 3D scene (and e.g. click the floor). So we
// stop native events at that root wrapper, after React inside it has already handled them.
const EVENTS = ['pointerdown', 'pointerup', 'pointermove', 'click', 'dblclick', 'wheel', 'contextmenu']
const stop = (e) => e.stopPropagation()
const guarded = new WeakSet()

export default function ScreenHtml({ screen, width, height, visible = true, children }) {
  const { local, tilt = 0, size } = screen

  const contentRef = useCallback((node) => {
    const wrapper = node?.closest('.screen-html')
    if (!wrapper || guarded.has(wrapper)) return
    guarded.add(wrapper)
    EVENTS.forEach((type) => wrapper.addEventListener(type, stop))
  }, [])

  return (
    <group position={local} rotation-x={tilt}>
      <Html
        ref={contentRef}
        transform
        wrapperClass="screen-html"
        position={[0, 0, 0.003]}
        // world size = px * distanceFactor / 400
        distanceFactor={(400 * size[0]) / width}
        // stay under the HUD (z-index 5)
        zIndexRange={[4, 0]}
        pointerEvents={visible ? 'auto' : 'none'}
        style={{ width, height, visibility: visible ? 'visible' : 'hidden' }}
      >
        {children}
      </Html>
    </group>
  )
}
