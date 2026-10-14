import { CanvasTexture, SRGBColorSpace, RepeatWrapping } from 'three'

// Industrial cyberpunk palette (dark concrete, grey-teal metal, neon) — tweak these to restyle the
// whole loft at once.
export const C = {
  gold: '#e8b923',
  goldDeep: '#b8860b',
  wall: '#4a4f52',
  wallPanel: '#2b2740',
  floor: '#4b4744',
  deck: '#3a393d',
  metal: '#56605f',
  metalDark: '#2e3335',
  pipe: '#5f8f93', // teal pipework on the desk deck
  olive: '#a0923f', // stair stringers + bed railing
  wood: '#6b4a3a',
  woodDark: '#3e2a22',
  black: '#121018',
  ivory: '#e9e4d8',
  // neon
  pink: '#ff3ea5',
  cyan: '#2ef2ff',
  purple: '#9b5cff',
  green: '#3dff9a',
  amber: '#ffb347',
  // fabric
  teal: '#2bb39a',
  coral: '#e8664a',
  navy: '#1f2a4a',
  hoodie: '#d9772b',
  white: '#e6e6ee',
}

// Procedural textures so there are no image files yet.
// Replace with your own painted/pixel textures later (/public/textures).

// Speckled concrete with faint large tiles (ground floor). White-ish so `color` tints it.
export function makeFloorTexture() {
  const c = speckle(256, 0.55)
  const g = c.getContext('2d')
  g.fillStyle = 'rgba(0,0,0,0.22)'
  for (let i = 0; i <= 2; i++) {
    g.fillRect(0, i * 128, 256, 2)
    g.fillRect(i * 128, 0, 2, 256)
  }
  return repeatTexture(c, 3, 3)
}

// Plain speckled concrete/asphalt for the upper decks (like the reference).
export function makeDeckTexture() {
  return repeatTexture(speckle(256, 0.7), 3, 3)
}

// Concrete for the bathroom walls etc.
export function makeConcreteTexture() {
  return repeatTexture(speckle(256, 0.45), 2, 2)
}

function speckle(size, amount) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  g.fillStyle = '#d4d4d4'
  g.fillRect(0, 0, size, size)
  let s = 7
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  for (let i = 0; i < size * size * 0.06 * amount; i++) {
    const v = rnd()
    g.fillStyle = v < 0.5 ? `rgba(0,0,0,${0.15 + rnd() * 0.35})` : `rgba(255,255,255,${0.1 + rnd() * 0.25})`
    g.fillRect(Math.floor(rnd() * size), Math.floor(rnd() * size), 1 + Math.floor(rnd() * 2), 1 + Math.floor(rnd() * 2))
  }
  return c
}

function repeatTexture(c, rx, ry) {
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(rx, ry)
  t.colorSpace = SRGBColorSpace
  return t
}

// Riveted metal wall panels with a little grime.
export function makeWallTexture() {
  const c = speckle(128, 0.25)
  const g = c.getContext('2d')
  g.fillStyle = 'rgba(0,0,0,0.3)'
  for (let i = 0; i < 2; i++) g.fillRect(i * 64, 0, 2, 128)
  g.fillRect(0, 0, 128, 2)
  g.fillRect(0, 64, 128, 2)
  g.fillStyle = 'rgba(255,255,255,0.12)'
  for (let i = 0; i < 2; i++) g.fillRect(i * 64 + 2, 0, 1, 128)
  // rivets near each panel corner
  for (const x of [6, 58, 70, 122])
    for (const y of [6, 58, 70, 122]) {
      g.fillStyle = 'rgba(0,0,0,0.35)'
      g.fillRect(x, y, 3, 3)
      g.fillStyle = 'rgba(255,255,255,0.25)'
      g.fillRect(x, y, 1, 1)
    }
  // grime streaks
  const grad = g.createLinearGradient(0, 100, 0, 128)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.18)')
  g.fillStyle = grad
  g.fillRect(0, 100, 128, 28)
  return repeatTexture(c, 4, 3)
}

// Old red brick (used behind the kitchen under the desk deck). Coloured, not tinted.
export function makeBrickTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  g.fillStyle = '#2a1d1a'
  g.fillRect(0, 0, 128, 128)
  let s = 3
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  for (let row = 0; row < 8; row++)
    for (let col = -1; col < 4; col++) {
      const x = col * 32 + (row % 2) * 16 + 1
      const v = 60 + rnd() * 40
      g.fillStyle = `rgb(${v + 30}, ${v * 0.55}, ${v * 0.45})`
      g.fillRect(x, row * 16 + 1, 30, 14)
    }
  return repeatTexture(c, 3, 2)
}

// A row of dark holes, for the perforated stair stringer.
export function makeDotsTexture() {
  const c = document.createElement('canvas')
  c.width = 32
  c.height = 16
  const g = c.getContext('2d')
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, 32, 16)
  g.fillStyle = '#1a1a14'
  g.fillRect(12, 5, 7, 6)
  return repeatTexture(c, 1, 1)
}

// The framed neon sign under the desk deck: "SJ" in katakana (エス / ジェイ), stacked inside a
// rounded neon frame like the reference. Redraws once the Japanese font has loaded.
const JP_FONT = '"Noto Sans JP", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif'
export function makeNeonSignTexture(lines, color) {
  const W = 256
  const H = 320
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  const draw = () => {
    g.clearRect(0, 0, W, H)
    g.lineJoin = 'round'
    const tube = (fn) => {
      g.shadowColor = color
      for (const blur of [34, 16, 6]) {
        g.shadowBlur = blur
        g.strokeStyle = g.fillStyle = color
        fn()
      }
      g.shadowBlur = 0
      g.strokeStyle = g.fillStyle = '#ffe6f4'
      g.globalAlpha = 0.85
      fn(true)
      g.globalAlpha = 1
    }
    // rounded frame
    tube((core) => {
      g.lineWidth = core ? 4 : 10
      g.beginPath()
      g.roundRect(22, 22, W - 44, H - 44, 30)
      g.stroke()
    })
    // text
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = `700 64px ${JP_FONT}`
    tube(() =>
      lines.forEach((line, i) => g.fillText(line, W / 2, H / 2 + (i - (lines.length - 1) / 2) * 88))
    )
    t.needsUpdate = true
  }
  draw()
  document.fonts?.load(`700 64px "Noto Sans JP"`, lines.join('')).then(draw, () => {})
  return t
}

// Glowing neon text/icon on a transparent canvas.
export function makeNeonTexture(text, color, { w = 512, h = 256, font = 'bold 150px monospace' } = {}) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  g.font = font
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.shadowColor = color
  for (const blur of [40, 20, 8]) {
    g.shadowBlur = blur
    g.fillStyle = color
    g.fillText(text, w / 2, h / 2)
  }
  g.shadowBlur = 0
  g.fillStyle = '#ffffff'
  g.globalAlpha = 0.85
  g.fillText(text, w / 2, h / 2)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

// Placeholder paintings in a few styles (pick with `style`, vary with `seed`):
// 'sunset' sea, 'abstract' colour blocks + strokes, 'mountains' at dusk. Swap for photos of your work.
export function makePaintingTexture(seed = 1, style = 'sunset', w = 256, h = 320) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  let s = seed
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)

  if (style === 'abstract') {
    g.fillStyle = '#efe6d6'
    g.fillRect(0, 0, w, h)
    const cols = ['#e8664a', '#2bb39a', '#e8b923', '#3d6fd8', '#ff3ea5', '#1d1a2b']
    for (let i = 0; i < 7; i++) {
      g.globalAlpha = 0.85
      g.fillStyle = cols[Math.floor(rnd() * cols.length)]
      g.fillRect(rnd() * w * 0.8, rnd() * h * 0.8, w * (0.15 + rnd() * 0.4), h * (0.1 + rnd() * 0.35))
    }
    g.globalAlpha = 1
    g.lineCap = 'round'
    for (let i = 0; i < 5; i++) {
      g.strokeStyle = cols[Math.floor(rnd() * cols.length)]
      g.lineWidth = 6 + rnd() * 14
      g.beginPath()
      g.moveTo(rnd() * w, rnd() * h)
      g.bezierCurveTo(rnd() * w, rnd() * h, rnd() * w, rnd() * h, rnd() * w, rnd() * h)
      g.stroke()
    }
  } else if (style === 'mountains') {
    const sky = g.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#2b2a5e')
    sky.addColorStop(0.6, '#c9667a')
    sky.addColorStop(1, '#f2b880')
    g.fillStyle = sky
    g.fillRect(0, 0, w, h)
    ;['#4a3a6e', '#2e2550', '#1a1533'].forEach((col, layer) => {
      g.fillStyle = col
      g.beginPath()
      g.moveTo(0, h)
      for (let x = 0; x <= w; x += w / 6) g.lineTo(x, h * (0.45 + layer * 0.12) + (rnd() - 0.5) * h * 0.2)
      g.lineTo(w, h)
      g.fill()
    })
    g.fillStyle = '#ffe9a8'
    g.beginPath()
    g.arc(w * (0.3 + rnd() * 0.4), h * 0.3, w * 0.07, 0, Math.PI * 2)
    g.fill()
  } else {
    const grad = g.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#ffb38a')
    grad.addColorStop(0.55, '#f57a7a')
    grad.addColorStop(1, '#3b4a8c')
    g.fillStyle = grad
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#ffe9a8'
    g.beginPath()
    g.arc(w / 2, h * 0.53, w * 0.2, 0, Math.PI * 2)
    g.fill()
    for (let i = 0; i < 9; i++) {
      g.strokeStyle = `rgba(255,255,255,${0.25 + rnd() * 0.5})`
      g.lineWidth = 3 + rnd() * 5
      g.beginPath()
      const y = h * 0.62 + i * (h * 0.04)
      g.moveTo(0, y)
      for (let x = 0; x <= w; x += 32) g.quadraticCurveTo(x + 16, y - 8 + rnd() * 8, x + 32, y)
      g.stroke()
    }
  }
  // a little brush texture over everything
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},0.05)`
    g.fillRect(rnd() * w, rnd() * h, 6 + rnd() * 10, 2)
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

// Paint splashes (transparent): blobs with droplets around them and the odd drip.
// For the floor, drop cloth and wall of the art corner.
export const PAINT = ['#e8664a', '#2bb39a', '#e8b923', '#3d6fd8', '#ff3ea5', '#9b5cff', '#f2f2f2']
export function makeSplatterTexture(seed = 1, count = 9, drips = false) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  let s = seed
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  for (let i = 0; i < count; i++) {
    const x = 20 + rnd() * 216
    const y = 20 + rnd() * 216
    const r = 6 + rnd() * 18
    g.fillStyle = PAINT[Math.floor(rnd() * PAINT.length)]
    g.globalAlpha = 0.9
    g.beginPath()
    for (let k = 0; k <= 12; k++) {
      const a = (k / 12) * Math.PI * 2
      const rr = r * (0.7 + rnd() * 0.5)
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
    }
    g.fill()
    for (let k = 0; k < 8; k++) {
      const a = rnd() * Math.PI * 2
      const d = r * (1.2 + rnd() * 1.8)
      g.beginPath()
      g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1 + rnd() * 3, 0, Math.PI * 2)
      g.fill()
    }
    if (drips && rnd() < 0.6) g.fillRect(x - 2, y, 4, 20 + rnd() * 50)
  }
  g.globalAlpha = 1
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

export function makePhotoTexture(hueA, hueB) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 128, 128)
  grad.addColorStop(0, `hsl(${hueA} 60% 60%)`)
  grad.addColorStop(1, `hsl(${hueB} 50% 30%)`)
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  g.fillStyle = 'rgba(0,0,0,0.35)'
  for (let i = 0; i < 5; i++) g.fillRect(10 + i * 24, 60 + ((i * 37) % 30), 16, 68)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}
