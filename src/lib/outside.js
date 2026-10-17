import { CanvasTexture, SRGBColorSpace, RepeatWrapping } from 'three'

// Procedural textures for the view out of the window. Silhouettes are white-on-transparent so the
// Window can tint them for the time of day; lights are a separate layer that fades out by day.

function seeded(seed) {
  let s = seed
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280)
}

function texture(c, repeat = false) {
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  if (repeat) t.wrapS = RepeatWrapping
  return t
}

// A skyline layer: { shape, lights } textures of the same buildings.
export function makeSkyline({ seed = 1, w = 1024, h = 384, minH = 0.25, maxH = 0.9, windows = 0.25, signs = 0.3 } = {}) {
  const rnd = seeded(seed)
  const shapeC = document.createElement('canvas')
  const lightC = document.createElement('canvas')
  shapeC.width = lightC.width = w
  shapeC.height = lightC.height = h
  const g = shapeC.getContext('2d')
  const l = lightC.getContext('2d')
  g.fillStyle = '#ffffff'

  let x = 0
  while (x < w) {
    const bw = 34 + rnd() * 80
    const bh = h * (minH + rnd() * (maxH - minH))
    const top = h - bh
    g.fillRect(x, top, bw, bh)
    // rooftop bits: antenna, water tank, stepped crown
    const r = rnd()
    if (r < 0.25) g.fillRect(x + bw * 0.45, top - 22, 3, 22)
    else if (r < 0.45) g.fillRect(x + bw * 0.2, top - 10, bw * 0.3, 10)
    else if (r < 0.6) g.fillRect(x + bw * 0.15, top - 14, bw * 0.7, 14)

    for (let wy = top + 10; wy < h - 6; wy += 13)
      for (let wx = x + 6; wx < x + bw - 6; wx += 10)
        if (rnd() < windows) {
          l.fillStyle = ['#ffd27a', '#ffe9b8', '#2ef2ff', '#ff3ea5'][Math.floor(rnd() * 4)]
          l.globalAlpha = 0.55 + rnd() * 0.45
          l.fillRect(wx, wy, 5, 6)
        }
    if (rnd() < signs) {
      l.globalAlpha = 1
      l.fillStyle = rnd() < 0.5 ? '#ff3ea5' : '#2ef2ff'
      l.shadowColor = l.fillStyle
      l.shadowBlur = 14
      l.fillRect(x + bw / 2 - 4, top + 18, 8, 40 + rnd() * 50)
      l.shadowBlur = 0
    }
    // red aircraft light on the tallest ones
    if (bh > h * 0.75) {
      l.globalAlpha = 1
      l.fillStyle = '#ff2a3c'
      l.fillRect(x + bw / 2 - 2, top - 4, 4, 4)
    }
    x += bw + 2 + rnd() * 6
  }
  return { shape: texture(shapeC), lights: texture(lightC) }
}

// Soft tileable cloud band (white, alpha).
export function makeClouds(seed = 4) {
  const rnd = seeded(seed)
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 256
  const g = c.getContext('2d')
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 1024
    const y = 60 + rnd() * 140
    const r = 30 + rnd() * 70
    for (const dx of [-1024, 0, 1024]) {
      const grad = g.createRadialGradient(x + dx, y, 0, x + dx, y, r)
      grad.addColorStop(0, 'rgba(255,255,255,0.55)')
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = grad
      g.fillRect(x + dx - r, y - r, r * 2, r * 2)
    }
  }
  return texture(c, true)
}

// Star field (white dots, alpha).
export function makeStars(seed = 9) {
  const rnd = seeded(seed)
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 512
  const g = c.getContext('2d')
  for (let i = 0; i < 260; i++) {
    g.globalAlpha = 0.3 + rnd() * 0.7
    g.fillStyle = '#ffffff'
    const s = rnd() < 0.08 ? 3 : 2
    g.fillRect(rnd() * 1024, rnd() * 512, s, s)
  }
  return texture(c)
}

// Soft round glow (white, alpha) for the sun's halo.
export function makeGlow() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.35)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return texture(c)
}

// A jagged lightning bolt (white, alpha), redrawn each strike so no two look the same.
export function makeBolt() {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 256
  const t = texture(c)
  t.redraw = () => {
    const g = c.getContext('2d')
    g.clearRect(0, 0, 128, 256)
    g.strokeStyle = '#ffffff'
    g.shadowColor = '#bcd0ff'
    g.shadowBlur = 12
    const branch = (x, y, len, w) => {
      g.lineWidth = w
      g.beginPath()
      g.moveTo(x, y)
      for (let i = 0; i < len; i++) {
        x += (Math.random() - 0.5) * 26
        y += 256 / 12
        g.lineTo(x, y)
        if (w > 1.5 && Math.random() < 0.18) {
          g.stroke()
          branch(x, y, 3 + Math.floor(Math.random() * 3), w * 0.5)
          g.lineWidth = w
          g.beginPath()
          g.moveTo(x, y)
        }
      }
      g.stroke()
    }
    branch(64, 0, 12, 3.5)
    t.needsUpdate = true
  }
  t.redraw()
  return t
}

// A band of bare winter trees, like the reference video: { shape, snow } textures of the same trees.
// `shape` is the trunks + branches (white, tinted by the Window); `snow` is the snow stuck to them
// (white), faded in and out with how much snow has settled.
// `edges` keeps the trunks to the sides (framing the view) instead of spreading them across it.
export function makeForest({ seed = 5, w = 1024, h = 512, count = 34, minW = 8, maxW = 24, edges = false } = {}) {
  const rnd = seeded(seed)
  const shapeC = document.createElement('canvas')
  const snowC = document.createElement('canvas')
  shapeC.width = snowC.width = w
  shapeC.height = snowC.height = h
  const g = shapeC.getContext('2d')
  const s = snowC.getContext('2d')
  g.fillStyle = g.strokeStyle = '#ffffff'
  s.fillStyle = s.strokeStyle = '#ffffff'
  g.lineCap = s.lineCap = 'round'

  for (let i = 0; i < count; i++) {
    const x = edges ? (i % 2 ? 0.08 + rnd() * 0.17 : 0.75 + rnd() * 0.17) * w : rnd() * w
    const tw = minW + rnd() * (maxW - minW)
    const lean = (rnd() - 0.5) * 30
    // trunk, tapering toward the top
    g.beginPath()
    g.moveTo(x - tw / 2, h)
    g.lineTo(x + tw / 2, h)
    g.lineTo(x + lean + tw * 0.3, -10)
    g.lineTo(x + lean - tw * 0.3, -10)
    g.fill()
    // snow caught on the left of the trunk, in soft clumps
    for (let y = 0; y < h; y += 8 + rnd() * 14) {
      if (rnd() < 0.4) continue
      const f = y / h
      const cx = x + lean * (1 - f) - tw * (0.25 + 0.2 * f)
      s.beginPath()
      s.ellipse(cx, y, tw * (0.15 + rnd() * 0.15), 4 + rnd() * 10, 0, 0, Math.PI * 2)
      s.fill()
    }
    // branches reaching up and out, with snow along their tops
    const nb = 3 + Math.floor(rnd() * 5)
    for (let b = 0; b < nb; b++) {
      const by = rnd() * h * 0.75
      const f = by / h
      const bx = x + lean * (1 - f)
      const dir = rnd() < 0.5 ? -1 : 1
      const len = 25 + rnd() * 60
      const ex = bx + dir * len
      const ey = by - len * (0.3 + rnd() * 0.5)
      g.lineWidth = Math.max(2, tw * 0.22)
      g.beginPath()
      g.moveTo(bx, by)
      g.lineTo(ex, ey)
      g.stroke()
      s.lineWidth = Math.max(1.5, tw * 0.14)
      s.beginPath()
      s.moveTo(bx, by - 3)
      s.lineTo(ex, ey - 3)
      s.stroke()
    }
  }
  return { shape: texture(shapeC), snow: texture(snowC) }
}

// Soft-topped band for the ground (white, alpha fading out at the top edge).
export function makeGround() {
  const c = document.createElement('canvas')
  c.width = 16
  c.height = 64
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, 64)
  grad.addColorStop(0, 'rgba(255,255,255,0)')
  grad.addColorStop(0.3, 'rgba(255,255,255,1)')
  grad.addColorStop(1, 'rgba(255,255,255,1)')
  g.fillStyle = grad
  g.fillRect(0, 0, 16, 64)
  return texture(c)
}

// The warm city glow on the horizon at night (sodium streetlights + neon): white, fully opaque at the
// bottom and fading out toward the top. The Window tints it orange.
export function makeCityGlow() {
  const c = document.createElement('canvas')
  c.width = 16
  c.height = 256
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 256, 0, 0)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 16, 256)
  return texture(c)
}

// Frosted window glass, lit from behind: a soft bright hotspot up near the top left, faint light
// streaks, darker toward the bottom-right corner. White-ish; the Window tints it for the time of day.
export function makeFrostTexture() {
  const W = 512
  const H = 256
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  g.fillStyle = '#8c8c8c'
  g.fillRect(0, 0, W, H)
  const hot = g.createRadialGradient(W * 0.3, H * 0.2, 0, W * 0.3, H * 0.2, W * 0.62)
  hot.addColorStop(0, 'rgba(255,255,255,1)')
  hot.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  hot.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = hot
  g.fillRect(0, 0, W, H)
  const shade = g.createLinearGradient(0, 0, W, H)
  shade.addColorStop(0.45, 'rgba(0,0,0,0)')
  shade.addColorStop(1, 'rgba(0,0,0,0.45)')
  g.fillStyle = shade
  g.fillRect(0, 0, W, H)
  // soft beams of light falling through the frost
  g.globalCompositeOperation = 'lighter'
  for (const [x, w, a] of [[150, 40, 0.16], [230, 24, 0.12], [300, 60, 0.08]]) {
    const beam = g.createLinearGradient(0, 0, 0, H)
    beam.addColorStop(0, `rgba(255,255,255,${a})`)
    beam.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = beam
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x + w, 0)
    g.lineTo(x + w + 90, H)
    g.lineTo(x + 90, H)
    g.fill()
  }
  g.globalCompositeOperation = 'source-over'
  return texture(c)
}

// Glossy reflections on the glass surface: soft diagonal glints and a bright line along the top
// edge (white on black, used additively).
export function makeGlassGlintTexture() {
  const W = 512
  const H = 256
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  g.fillStyle = '#000'
  g.fillRect(0, 0, W, H)
  const band = (x, w, a) => {
    const grad = g.createLinearGradient(x, 0, x + w, 0)
    grad.addColorStop(0, 'rgba(255,255,255,0)')
    grad.addColorStop(0.5, `rgba(255,255,255,${a})`)
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.save()
    g.transform(1, 0, -0.55, 1, 0, 0)
    g.fillStyle = grad
    g.fillRect(x, 0, w, H)
    g.restore()
  }
  band(200, 70, 0.5)
  band(290, 18, 0.7)
  band(420, 40, 0.35)
  band(600, 110, 0.25)
  const top = g.createLinearGradient(0, 0, 0, 22)
  top.addColorStop(0, 'rgba(255,255,255,0.9)')
  top.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = top
  g.fillRect(0, 0, W, 22)
  return texture(c)
}
