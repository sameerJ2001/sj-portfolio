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

// 3×5 pixel font for the arcade screens (crisp at any scale): 5 rows of 3 bits per glyph
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
  9: '111101111001110', '-': '000000111000000', '.': '000000000000010', ':': '000010000010000', '!': '010010010000010',
  '©': '111101101101111',
}
export function pixelText(g, text, x, y, scale, color, align = 'left') {
  const w = text.length * 4 * scale - scale
  let cx = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x)
  g.fillStyle = color
  for (const ch of text.toUpperCase()) {
    const bits = FONT[ch]
    if (bits)
      for (let i = 0; i < 15; i++) if (bits[i] === '1') g.fillRect(cx + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale)
    cx += 4 * scale
  }
}

// Arcade attract mode, like a real cabinet waiting for a coin: a title screen (big pixel title,
// blinking INSERT COIN, scrolling grid in the cabinet's colour) alternating with the game playing
// itself — Breakout or Snake, by the game's title — with a score bar, scanlines and a CRT vignette.
// Low-res and nearest-filtered so every pixel reads as a chunky glowing dot.
export function createAttractScreen(title, color) {
  const W = 160
  const H = 120
  const { g, texture } = canvas(W, H)
  texture.magFilter = texture.minFilter = NearestFilter
  texture.generateMipmaps = false
  const demo = /snake/i.test(title) ? snakeDemo(W, H) : breakoutDemo(W, H)
  const TITLE = 5
  const DEMO = 13
  let t = 0
  let acc = 0
  let hi = 9990

  const crt = () => {
    g.fillStyle = 'rgba(0,0,0,0.28)'
    for (let y = 1; y < H; y += 2) g.fillRect(0, y, W, 1)
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.72)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, 'rgba(0,0,0,0.6)')
    g.fillStyle = v
    g.fillRect(0, 0, W, H)
  }

  const titleScreen = (tt) => {
    g.fillStyle = '#05061a'
    g.fillRect(0, 0, W, H)
    // perspective grid rolling toward you, in the cabinet colour
    g.fillStyle = color
    g.globalAlpha = 0.5
    for (let i = 0; i < 7; i++) {
      const p = ((i + (tt * 0.9) % 1) / 7) ** 2
      g.fillRect(0, Math.round(70 + p * 50), W, 1)
    }
    for (let i = -8; i <= 8; i++) {
      for (let y = 70; y < H; y += 2) g.fillRect(Math.round(W / 2 + i * (6 + (y - 70) * 0.9)), y, 1, 1)
    }
    g.globalAlpha = 1
    const big = title.length > 8 ? 2 : 3
    pixelText(g, title, W / 2 + 1, 26 + 1, big, color, 'center')
    pixelText(g, title, W / 2, 26, big, '#ffffff', 'center')
    if (Math.floor(tt * 2) % 2 === 0) pixelText(g, 'INSERT COIN', W / 2, 56, 1, '#ffe14d', 'center')
    pixelText(g, `HI ${String(hi).padStart(5, '0')}`, W / 2, 4, 1, '#ff6fb5', 'center')
    pixelText(g, '© 2026 SJ INC', W / 2, H - 9, 1, '#9aa7ff', 'center')
  }

  const draw = () => {
    const cycle = t % (TITLE + DEMO)
    if (cycle < TITLE) titleScreen(cycle)
    else {
      g.fillStyle = '#04050f'
      g.fillRect(0, 0, W, H)
      demo.draw(g, color)
      hi = Math.max(hi, demo.score)
      pixelText(g, String(demo.score).padStart(5, '0'), 4, 3, 1, '#ffffff')
      pixelText(g, `HI ${String(hi).padStart(5, '0')}`, W - 4, 3, 1, '#ff6fb5', 'right')
      if (Math.floor(t * 1.5) % 2) pixelText(g, 'DEMO', W / 2, 3, 1, '#ffe14d', 'center')
    }
    crt()
    texture.needsUpdate = true
  }

  const tick = (dt) => {
    t += dt
    const cycle = t % (TITLE + DEMO)
    if (cycle >= TITLE) demo.step(Math.min(dt, 0.05))
    acc += dt
    if (acc < 1 / 30) return
    acc = 0
    draw()
  }

  draw()
  return { texture, tick }
}

// Breakout playing itself: the paddle chases the ball; the wall rebuilds once it's cleared
function breakoutDemo(W, H) {
  const COLS = 8
  const ROWS = 5
  const BW = 18
  const BH = 5
  const X0 = (W - COLS * (BW + 1)) / 2
  const Y0 = 16
  const ROW_COLOURS = ['#ff4fa3', '#ff9a3c', '#ffe14d', '#56f28a', '#4fe6ff']
  let bricks
  const s = { score: 0, ball: { x: 80, y: 80, vx: 62, vy: -70 }, pad: 68 }
  const reset = () => (bricks = Array.from({ length: ROWS }, () => Array(COLS).fill(true)))
  reset()
  return {
    get score() {
      return s.score
    },
    step(dt) {
      const b = s.ball
      b.x += b.vx * dt
      b.y += b.vy * dt
      if (b.x < 1 || b.x > W - 4) b.vx = -b.vx
      if (b.y < 12) b.vy = Math.abs(b.vy)
      // paddle AI with a little lag, so it occasionally only just makes it
      s.pad += Math.max(-90 * dt, Math.min(90 * dt, b.x - 12 - s.pad))
      s.pad = Math.max(0, Math.min(W - 24, s.pad))
      if (b.vy > 0 && b.y > 104 && b.y < 110 && b.x > s.pad - 2 && b.x < s.pad + 25) {
        b.vy = -Math.abs(b.vy)
        b.vx = ((b.x - (s.pad + 12)) / 12) * 80
      }
      if (b.y > H) Object.assign(b, { x: s.pad + 12, y: 100, vy: -70 })
      const c = Math.floor((b.x + 1 - X0) / (BW + 1))
      const r = Math.floor((b.y + 1 - Y0) / (BH + 1))
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && bricks[r][c]) {
        bricks[r][c] = false
        b.vy = -b.vy
        s.score += (ROWS - r) * 10
        if (bricks.every((row) => row.every((v) => !v))) reset()
      }
    },
    draw(g) {
      bricks.forEach((row, r) =>
        row.forEach((on, c) => {
          if (!on) return
          g.fillStyle = ROW_COLOURS[r]
          g.fillRect(X0 + c * (BW + 1), Y0 + r * (BH + 1), BW, BH)
        }),
      )
      g.fillStyle = '#ffffff'
      g.fillRect(Math.round(s.pad), 107, 24, 3)
      g.fillRect(Math.round(s.ball.x), Math.round(s.ball.y), 3, 3)
    },
  }
}

// Snake playing itself: heads for the food, avoids its own tail, starts over when it's boxed in
function snakeDemo(W, H) {
  const CELL = 6
  const GW = Math.floor((W - 4) / CELL)
  const GH = Math.floor((H - 16) / CELL)
  const OX = (W - GW * CELL) / 2
  const OY = 13
  const s = { score: 0 }
  let snake
  let food
  let acc = 0
  const place = () => {
    do food = [Math.floor(Math.random() * GW), Math.floor(Math.random() * GH)]
    while (snake.some(([x, y]) => x === food[0] && y === food[1]))
  }
  const reset = () => {
    snake = [[8, 8], [7, 8], [6, 8], [5, 8]]
    s.score = 0
    place()
  }
  reset()
  const free = ([x, y]) => x >= 0 && y >= 0 && x < GW && y < GH && !snake.some(([a, b]) => a === x && b === y)
  return {
    get score() {
      return s.score
    },
    step(dt) {
      acc += dt
      if (acc < 0.085) return
      acc = 0
      const [hx, hy] = snake[0]
      const options = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .map(([dx, dy]) => [hx + dx, hy + dy])
        .filter(free)
        .sort((a, b) => Math.abs(a[0] - food[0]) + Math.abs(a[1] - food[1]) - (Math.abs(b[0] - food[0]) + Math.abs(b[1] - food[1])))
      if (!options.length || snake.length > 60) return reset()
      const next = options[Math.random() < 0.08 && options[1] ? 1 : 0]
      snake.unshift(next)
      if (next[0] === food[0] && next[1] === food[1]) {
        s.score += 10
        place()
      } else snake.pop()
    },
    draw(g, color) {
      g.fillStyle = color
      g.globalAlpha = 0.35
      g.fillRect(OX - 1, OY - 1, GW * CELL + 2, 1)
      g.fillRect(OX - 1, OY + GH * CELL, GW * CELL + 2, 1)
      g.fillRect(OX - 1, OY - 1, 1, GH * CELL + 2)
      g.fillRect(OX + GW * CELL, OY - 1, 1, GH * CELL + 2)
      g.globalAlpha = 1
      snake.forEach(([x, y], i) => {
        g.fillStyle = i === 0 ? '#d9ffe6' : i % 2 ? '#3dff8a' : '#2fd874'
        g.fillRect(OX + x * CELL, OY + y * CELL, CELL - 1, CELL - 1)
      })
      g.fillStyle = Math.floor(Date.now() / 200) % 2 ? '#ff4f6d' : '#ff9aac'
      g.fillRect(OX + food[0] * CELL + 1, OY + food[1] * CELL + 1, CELL - 3, CELL - 3)
    },
  }
}

// ---------- outside: the MOON LIGHT billboard and flickering neon signs ----------

// The MOON LIGHT billboard: a tall pixel screen with a pin-up silhouette and the name in white, cycling
// red figure on dark → dark figure on striped red → dimmed, each change a pixel dissolve, with
// scanlines, a scan bar rolling down, glitch slices jumping sideways and sparkling pixels.
const BB_W = 64
const BB_H = 128
// Rasterise a drawing into an on/off pixel mask. `ss` supersamples (drawn ss× larger, a pixel is on
// when it's mostly covered) so curves come out clean; `unit` scales the drawing's coordinates.
function maskFrom(draw, { ss = 1, unit = 1 } = {}) {
  const c = document.createElement('canvas')
  c.width = BB_W * ss
  c.height = BB_H * ss
  const g = c.getContext('2d')
  g.scale(ss * unit, ss * unit)
  g.fillStyle = g.strokeStyle = '#fff'
  draw(g)
  const a = g.getImageData(0, 0, c.width, c.height).data
  const m = new Uint8Array(BB_W * BB_H)
  for (let y = 0; y < BB_H; y++)
    for (let x = 0; x < BB_W; x++) {
      let cover = 0
      for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) cover += a[((y * ss + j) * c.width + x * ss + i) * 4 + 3]
      m[y * BB_W + x] = cover / (ss * ss) > 115 ? 1 : 0
    }
  return m
}
// Pin-up silhouette, like the reference billboard (drawn on a 48 × 96 grid, scaled to fit): head in
// profile, both arms raised behind the head, long hair falling down one side, an hourglass figure,
// long legs with the weight on one and the other knee bent in, in high heels.
function figureMask() {
  return maskFrom(
    (g) => {
      const limb = (pts, w) => {
        g.lineWidth = w
        g.lineCap = g.lineJoin = 'round'
        g.beginPath()
        pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
        g.stroke()
      }
      // fill the board like the reference: widened a touch and centred
      g.translate(24, 0)
      g.scale(1.18, 1.03)
      g.translate(-25.5, -1)
      // arms raised: elbows out wide, hands meeting behind the head
      limb([[19.6, 21.5], [12.2, 7]], 3.4)
      limb([[12.2, 7], [22.5, 3.2]], 2.6)
      limb([[30.6, 21.5], [36.8, 9.5]], 3.2)
      limb([[36.8, 9.5], [29, 5]], 2.5)
      // long hair falling down the right side, over the shoulder
      g.beginPath()
      g.moveTo(22.6, 5.2)
      g.bezierCurveTo(23.2, 1.8, 28.6, 1.4, 30.4, 4.4)
      g.bezierCurveTo(32.4, 7.6, 33, 11.5, 34.6, 15.5)
      g.bezierCurveTo(36.2, 19.5, 36.8, 24.5, 34.2, 28.6)
      g.bezierCurveTo(33.2, 25.4, 32, 22.6, 30.4, 20.4)
      g.bezierCurveTo(29.4, 17.6, 28.8, 14.6, 27.4, 12.4)
      g.closePath()
      g.fill()
      // head in profile, facing left: skull, nose and chin
      g.beginPath()
      g.ellipse(25.6, 8.4, 3.7, 4.7, -0.15, 0, Math.PI * 2)
      g.fill()
      g.beginPath()
      g.moveTo(22.4, 6.8)
      g.lineTo(21.2, 9.4)
      g.lineTo(22.2, 10)
      g.lineTo(22, 11.4)
      g.lineTo(23.6, 12.8)
      g.closePath()
      g.fill()
      g.fillRect(23.6, 12, 3.6, 9) // neck
      // body: shoulders, bust, a narrow waist, full hips, then both legs down to the ankles
      g.beginPath()
      g.moveTo(18.6, 20)
      g.bezierCurveTo(18, 23, 17.8, 26, 19, 29)
      g.bezierCurveTo(20, 31.2, 21.4, 34, 21.3, 37.6)
      g.bezierCurveTo(21.2, 41.2, 17, 44, 17.2, 49.6)
      g.bezierCurveTo(17.4, 56, 18.3, 61, 18.1, 66)
      g.bezierCurveTo(17.9, 70, 16.9, 74, 18.7, 80)
      g.lineTo(19.5, 84.6)
      g.lineTo(21.3, 84.6)
      g.bezierCurveTo(21.6, 79, 22.6, 74, 21.9, 67)
      g.bezierCurveTo(21.7, 62, 24.2, 58, 25.4, 55.4)
      g.bezierCurveTo(26.4, 58, 27.3, 61, 27.5, 65)
      g.bezierCurveTo(27.7, 70, 30.4, 76, 31.3, 84.6)
      g.lineTo(33.1, 84.6)
      g.bezierCurveTo(33.5, 77, 32.7, 70, 31.9, 65.5)
      g.bezierCurveTo(32.3, 60, 34.8, 55, 34.4, 49.6)
      g.bezierCurveTo(34, 45, 28.7, 41.2, 28.7, 37.6)
      g.bezierCurveTo(28.7, 34, 31.2, 31.6, 32.9, 28.2)
      g.bezierCurveTo(33.5, 25.6, 32.3, 22.2, 31.3, 20)
      g.closePath()
      g.fill()
      // high heels: pointed feet and thin stiletto heels
      limb([[20.4, 84], [21.7, 88.4], [22.9, 92.2]], 1.9)
      limb([[19.7, 85.6], [19.2, 91.6]], 1.25)
      limb([[32.2, 84], [33.9, 88], [35.8, 91.4]], 1.9)
      limb([[31.5, 85.6], [31.9, 91]], 1.25)
    },
    { ss: 4, unit: BB_W / 48 },
  )
}
export function createMoonlightBillboard() {
  const { g, texture } = canvas(BB_W, BB_H)
  texture.magFilter = texture.minFilter = NearestFilter
  texture.generateMipmaps = false
  const fig = figureMask()
  const words = maskFrom((g2) => {
    // across the chest and waist, like the reference
    pixelText(g2, 'MOON', BB_W / 2 + 3, 39, 2, '#fff', 'center')
    pixelText(g2, 'LIGHT', BB_W / 2 + 1, 53, 2, '#fff', 'center')
  })
  const order = Float32Array.from({ length: BB_W * BB_H }, () => Math.random())
  const img = g.createImageData(BB_W, BB_H)
  const STATES = [
    { bg: [52, 6, 10], fig: [255, 46, 52], stripes: false, dur: 2.6 },
    { bg: [255, 60, 64], fig: [86, 10, 16], stripes: true, dur: 2.4 },
    { bg: [40, 5, 8], fig: [70, 9, 14], stripes: false, dur: 1.8 },
  ]
  const TOTAL = STATES.reduce((a, s) => a + s.dur, 0)
  let t = 0
  let acc = 0
  let glitch = 0
  let glitchRow = 0
  let glitchShift = 0
  let textOff = 0

  const draw = () => {
    let local = t % TOTAL
    let k = 0
    while (local >= STATES[k].dur) local -= STATES[k++].dur
    const cur = STATES[k]
    const prev = STATES[(k + STATES.length - 1) % STATES.length]
    const tr = Math.min(1, local / 0.4) // pixel dissolve into the new state
    const pulse = k === 2 ? 0.75 + Math.sin(t * 6) * 0.25 : 1
    const bar = ((t * 38) % (BB_H + 24)) - 12
    const d = img.data
    for (let y = 0; y < BB_H; y++) {
      const shift = glitch > 0 && y >= glitchRow && y < glitchRow + 7 ? glitchShift : 0
      const rowLight = (y % 2 ? 0.8 : 1) * (Math.abs(y - bar) < 2.5 ? 1.45 : 1)
      for (let x = 0; x < BB_W; x++) {
        const sx = Math.min(BB_W - 1, Math.max(0, x - shift))
        const i = y * BB_W + sx
        const st = order[i] < tr ? cur : prev
        let r
        let gg
        let b
        if (words[i] && textOff <= 0) {
          r = gg = b = 255
        } else {
          const c = fig[i] ? st.fig : st.bg
          const stripe = st.stripes && !fig[i] && y % 3 === 0 ? 0.72 : 1
          const p = st === cur && k === 2 ? pulse : 1
          ;[r, gg, b] = [c[0] * stripe * p, c[1] * stripe * p, c[2] * stripe * p]
        }
        const sparkle = Math.random() < 0.003 ? 1.8 : 1
        const o = (y * BB_W + x) * 4
        d[o] = Math.min(255, r * rowLight * sparkle)
        d[o + 1] = Math.min(255, gg * rowLight * sparkle)
        d[o + 2] = Math.min(255, b * rowLight * sparkle)
        d[o + 3] = 255
      }
    }
    g.putImageData(img, 0, 0)
    texture.needsUpdate = true
  }

  const tick = (dt) => {
    t += dt
    glitch -= dt
    textOff -= dt
    if (Math.random() < dt * 0.6) {
      glitch = 0.08 + Math.random() * 0.1
      glitchRow = Math.floor(Math.random() * (BB_H - 7))
      glitchShift = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 3))
    }
    if (Math.random() < dt * 0.25) textOff = 0.06
    acc += dt
    if (acc < 1 / 15) return
    acc = 0
    draw()
  }
  draw()
  return { texture, tick }
}

// A small neon sign in pixel letters (vertical, letters stacked, or horizontal) that flickers now and
// then and every few seconds swaps to its other colour. tick(dt) returns the current brightness.
export function createFlickerSign(word, colors, { vertical = true } = {}) {
  const W = vertical ? 14 : word.length * 8 + 8
  const H = vertical ? word.length * 12 + 6 : 18
  const { g, texture } = canvas(W, H)
  texture.magFilter = texture.minFilter = NearestFilter
  texture.generateMipmaps = false
  let ci = 0
  let t = 0
  let swap = 3 + Math.random() * 4
  let level = 1
  const draw = () => {
    const col = colors[ci]
    g.clearRect(0, 0, W, H)
    g.fillStyle = 'rgba(10,6,16,0.85)'
    g.fillRect(0, 0, W, H)
    g.fillStyle = col
    g.fillRect(0, 0, W, 1)
    g.fillRect(0, H - 1, W, 1)
    g.fillRect(0, 0, 1, H)
    g.fillRect(W - 1, 0, 1, H)
    if (vertical) [...word].forEach((ch, i) => pixelText(g, ch, W / 2, 4 + i * 12, 2, col, 'center'))
    else pixelText(g, word, W / 2, 4, 2, col, 'center')
    texture.needsUpdate = true
  }
  draw()
  const tick = (dt) => {
    t += dt
    swap -= dt
    if (swap <= 0 && colors.length > 1) {
      swap = 3 + Math.random() * 5
      ci = (ci + 1) % colors.length
      draw()
    }
    // mostly steady, with quick stutters
    level = Math.random() < 0.025 ? 0.15 + Math.random() * 0.3 : Math.min(1, level + dt * 8)
    return level
  }
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
