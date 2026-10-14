import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import gsap from 'gsap'
import { useStore } from '../store'
import { HOME_CAMERA, zoneById, zoneCamera } from '../data/zones'

// Keep animations on real time even if a frame stalls.
gsap.ticker.lagSmoothing(0)

// Intro swoop after ENTER, then flies to whichever zone is clicked.
// When the flight lands it calls arrive(), which opens the side panel.
export default function CameraRig() {
  const { camera, pointer, size } = useThree()
  const activeZone = useStore((s) => s.activeZone)
  const arrivedZone = useStore((s) => s.arrivedZone)
  const entered = useStore((s) => s.entered)
  const atScreen = !!(activeZone && zoneById(activeZone).screen)
  const screenAspect = atScreen ? size.width / size.height : 0

  const target = useRef(new Vector3(0, 2.5, 0))
  const basePos = useRef(new Vector3(30, 26, 30))
  const desired = useRef(new Vector3())
  const shift = useRef(0)

  useEffect(() => {
    camera.position.copy(basePos.current)
  }, [camera])

  useEffect(() => {
    if (!entered) return
    const zone = activeZone && zoneById(activeZone)
    const shot = zone ? zoneCamera(zone, size.width / size.height) : HOME_CAMERA
    const tl = gsap.timeline({
      defaults: { duration: zone ? 1.4 : 1.8, ease: 'power3.inOut' },
      onComplete: () => zone && useStore.getState().arrive(zone.id),
    })
    tl.to(basePos.current, { x: shot.position[0], y: shot.position[1], z: shot.position[2] }, 0)
    tl.to(target.current, { x: shot.target[0], y: shot.target[1], z: shot.target[2] }, 0)
    return () => tl.kill()
    // Screen shots depend on the viewport shape, so re-frame them when the window resizes
  }, [activeZone, entered, screenAspect])

  useFrame((_, dt) => {
    // Mouse parallax at the overview only
    const atHome = !activeZone
    const px = atHome ? pointer.x * 0.6 : 0
    const py = atHome ? pointer.y * 0.4 : 0
    desired.current.set(basePos.current.x + px, basePos.current.y + py, basePos.current.z - px)
    camera.position.lerp(desired.current, 1 - Math.exp(-6 * dt))
    camera.lookAt(target.current)

    // Shift the view left while the side panel is open (desktop). Screens have no panel.
    const want = arrivedZone && !atScreen && size.width > 800 ? Math.min(460, size.width * 0.36) / 2 : 0
    shift.current = MathUtils.damp(shift.current, want, 4, dt)
    if (Math.abs(shift.current) > 0.5) {
      camera.setViewOffset(size.width, size.height, shift.current, 0, size.width, size.height)
    } else if (camera.view?.enabled) {
      camera.clearViewOffset()
    }
  })

  return null
}
