import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { useStore } from '../store'
import { env, clockTime } from '../lib/environment'
import { playNeonBuzz } from '../lib/neonAudio'

// Loading screen, in the room's style. A green terminal boots while the loft loads (real progress
// from drei), then a pink neon "SJ" sign (エス・ジェイ) buzzes and stutters on, reflected in a wet
// floor. ENTER flicks the sign off and the camera swoops into the loft. The rain (or snow) behind it
// is Sydney's live weather. All code: no images or downloads, so it shows instantly.
const MIN_MS = 2600 // keep the boot visible even when everything is cached

// Terminal lines: [show once loading passes this %, text]
const LINES = [
  [0, () => '> connecting to sj@loft ...'],
  [10, () => '> mounting /desk-deck /back-deck'],
  [26, () => '> spinning up the rotors'],
  [44, () => '> loading arcade cabinets'],
  [60, () => '> warming up the CRT'],
  [74, () => `> syncing weather: sydney · ${clockTime()} · ${env.liveWeather ?? env.weather}`],
  [90, () => '> lighting the neon ...'],
]
const BAR = 18

export default function Loader() {
  const { progress } = useProgress()
  const entered = useStore((s) => s.entered)
  const enter = useStore((s) => s.enter)
  const [fake, setFake] = useState(0)
  const [lines, setLines] = useState([])
  // boot → flicker (sign coming on) → ready (ENTER) → leaving (sign off, fade out)
  const [phase, setPhase] = useState('boot')
  const button = useRef()

  const go = () => {
    playNeonBuzz()
    setPhase('leaving')
    setTimeout(enter, 1100)
  }

  useEffect(() => {
    const start = performance.now()
    let raf
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / MIN_MS)
      setFake(t * 100)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // With no assets loading, drei reports 0 — treat that as done.
  const real = progress === 0 ? 100 : progress
  const pct = Math.floor(Math.min(fake, real))

  // Reveal terminal lines as loading passes each one (worked out from the current list, so it's
  // safe if React runs this twice)
  useEffect(() => {
    setLines((l) => {
      const next = LINES[l.length]
      return next && pct >= next[0] ? [...l, next[1]()] : l
    })
  }, [pct, lines.length])

  // Booted → the sign stutters on → ENTER appears
  const booted = pct >= 100 && lines.length === LINES.length
  useEffect(() => {
    if (!booted || phase !== 'boot') return
    const id = setTimeout(() => setPhase('flicker'), 450)
    return () => clearTimeout(id)
  }, [booted, phase])
  useEffect(() => {
    if (phase !== 'flicker') return
    const id = setTimeout(() => setPhase('ready'), 1500)
    return () => clearTimeout(id)
  }, [phase])

  // Once lit, ENTER (the button or the key) goes in
  useEffect(() => {
    if (phase !== 'ready') return
    button.current?.focus({ preventScroll: true })
    const onKey = (e) => e.key === 'Enter' && go()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  if (entered) return null

  const filled = Math.round((pct / 100) * BAR)

  return (
    <div className={`loader loader--${phase}`}>
      <WeatherBehind />

      <div className="loader__sign">
        <NeonSign />
        <div className="loader__reflection" aria-hidden="true">
          <NeonSign />
        </div>
      </div>

      <div className="loader__term" aria-live="polite">
        {lines.map((text, i) => (
          <div key={i}>
            <Typed text={text} />
          </div>
        ))}
        <div className="loader__progress">
          [{'█'.repeat(filled)}
          <span className="loader__progress-empty">{'░'.repeat(BAR - filled)}</span>] {pct}%
          {!booted && <span className="loader__cursor">▌</span>}
        </div>
      </div>

      <button ref={button} className="neon-btn" disabled={phase !== 'ready'} onClick={go}>
        ENTER
      </button>
    </div>
  )
}

// The sign: a dim glass tube layer, with the lit layer on top that flickers on and off.
// The katakana is its own tube, so it stutters on a beat after the "SJ".
function NeonSign() {
  const tubes = (
    <div className="neon__frame">
      <span className="neon__sj">SJ</span>
      <span className="neon__kana">エス・ジェイ</span>
    </div>
  )
  return (
    <div className="neon">
      <div className="neon__tube">{tubes}</div>
      <div className="neon__lit">{tubes}</div>
    </div>
  )
}

function Typed({ text }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (n >= text.length) return
    const id = setTimeout(() => setN((v) => v + 2), 16)
    return () => clearTimeout(id)
  }, [n, text])
  return text.slice(0, n)
}

// Sydney's live weather falling behind the sign: rain streaks, snowflakes, or slow drifting dust
// when it's dry. Storms flash.
function WeatherBehind() {
  const canvas = useRef()

  useEffect(() => {
    const c = canvas.current
    const g = c.getContext('2d')
    let raf
    let w = 0
    let h = 0
    const resize = () => {
      w = c.width = window.innerWidth
      h = c.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    const drops = Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), v: 0.6 + Math.random() * 0.8 }))
    let flash = 0
    let last = performance.now()

    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const kind = env.liveWeather ?? env.weather
      const wet = kind === 'rain' || kind === 'storm'
      const snow = kind === 'snow'
      g.clearRect(0, 0, w, h)

      if (kind === 'storm' && Math.random() < dt * 0.25) flash = 1
      if (flash > 0) {
        g.fillStyle = `rgba(200,215,255,${flash * 0.18})`
        g.fillRect(0, 0, w, h)
        flash = Math.max(0, flash - dt * 4)
      }

      drops.forEach((d, i) => {
        if (!wet && !snow && i > 40) return
        const speed = wet ? 1.6 : snow ? 0.08 : 0.015
        d.y += d.v * speed * dt
        if (wet) d.x -= d.v * 0.12 * dt
        if (snow) d.x += Math.sin(now / 900 + i) * 0.0004
        if (!wet && !snow) d.x += 0.004 * dt
        if (d.y > 1) d.y -= 1
        if (d.x < 0) d.x += 1
        if (d.x > 1) d.x -= 1
        const x = d.x * w
        const y = d.y * h
        if (wet) {
          g.strokeStyle = `rgba(150,180,255,${0.12 + d.v * 0.12})`
          g.lineWidth = 1
          g.beginPath()
          g.moveTo(x, y)
          g.lineTo(x + 3, y - 18 - d.v * 10)
          g.stroke()
        } else {
          g.fillStyle = snow ? 'rgba(235,240,255,0.7)' : 'rgba(255,170,220,0.18)'
          const r = snow ? 1.5 + d.v : 1 + d.v * 0.5
          g.fillRect(x, y, r, r)
        }
      })
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvas} className="loader__weather" aria-hidden="true" />
}
