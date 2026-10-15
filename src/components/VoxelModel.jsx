import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Box3, CanvasTexture, Color, NearestFilter } from 'three'
import { MODELS } from '../data/models'

// Puts one of your MagicaVoxel models (see data/models.js) into the scene: centred on its spot and
// sitting on the floor, with crisp palette colours, shadows, and its glow colours lit up.
// MagicaVoxel exports every colour into one palette texture, so glow is done per colour here.
export default function VoxelModel({ name, ...props }) {
  const { url, glow = [], glowIntensity = 3 } = MODELS[name]
  const { scene } = useGLTF(url)

  const { model, offset } = useMemo(() => {
    prepare(scene, glow, glowIntensity)
    const box = new Box3().setFromObject(scene)
    return {
      model: scene.clone(true), // shares geometry + materials, so many copies stay cheap
      offset: [-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2],
    }
  }, [scene]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group {...props}>
      <primitive object={model} position={offset} />
    </group>
  )
}

Object.values(MODELS).forEach((m) => useGLTF.preload(m.url))

// Once per loaded file: nearest-neighbour palette (no colour bleeding between voxels), shadows,
// and an emissive mask that lights up only the glow colours.
function prepare(scene, glow, intensity) {
  scene.traverse((o) => {
    if (!o.isMesh) return
    o.castShadow = true
    o.receiveShadow = true
    const m = o.material
    if (m.userData.voxel) return
    m.userData.voxel = true
    m.roughness = 0.9
    if (!m.map) return
    crisp(m.map)
    if (glow.length) {
      m.emissiveMap = glowMask(m.map, glow)
      m.emissive = new Color('#ffffff')
      m.emissiveIntensity = intensity
    }
    m.needsUpdate = true
  })
}

function crisp(t) {
  t.magFilter = NearestFilter
  t.minFilter = NearestFilter
  t.generateMipmaps = false
  t.needsUpdate = true
}

// Copy of the palette with every colour blacked out except the glow ones
function glowMask(map, glow) {
  const img = map.image
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const g = c.getContext('2d')
  g.drawImage(img, 0, 0)
  const data = g.getImageData(0, 0, c.width, c.height)
  const targets = glow.map((hex) => new Color(hex).getHex()).map((n) => [(n >> 16) & 255, (n >> 8) & 255, n & 255])
  const px = data.data
  for (let i = 0; i < px.length; i += 4) {
    const lit = targets.some(([r, gg, b]) => Math.abs(px[i] - r) + Math.abs(px[i + 1] - gg) + Math.abs(px[i + 2] - b) < 12)
    if (!lit) px[i] = px[i + 1] = px[i + 2] = 0
  }
  g.putImageData(data, 0, 0)
  const t = new CanvasTexture(c)
  t.flipY = map.flipY
  t.colorSpace = map.colorSpace
  t.channel = map.channel
  crisp(t)
  return t
}
