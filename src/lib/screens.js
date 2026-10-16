import { CanvasTexture, SRGBColorSpace } from 'three'

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

// Arcade attract mode, 80s title-screen style: striped sunset, scrolling neon grid, chrome title,
// scores and a blinking INSERT COIN. `color` tints the grid + sun to match the cabinet.
export function createAttractScreen(title, color) {
  const W = 448
  const H = 336
  const { g, texture } = canvas(W, H)
  const HORIZON = H * 0.6
  let t = 0
  let acc = 0

  const draw = () => {
    const sky = g.createLinearGradient(0, 0, 0, HORIZON)
    sky.addColorStop(0, '#07031a')
    sky.addColorStop(0.7, '#2c0b45')
    sky.addColorStop(1, '#7a1d63')
    g.fillStyle = sky
    g.fillRect(0, 0, W, HORIZON)

    // striped sun sinking into the horizon
    const sun = g.createLinearGradient(0, HORIZON - 120, 0, HORIZON)
    sun.addColorStop(0, '#ffe66b')
    sun.addColorStop(1, color)
    g.save()
    g.beginPath()
    g.arc(W / 2, HORIZON, 92, Math.PI, 0)
    g.clip()
    g.fillStyle = sun
    g.fillRect(0, HORIZON - 120, W, 120)
    g.fillStyle = '#2c0b45'
    for (let i = 0; i < 6; i++) g.fillRect(0, HORIZON - 42 + i * 8 - (t * 6) % 8, W, 2 + i * 0.6)
    g.restore()

    // mountains
    g.fillStyle = '#140725'
    g.beginPath()
    g.moveTo(0, HORIZON)
    ;[[0, 0.82], [0.12, 0.7], [0.22, 0.86], [0.34, 0.74], [0.42, 0.9], [0.6, 0.9], [0.7, 0.72], [0.82, 0.84], [0.92, 0.7], [1, 0.8]].forEach(
      ([x, y]) => g.lineTo(x * W, HORIZON * y + HORIZON * 0.1)
    )
    g.lineTo(W, HORIZON)
    g.fill()

    // neon grid floor rushing toward you
    g.fillStyle = '#0a0418'
    g.fillRect(0, HORIZON, W, H - HORIZON)
    g.strokeStyle = color
    g.shadowColor = color
    g.shadowBlur = 6
    g.lineWidth = 1.5
    for (let i = -10; i <= 10; i++) {
      g.beginPath()
      g.moveTo(W / 2 + i * 14, HORIZON)
      g.lineTo(W / 2 + i * 70, H)
      g.stroke()
    }
    for (let i = 0; i < 9; i++) {
      const p = ((i + (t * 0.8) % 1) / 9) ** 2
      const y = HORIZON + p * (H - HORIZON)
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(W, y)
      g.stroke()
    }
    g.shadowBlur = 0

    // chrome title
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = 'italic bold 54px monospace'
    const chrome = g.createLinearGradient(0, 70, 0, 128)
    chrome.addColorStop(0, '#ffffff')
    chrome.addColorStop(0.45, '#9ad8ff')
    chrome.addColorStop(0.5, '#3a2a7a')
    chrome.addColorStop(1, '#ff8ad8')
    g.lineWidth = 6
    g.strokeStyle = '#120420'
    g.strokeText(title.toUpperCase(), W / 2, 100)
    g.shadowColor = color
    g.shadowBlur = 18
    g.fillStyle = chrome
    g.fillText(title.toUpperCase(), W / 2, 100)
    g.shadowBlur = 0

    g.font = 'bold 14px monospace'
    g.fillStyle = '#ff5a5a'
    g.textAlign = 'left'
    g.fillText('1UP   00', 14, 18)
    g.textAlign = 'right'
    g.fillText('HI 50000', W - 14, 18)
    g.textAlign = 'center'
    if (t % 1.2 < 0.75) {
      g.font = 'bold 22px monospace'
      g.fillStyle = '#ffd86b'
      g.shadowColor = '#ffd86b'
      g.shadowBlur = 8
      g.fillText('INSERT COIN', W / 2, H - 46)
      g.shadowBlur = 0
    }
    g.font = '12px monospace'
    g.fillStyle = '#c9b8ff'
    g.fillText('© 2026 SJ', W / 2, H - 18)
    glass(g, W, H)
    texture.needsUpdate = true
  }

  const tick = (dt) => {
    t += dt
    acc += dt
    if (acc > 1 / 20) {
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
