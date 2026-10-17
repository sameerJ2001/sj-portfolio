import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three'

// Animated canvas textures for screens while nobody is using them.
// Each returns { texture, tick(dt) } — call tick from useFrame; it only redraws when something changed.

// Glass effects shared by every screen: scanlines + a soft dark vignette.
function glass(g, w, h) {
  g.fillStyle = 'rgba(0,0,0,0.28)'
  for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1)
  const v = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.85)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(0,0,0,0.55)')
  g.fillStyle = v
  g.fillRect(0, 0, w, h)
}

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const texture = new CanvasTexture(c)
  texture.colorSpace = SRGBColorSpace
  return { c, g: c.getContext('2d'), texture }
}

// What SJ is "typing" on the CRT. Lines starting with "$ " are typed out; the rest print instantly.
const SESSION = [
  '$ ssh sj@loft',
  'welcome back, sj.',
  '$ cd ~/projects/offline-ai',
  '$ python train.py --epochs 40',
  'epoch 01/40  loss 2.913',
  'epoch 02/40  loss 2.207',
  'epoch 03/40  loss 1.861',
  '$ nmap -sV 10.0.0.0/24',
  '22/tcp   open  ssh',
  '80/tcp   open  http',
  '$ ./exploit --target ctf.local',
  '[+] got shell. flag{h4ck_th3_l0ft}',
  '$ git commit -m "it works, dont touch"',
  '[main 4f2a9c1] it works, dont touch',
  '$ npm run build',
  'built in 812ms',
]

export function createTerminalScreen() {
  const W = 512
  const H = 384
  const { g, texture } = canvas(W, H)
  const LINE = 25
  const ROWS = Math.floor((H - 30) / LINE)
  const done = []
  let line = 0
  let chars = 0
  let wait = 0.6
  let acc = 0
  let blink = 0
  let dirty = true

  const draw = () => {
    g.fillStyle = '#03130a'
    g.fillRect(0, 0, W, H)
    g.font = 'bold 19px monospace'
    g.textBaseline = 'top'
    g.shadowColor = '#3dff9a'
    g.shadowBlur = 8
    g.fillStyle = '#7dffaa'
    const current = SESSION[line].startsWith('$ ') ? SESSION[line].slice(0, chars) : ''
    const rows = [...done, current].slice(-ROWS)
    rows.forEach((t, i) => g.fillText(t, 18, 16 + i * LINE))
    if (blink < 0.5) {
      const last = rows[rows.length - 1]
      g.fillRect(18 + g.measureText(last).width + 2, 16 + (rows.length - 1) * LINE, 11, 19)
    }
    g.shadowBlur = 0
    glass(g, W, H)
    texture.needsUpdate = true
  }

  const tick = (dt) => {
    const wasOn = blink < 0.5
    blink = (blink + dt) % 1
    if (wasOn !== blink < 0.5) dirty = true
    acc += dt
    if (wait > 0) wait -= dt
    else if (acc > 0.045) {
      acc = 0
      const text = SESSION[line]
      if (text.startsWith('$ ') && chars < text.length) chars += 1
      else {
        done.push(text)
        line = (line + 1) % SESSION.length
        chars = 2
        wait = SESSION[line].startsWith('$ ') ? 0.7 : 0.15
      }
      dirty = true
    }
    if (dirty) {
      draw()
      dirty = false
    }
  }

  draw()
  return { texture, tick }
}

// Arcade attract mode for the voxel cabinets: a pale, glowing, low-res pixel screen like the
// reference (every texel reads as a chunky pixel): dithered sparkle noise, pink pixel scribbles,
// the game's title, a rolling scan band and a blinking INSERT COIN. `color` tints the bottom.
export function createAttractScreen(title, color) {
  const W = 96
  const H = 72
  const { g, texture } = canvas(W, H)
  texture.magFilter = texture.minFilter = NearestFilter
  texture.generateMipmaps = false
  const PIX = ['#ffffff', '#f6b3dc', '#9fe9ff', '#d9a5ff', '#ffd9ef']
  let seed = 7
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  let scribbles = []
  let t = 0
  let acc = 0
  let reshuffle = 0

  const newScribbles = () => {
    scribbles = Array.from({ length: 5 }, () => {
      const pts = [[4 + rnd() * (W - 8), 4 + rnd() * (H - 8)]]
      for (let i = 0; i < 6; i++) {
        const [x, y] = pts[pts.length - 1]
        const horiz = i % 2 === 0
        pts.push(horiz ? [Math.min(W - 3, Math.max(2, x + (rnd() - 0.5) * 30)), y] : [x, Math.min(H - 3, Math.max(2, y + (rnd() - 0.5) * 22))])
      }
      return { pts, c: rnd() < 0.6 ? '#f08ac4' : '#c58cf0' }
    })
  }
  newScribbles()

  const draw = () => {
    const bg = g.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#f4fdff')
    bg.addColorStop(0.55, '#d9f7ff')
    bg.addColorStop(1, color)
    g.fillStyle = bg
    g.fillRect(0, 0, W, H)
    // dithered sparkle noise
    for (let i = 0; i < 320; i++) {
      g.fillStyle = PIX[Math.floor(rnd() * PIX.length)]
      g.globalAlpha = 0.35 + rnd() * 0.5
      g.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * H), 1, 1)
    }
    g.globalAlpha = 1
    // blocky pink scribbles (stepped lines), re-drawn every couple of seconds
    for (const { pts, c } of scribbles) {
      g.fillStyle = c
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1]
        const [x1, y1] = pts[i]
        g.fillRect(Math.round(Math.min(x0, x1)), Math.round(Math.min(y0, y1)), Math.round(Math.abs(x1 - x0)) + 1, Math.round(Math.abs(y1 - y0)) + 1)
      }
    }
    // title, with a 1px drop shadow, bobbing a pixel
    const text = title.toUpperCase()
    let size = 15
    g.font = `bold ${size}px monospace`
    while (g.measureText(text).width > W - 10 && size > 8) g.font = `bold ${--size}px monospace`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    const ty = Math.round(H * 0.42 + (Math.floor(t * 2) % 2))
    g.fillStyle = '#7a2a68'
    g.fillText(text, W / 2 + 1, ty + 1)
    g.fillStyle = '#ff5fae'
    g.fillText(text, W / 2, ty)
    if (Math.floor(t * 1.6) % 2) {
      g.font = 'bold 7px monospace'
      g.fillStyle = '#5b2a7a'
      g.fillText('INSERT COIN', W / 2, Math.round(H * 0.74))
    }
    // rolling scan band
    g.fillStyle = 'rgba(255,255,255,0.45)'
    g.fillRect(0, Math.floor((t * 18) % H), W, 2)
    texture.needsUpdate = true
  }

  const tick = (dt) => {
    t += dt
    acc += dt
    reshuffle += dt
    if (reshuffle > 2.2) {
      reshuffle = 0
      newScribbles()
    }
    if (acc < 1 / 10) return
    acc = 0
    draw()
  }

  draw()
  return { texture, tick }
}

// Green-phosphor "graphics" screen for the second terminal on the floor: a scrolling waveform,
// a bar graph that keeps re-measuring, a rotating radar sweep and a few status lines.
export function createGraphScreen() {
  const W = 384
  const H = 288
  const { g, texture } = canvas(W, H)
  const bars = Array.from({ length: 9 }, () => Math.random())
  let t = 0
  let acc = 0

  const draw = () => {
    g.fillStyle = '#03130a'
    g.fillRect(0, 0, W, H)
    g.shadowColor = '#3dff9a'
    g.shadowBlur = 6
    g.strokeStyle = g.fillStyle = '#7dffaa'
    g.lineWidth = 2
    g.font = 'bold 15px monospace'
    g.textBaseline = 'top'
    g.fillText('SIGNAL  CH-2', 14, 10)
    g.fillText(`${(4.2 + Math.sin(t) * 0.6).toFixed(2)} kHz`, W - 112, 10)

    // waveform box
    g.strokeRect(14, 34, W - 28, 96)
    g.beginPath()
    for (let x = 0; x <= W - 32; x += 3) {
      const y = 82 + Math.sin(x * 0.07 + t * 5) * 22 * Math.sin(x * 0.013 + t) + Math.sin(x * 0.31 + t * 9) * 5
      x ? g.lineTo(16 + x, y) : g.moveTo(16 + x, y)
    }
    g.stroke()

    // bar graph
    bars.forEach((v, i) => {
      const h = 10 + v * 90
      g.fillRect(18 + i * 22, 250 - h, 14, h)
    })
    g.fillRect(14, 252, 206, 2)

    // radar sweep
    const cx = 300
    const cy = 196
    g.beginPath()
    g.arc(cx, cy, 52, 0, Math.PI * 2)
    g.stroke()
    g.beginPath()
    g.arc(cx, cy, 26, 0, Math.PI * 2)
    g.stroke()
    g.beginPath()
    g.moveTo(cx, cy)
    g.lineTo(cx + Math.cos(t * 2) * 52, cy + Math.sin(t * 2) * 52)
    g.stroke()
    g.fillRect(cx + 18, cy - 30, 5, 5)
    g.fillRect(cx - 34, cy + 12, 5, 5)
    g.shadowBlur = 0
    glass(g, W, H)
    texture.needsUpdate = true
  }

  const tick = (dt) => {
    t += dt
    acc += dt
    bars.forEach((v, i) => (bars[i] = Math.min(1, Math.max(0, v + (Math.random() - 0.5) * dt * 3))))
    if (acc > 1 / 15) {
      acc = 0
      draw()
    }
  }

  draw()
  return { texture, tick }
}

// The little screen on top of the CRT: a static green-phosphor system monitor.
export function makeStatusScreenTexture() {
  const W = 256
  const H = 192
  const { g, texture } = canvas(W, H)
  const bg = g.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#062414')
  bg.addColorStop(1, '#03130a')
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  g.shadowColor = '#3dff9a'
  g.shadowBlur = 6
  g.fillStyle = '#7dffaa'
  g.font = 'bold 20px monospace'
  g.textBaseline = 'top'
  g.fillText('SYS  OK', 18, 16)
  ;[0.62, 0.38, 0.81].forEach((v, i) => {
    g.fillStyle = 'rgba(125,255,170,0.18)'
    g.fillRect(18, 62 + i * 36, W - 36, 16)
    g.fillStyle = '#7dffaa'
    g.fillRect(18, 62 + i * 36, (W - 36) * v, 16)
  })
  glass(g, W, H)
  return texture
}
