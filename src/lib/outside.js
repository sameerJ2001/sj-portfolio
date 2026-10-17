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

// ---------- futuristic Sydney outside the window ----------
// Looking across the harbour at night: the CBD's glass towers with Sydney Tower's golden turret, the
// Opera House sails and the Harbour Bridge on the water, neon towers framing the sides.
// Every layer is a full outside plane (OW × OH, centred on the window); `base` is the waterline,
// as a fraction of the texture's height from the top (WATERLINE), where the far buildings stand.
export const WATERLINE = 0.615
const NEON = ['#2ef2ff', '#ff2fa8', '#5a8cff', '#39ff9c', '#ffb02e', '#b14bff']
const WINDOW_LIGHT = ['#ffe2a8', '#fff1d6', '#bfe9ff', '#ffd27a']
const BILLBOARDS = ['SYDNEY', 'SJ INC', 'BONDI', 'HARBOUR', 'SURF CO', 'OPEN 24/7', 'KINGS X', 'METRO', 'NEON NIGHTS']
const VERTICAL = ['BAR', 'SURF', 'HOTEL', 'CAFE', 'OPEN', 'TAXI', 'GYM', 'PUB', 'ARCADE']
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'

// A glowing word, centred on (x, y)
function neonText(l, text, x, y, size, color) {
  l.font = `bold ${Math.round(size)}px ${FONT}`
  l.textAlign = 'center'
  l.textBaseline = 'middle'
  l.shadowColor = color
  l.shadowBlur = size * 0.6
  l.fillStyle = color
  l.fillText(text, x, y)
  l.shadowBlur = 0
  l.fillStyle = '#ffffff'
  l.globalAlpha = 0.85
  l.fillText(text, x, y)
  l.globalAlpha = 1
}

// One layer of the city: { shape, lights } textures of the same towers.
//   shape:  white silhouettes with fake depth (a darker side face, setbacks, rooftop plant, masts),
//           tinted by the time of day in Window.jsx
//   lights: lit window grids (whole floors lit like offices), glowing crowns, vertical neon signs and
//           billboards with English words, red beacons, drawn additively (brighter at night)
// `base` is where they stand (0–1 down the texture); `edges` keeps them to the sides to frame the view.
export function makeCityLayer({
  seed = 1, w = 2048, h = 1024, base = 1, minW = 60, maxW = 160, minH = 0.4, maxH = 1, gap = [2, 10],
  floor = 9, windowsOn = 0.35, signs = 0.3, billboards = 0.2, crowns = 0.2, edges = null, skip = null,
} = {}) {
  const rnd = seeded(seed)
  const shapeC = document.createElement('canvas')
  const lightC = document.createElement('canvas')
  shapeC.width = lightC.width = w
  shapeC.height = lightC.height = h
  const g = shapeC.getContext('2d')
  const l = lightC.getContext('2d')
  const ground = base * h

  const building = (x, bw, bh) => {
    const top = ground - bh
    const shade = 0.78 + rnd() * 0.22
    const v = Math.round(255 * shade)
    g.fillStyle = `rgb(${v},${v},${v})`
    g.fillRect(x, top, bw, bh)
    // side face in shadow, and a lit edge
    const side = Math.max(3, bw * (0.1 + rnd() * 0.1))
    g.fillStyle = 'rgba(0,0,0,0.35)'
    g.fillRect(x + bw - side, top, side, bh)
    g.fillStyle = 'rgba(255,255,255,0.25)'
    g.fillRect(x, top, Math.max(1, bw * 0.02), bh)
    // setbacks, rooftop plant, mast
    let roof = top
    if (rnd() < 0.55) {
      const sw = bw * (0.5 + rnd() * 0.3)
      const sh = bh * (0.04 + rnd() * 0.08)
      g.fillStyle = `rgb(${v},${v},${v})`
      g.fillRect(x + (bw - sw) / 2, top - sh, sw, sh)
      roof = top - sh
    }
    if (rnd() < 0.5) g.fillRect(x + bw * (0.2 + rnd() * 0.4), roof - 6, bw * 0.18, 6)
    let mast = 0
    if (rnd() < 0.35) {
      mast = 12 + rnd() * 40
      g.fillRect(x + bw / 2 - 1, roof - mast, 2, mast)
    }
    // window grid: some floors fully lit (offices), the rest scattered; some towers mostly dark
    const lit = windowsOn * (0.2 + rnd() * 1.2)
    const cols = Math.max(2, Math.floor((bw - side - 6) / (floor * 0.9)))
    const cw = (bw - side - 6) / cols
    for (let y = top + floor; y < ground - 4; y += floor) {
      const office = rnd() < (0.08 * lit) / windowsOn
      const tint = WINDOW_LIGHT[Math.floor(rnd() * WINDOW_LIGHT.length)]
      for (let c = 0; c < cols; c++) {
        if (!office && rnd() > lit) continue
        l.globalAlpha = office ? 0.75 : 0.35 + rnd() * 0.55
        l.fillStyle = tint
        l.fillRect(Math.round(x + 3 + c * cw), Math.round(y), Math.max(1, Math.round(cw * 0.6)), Math.max(1, Math.round(floor * 0.5)))
      }
    }
    l.globalAlpha = 1
    // glowing crown: a neon band round the top of the tower
    if (rnd() < crowns) {
      const col = NEON[Math.floor(rnd() * 3)]
      l.fillStyle = col
      l.shadowColor = col
      l.shadowBlur = 12
      l.fillRect(x, top, bw - side, 3)
      l.fillRect(x, top + floor * 1.5, bw - side, 2)
      l.shadowBlur = 0
    }
    // vertical neon sign: letters stacked down a lit panel
    if (rnd() < signs && bh > h * 0.25) {
      const word = VERTICAL[Math.floor(rnd() * VERTICAL.length)]
      const sw = Math.max(10, Math.round(bw * 0.14))
      const sh = Math.round(sw * (word.length * 1.15 + 0.6))
      const sx = Math.round(x + (rnd() < 0.5 ? bw * 0.08 : bw - side - sw - bw * 0.06))
      const sy = Math.round(top + bh * (0.08 + rnd() * 0.25))
      const col = NEON[Math.floor(rnd() * NEON.length)]
      l.globalAlpha = 0.28
      l.fillStyle = col
      l.fillRect(sx, sy, sw, sh)
      l.globalAlpha = 1
      ;[...word].forEach((ch, i) => neonText(l, ch, sx + sw / 2, sy + sw * (0.85 + i * 1.15), sw * 0.85, col))
    }
    // billboard with a word on it
    if (rnd() < billboards && bw > 40) {
      const word = BILLBOARDS[Math.floor(rnd() * BILLBOARDS.length)]
      const bbw = Math.round(bw * (0.6 + rnd() * 0.3))
      const bbh = Math.round(bbw * (0.28 + rnd() * 0.18))
      const bx = Math.round(x + (bw - side - bbw) / 2)
      const by = Math.round(top + bh * (0.08 + rnd() * 0.3))
      const col = NEON[Math.floor(rnd() * 4)]
      const grad = l.createLinearGradient(bx, by, bx, by + bbh)
      grad.addColorStop(0, col)
      grad.addColorStop(1, '#0a1a4a')
      l.shadowColor = col
      l.shadowBlur = bbw * 0.2
      l.fillStyle = grad
      l.globalAlpha = 0.55
      l.fillRect(bx, by, bbw, bbh)
      l.shadowBlur = 0
      l.globalAlpha = 1
      l.font = `bold 10px ${FONT}`
      const fit = Math.min(bbh * 0.62, ((bbw * 0.86) / l.measureText(word).width) * 10)
      neonText(l, word, bx + bbw / 2, by + bbh / 2, fit, '#ffffff')
    }
    // red beacon on the tall ones
    if (bh > h * 0.45 || mast) {
      l.fillStyle = '#ff2a3c'
      l.shadowColor = '#ff2a3c'
      l.shadowBlur = 8
      l.fillRect(Math.round(x + bw / 2 - 2), Math.round((mast ? roof - mast : roof) - 3), 4, 4)
      l.shadowBlur = 0
    }
  }

  const row = (a, b) => {
    let x = a * w - rnd() * maxW * 0.3
    while (x < b * w) {
      const bw = minW + rnd() * (maxW - minW)
      const mid = (x + bw / 2) / w
      if (!skip || mid < skip[0] || mid > skip[1]) building(x, Math.min(bw, b * w - x + maxW * 0.3), h * (minH + rnd() * (maxH - minH)))
      x += bw + gap[0] + rnd() * (gap[1] - gap[0])
    }
  }
  if (edges) edges.forEach(([a, b]) => row(a, b))
  else row(0, 1)

  return { shape: texture(shapeC), lights: texture(lightC), g, l, rnd }
}

// Sydney Tower: a slim shaft rising out of the CBD to the golden turret, then the spire
export function drawSydneyTower({ g, l }, x, ground, h) {
  const turretY = ground - h * 0.3
  const tw = h * 0.075
  g.fillStyle = '#d8d8d8'
  g.fillRect(x - 4, turretY, 8, ground - turretY) // shaft
  g.fillStyle = 'rgba(255,255,255,0.6)'
  for (const dx of [-9, 9]) g.fillRect(x + dx - 0.5, turretY + tw, 1, ground - turretY - tw) // cable stays
  g.fillStyle = '#ececec'
  g.beginPath() // turret: flared drum
  g.moveTo(x - tw * 0.35, turretY + tw * 0.75)
  g.lineTo(x - tw * 0.55, turretY + tw * 0.35)
  g.lineTo(x - tw * 0.5, turretY)
  g.lineTo(x + tw * 0.5, turretY)
  g.lineTo(x + tw * 0.55, turretY + tw * 0.35)
  g.lineTo(x + tw * 0.35, turretY + tw * 0.75)
  g.closePath()
  g.fill()
  g.fillRect(x - 2, turretY - h * 0.14, 4, h * 0.14) // spire
  g.fillRect(x - 6, turretY - h * 0.03, 12, h * 0.03)
  // golden turret glass, a cyan ring, beacon
  l.shadowColor = '#ffcc66'
  l.shadowBlur = 18
  l.fillStyle = '#ffcc66'
  for (let i = 0; i < 4; i++) l.fillRect(x - tw * 0.5, turretY + tw * (0.08 + i * 0.12), tw, tw * 0.06)
  l.shadowColor = '#2ef2ff'
  l.fillStyle = '#2ef2ff'
  l.fillRect(x - tw * 0.55, turretY + tw * 0.62, tw * 1.1, 3)
  l.shadowColor = '#ff2a3c'
  l.fillStyle = '#ff2a3c'
  l.fillRect(x - 2, turretY - h * 0.14 - 4, 4, 4)
  l.shadowBlur = 0
  l.fillStyle = '#ffe2a8'
  l.globalAlpha = 0.7
  for (let y = turretY + tw; y < ground; y += 14) l.fillRect(x - 1, y, 2, 3) // lift lights up the shaft
  l.globalAlpha = 1
}

// The harbour's landmarks on the waterline: { shape, lights }.
// Harbour Bridge (steel arch truss, hangers, deck, sandstone pylons, lights strung along the arch)
// and the Opera House (white sails on their podium, glowing with projections at night).
// Shapes keep their own colours (white sails, grey steel, sandstone) for the Window to tint.
export function makeHarbour({ w = 2048, h = 1024, bridge = [0.52, 0.8], opera = [0.27, 0.41] } = {}) {
  const shapeC = document.createElement('canvas')
  const lightC = document.createElement('canvas')
  shapeC.width = lightC.width = w
  shapeC.height = lightC.height = h
  const g = shapeC.getContext('2d')
  const l = lightC.getContext('2d')
  const water = WATERLINE * h

  // --- Harbour Bridge ---
  const [a, b] = bridge.map((f) => f * w)
  const deck = water - h * 0.045
  const span = b - a
  const pylonW = span * 0.07
  const archA = a + pylonW
  const archB = b - pylonW
  const rise = h * 0.2
  const arch = (t, off) => {
    const x = archA + (archB - archA) * t
    return [x, deck + h * 0.01 - rise * 4 * t * (1 - t) - off]
  }
  g.strokeStyle = '#9aa3ad'
  g.lineCap = 'round'
  for (const [off, lw] of [[0, 5], [h * 0.035, 4]]) {
    g.lineWidth = lw
    g.beginPath()
    for (let t = 0; t <= 1.001; t += 0.02) {
      const [x, y] = arch(t, off)
      if (t === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()
  }
  g.lineWidth = 1.5 // lattice between the chords, and hangers down to the deck
  for (let t = 0; t < 1; t += 0.04) {
    const [x1, y1] = arch(t, 0)
    const [x2, y2] = arch(t + 0.04, h * 0.035)
    g.beginPath()
    g.moveTo(x1, y1)
    g.lineTo(x2, y2)
    g.stroke()
    if (y1 < deck - 4) {
      g.beginPath()
      g.moveTo(x1, y1)
      g.lineTo(x1, deck)
      g.stroke()
    }
  }
  g.fillStyle = '#8f98a2'
  g.fillRect(a - span * 0.08, deck, span * 1.16, h * 0.012) // deck
  g.fillStyle = '#c2ad8a'
  for (const px of [a, b - pylonW]) {
    g.fillRect(px, deck - h * 0.085, pylonW, h * 0.085 + (water - deck))
    g.fillRect(px - 3, deck - h * 0.095, pylonW + 6, h * 0.012)
  }
  // lights strung along the arch and the deck, a neon line tracing the top chord
  l.strokeStyle = '#2ef2ff'
  l.shadowColor = '#2ef2ff'
  l.shadowBlur = 10
  l.lineWidth = 2
  l.beginPath()
  for (let t = 0; t <= 1.001; t += 0.02) {
    const [x, y] = arch(t, h * 0.035)
    if (t === 0) l.moveTo(x, y - 2)
    else l.lineTo(x, y - 2)
  }
  l.stroke()
  l.shadowBlur = 0
  l.fillStyle = '#fff1d6'
  for (let t = 0; t <= 1.001; t += 0.025) {
    const [x, y] = arch(t, 0)
    l.fillRect(x - 1.5, y - 1.5, 3, 3)
  }
  for (let x = a - span * 0.08; x < b + span * 0.08; x += 9) {
    l.fillStyle = (x / 9) % 2 < 1 ? '#ffe2a8' : '#ff3a4f'
    l.fillRect(x, deck + 2, 3, 2)
  }

  // --- Opera House ---
  const [o0, o1] = opera.map((f) => f * w)
  const ow = o1 - o0
  const podiumTop = water - h * 0.025
  g.fillStyle = '#b8a688'
  g.fillRect(o0 - ow * 0.04, podiumTop, ow * 1.1, water - podiumTop)
  // sails: [start x, width, height] as fractions of the site, leaning back toward the right
  const SAILS = [
    [0.0, 0.2, 0.085], [0.13, 0.22, 0.11], [0.28, 0.2, 0.09],
    [0.46, 0.2, 0.1], [0.6, 0.22, 0.13], [0.76, 0.2, 0.1],
  ]
  for (const [sx, sw, sh] of SAILS) {
    const x0 = o0 + ow * sx
    const x1 = x0 + ow * sw
    const top = podiumTop - h * sh
    const sail = (ctx) => {
      ctx.beginPath()
      ctx.moveTo(x0, podiumTop)
      ctx.quadraticCurveTo(x0 + (x1 - x0) * 0.15, top + h * 0.01, x1, top)
      ctx.quadraticCurveTo(x1 - (x1 - x0) * 0.05, top + (podiumTop - top) * 0.6, x1 - (x1 - x0) * 0.1, podiumTop)
      ctx.closePath()
    }
    g.fillStyle = '#f4f1ea'
    sail(g)
    g.fill()
    g.strokeStyle = 'rgba(0,0,0,0.25)'
    g.lineWidth = 1
    g.stroke()
    // projections on the sails at night (soft cyan → magenta wash)
    const grad = l.createLinearGradient(x0, top, x1, podiumTop)
    grad.addColorStop(0, 'rgba(46,242,255,0.75)')
    grad.addColorStop(1, 'rgba(255,47,168,0.6)')
    l.fillStyle = grad
    sail(l)
    l.fill()
  }
  return { shape: texture(shapeC), lights: texture(lightC) }
}

// Neon fog rolling low over the harbour (tileable sideways, white alpha; tinted crimson at night)
export function makeNeonFog(seed = 31) {
  const rnd = seeded(seed)
  const W = 1024
  const H = 256
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  for (let i = 0; i < 90; i++) {
    const x = rnd() * W
    const y = H * (0.35 + rnd() * 0.55)
    const r = 40 + rnd() * 120
    for (const dx of [-W, 0, W]) {
      const grad = g.createRadialGradient(x + dx, y, 0, x + dx, y, r)
      grad.addColorStop(0, `rgba(255,255,255,${(0.1 + rnd() * 0.18).toFixed(3)})`)
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = grad
      g.fillRect(x + dx - r, y - r, r * 2, r * 2)
    }
  }
  const fade = g.createLinearGradient(0, 0, 0, H)
  fade.addColorStop(0, 'rgba(0,0,0,1)')
  fade.addColorStop(0.3, 'rgba(0,0,0,0)')
  g.globalCompositeOperation = 'destination-out'
  g.fillStyle = fade
  g.fillRect(0, 0, W, H)
  return texture(c, true)
}

// Vertical haze between the city layers: clear high up, thicker down toward the water
export function makeHaze() {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 256
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, 'rgba(255,255,255,0)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0.18)')
  grad.addColorStop(1, 'rgba(255,255,255,0.85)')
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 256)
  return texture(c)
}

// The harbour: dark water with ripples, and long neon reflections from the city (additive layer).
// The texture's top edge is the waterline.
export function makeWater({ w = 2048, h = 512, seed = 23, reflections = [] } = {}) {
  const rnd = seeded(seed)
  const shapeC = document.createElement('canvas')
  const lightC = document.createElement('canvas')
  shapeC.width = lightC.width = w
  shapeC.height = lightC.height = h
  const g = shapeC.getContext('2d')
  const l = lightC.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#d8e2ee')
  grad.addColorStop(1, '#8090a8')
  g.fillStyle = grad
  g.fillRect(0, 0, w, h)
  g.fillStyle = 'rgba(255,255,255,0.18)'
  for (let i = 0; i < 900; i++) g.fillRect(rnd() * w, rnd() * h, 10 + rnd() * 60, 1)
  // broken vertical streaks under the bright things on the shore, plus scattered city reflections
  const streak = (x, col, width, len, a) => {
    for (let y = 2; y < len; y += 3 + rnd() * 3) {
      l.fillStyle = col
      l.globalAlpha = a * (1 - y / len) * (0.4 + rnd() * 0.6)
      const ww = width * (0.6 + rnd() * 0.8)
      l.fillRect(x - ww / 2 + (rnd() - 0.5) * width * 0.6, y, ww, 2)
    }
  }
  reflections.forEach(([f, col, width, len, a]) => streak(f * w, col, width, len * h, a))
  for (let i = 0; i < 70; i++) streak(rnd() * w, [...NEON, ...WINDOW_LIGHT][Math.floor(rnd() * 10)], 4 + rnd() * 10, h * (0.2 + rnd() * 0.5), 0.5)
  l.globalAlpha = 1
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

// The warm city glow on the horizon at night (sodium streetlights + neon): white, fully opaque at the
// bottom and fading out toward the top. The Window tints it a cool neon blue.
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
