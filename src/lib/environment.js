import { Color } from 'three'

// Weather + time of day outside the window. One shared, mutable object: the Window ticks it once
// per frame, and anything else (room lights, the HUD) just reads it. Nothing here causes re-renders.
//
// It's live: the clock is the real time in Sydney, the weather is Sydney's current weather (from
// Open-Meteo, a free public weather API, refreshed every 15 minutes), and the sun rises and sets at
// Sydney's real sunrise/sunset. If the weather can't be fetched it falls back to changing by itself.
//
// time: Sydney clock, 0 = midnight … 0.5 = noon. phase: where the sun is, 0.25 = sunrise, 0.75 = sunset.
// In the browser console (dev): __env.set({ weather: 'snow' }) previews a weather for a few minutes,
// __env.set({ time: 0.5 }) leaves live time to preview noon, __env.set({ live: true }) goes back.

// What each weather looks like, as amounts that blend smoothly into each other
export const WEATHERS = {
  clear: { cloud: 0.05, rain: 0, snow: 0, fog: 0, storm: 0 },
  partly: { cloud: 0.4, rain: 0, snow: 0, fog: 0.05, storm: 0 },
  cloudy: { cloud: 0.8, rain: 0, snow: 0, fog: 0.1, storm: 0 },
  rain: { cloud: 0.85, rain: 1, snow: 0, fog: 0.2, storm: 0 },
  storm: { cloud: 1, rain: 1, snow: 0, fog: 0.25, storm: 1 },
  snow: { cloud: 0.7, rain: 0, snow: 1, fog: 0.12, storm: 0 },
  fog: { cloud: 0.5, rain: 0, snow: 0, fog: 1, storm: 0 },
}

// How often each weather comes up when it changes on its own
const WEIGHTS = { clear: 3, partly: 2, cloudy: 2, rain: 3, storm: 1.5, snow: 1.5, fog: 1 }

const DAY_SECONDS = 360 // one full day/night cycle, when not following the real clock
const WEATHER_SECONDS = [45, 100] // how long a weather lasts when it changes by itself
const PREVIEW_SECONDS = 180 // how long a hand-picked weather shows before going back to live weather
const REFRESH_MINUTES = 15

const SYDNEY = { lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' }
const WEATHER_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${SYDNEY.lat}&longitude=${SYDNEY.lon}` +
  `&current=weather_code&daily=sunrise,sunset&forecast_days=1&timezone=${encodeURIComponent(SYDNEY.tz)}`
const BLEND_RATE = 0.25 // how fast weather fades into the next one

// Sky gradient through the day: [time, top of sky, horizon]
const SKY = [
  [0.0, '#05071a', '#25124a'],
  [0.21, '#0d1238', '#3b1f5e'],
  [0.26, '#3a4f96', '#ff8f6b'],
  [0.33, '#4c8ad6', '#ffd2a8'],
  [0.5, '#3a83e0', '#b4dcff'],
  [0.67, '#4a82cc', '#ffe0b0'],
  [0.74, '#3b3c7c', '#ff7448'],
  [0.79, '#1b1744', '#86356b'],
  [1.0, '#05071a', '#25124a'],
].map(([t, top, low]) => [t, new Color(top), new Color(low)])

const SUN_LOW = new Color('#ff9550')
const SUN_HIGH = new Color('#fff1dc')
const MOON = new Color('#b8c6ff')
const OVERCAST_DAY = new Color('#8f98a8')
const OVERCAST_NIGHT = new Color('#16151f')
const FLASH = new Color('#e4ebff')

export const env = {
  live: true, // follow Sydney's real clock + weather
  time: 0, // Sydney clock (0–1)
  phase: 0, // sun position (0.25 sunrise, 0.75 sunset)
  weather: 'partly',
  liveWeather: null, // Sydney's current weather, once fetched
  sunrise: 0.25, // Sydney's sunrise/sunset today (0–1), once fetched
  sunset: 0.75,
  paused: false,
  shutter: null, // { open, tilt } to hold the window shutter in place; null = it moves by itself
  // blended weather amounts (0–1)
  cloud: 0.4,
  rain: 0,
  snow: 0,
  fog: 0.05,
  storm: 0,
  // derived every tick
  sunElev: 0, // -1 … 1 (1 = sun overhead)
  sunX: 0, // -1 (rises on the left) … 1 (sets on the right)
  daylight: 0, // 0 night … 1 day
  flash: 0, // lightning, 0–1
  snowCover: 0, // snow settled on the trees, ground and ledge, 0–1
  skyTop: new Color(),
  skyLow: new Color(),
  light: new Color(), // colour of the sun/moon light coming in
  lightAmount: 0, // how much direct sun/moon gets through (0–1)
}

let weatherTimer = rand(...WEATHER_SECONDS)
let previewTimer = 0
let clockTimer = 0
let flashTimer = 3
let secondFlash = -1

function rand(a, b) {
  return a + Math.random() * (b - a)
}
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function pickWeather() {
  const options = Object.keys(WEIGHTS).filter((w) => w !== env.weather)
  let r = Math.random() * options.reduce((a, w) => a + WEIGHTS[w], 0)
  env.weather = options.find((w) => (r -= WEIGHTS[w]) < 0) ?? 'clear'
  weatherTimer = rand(...WEATHER_SECONDS)
}

// ---------- live Sydney time + weather ----------
const sydneyClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: SYDNEY.tz,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})
function sydneyTime() {
  const p = Object.fromEntries(sydneyClock.formatToParts(new Date()).map((x) => [x.type, x.value]))
  return (Number(p.hour) * 3600 + Number(p.minute) * 60 + Number(p.second)) / 86400
}

// "2026-10-13T05:43" (already Sydney time) → 0–1
const dayFraction = (iso) => {
  const [h, m] = iso.split('T')[1].split(':').map(Number)
  return (h * 60 + m) / 1440
}

// WMO weather codes (what Open-Meteo returns) → our weathers
function fromWeatherCode(c) {
  if (c >= 95) return 'storm'
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow'
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'rain'
  if (c === 45 || c === 48) return 'fog'
  if (c === 3) return 'cloudy'
  if (c === 2) return 'partly'
  return 'clear'
}

async function fetchSydneyWeather() {
  try {
    const res = await fetch(WEATHER_URL)
    if (!res.ok) throw new Error(res.status)
    const data = await res.json()
    env.liveWeather = fromWeatherCode(data.current.weather_code)
    env.sunrise = dayFraction(data.daily.sunrise[0])
    env.sunset = dayFraction(data.daily.sunset[0])
  } catch {
    // offline or blocked: the weather keeps changing by itself instead
  }
}

// Clock time → sun position, stretched so the sun is up exactly between Sydney's sunrise and sunset
function solarPhase(t) {
  const { sunrise: up, sunset: down } = env
  if (t >= up && t <= down) return 0.25 + (0.5 * (t - up)) / (down - up)
  const night = 1 - (down - up)
  const since = (t - down + 1) % 1
  return (0.75 + (0.5 * since) / night) % 1
}

const tmp = new Color()
export function tickEnvironment(dt) {
  if (env.live) {
    // the real Sydney clock (checked once a second)
    if ((clockTimer -= dt) <= 0) {
      env.time = sydneyTime()
      clockTimer = 1
    }
  } else if (!env.paused) {
    env.time = (env.time + dt / DAY_SECONDS) % 1
  }
  env.phase = env.live ? solarPhase(env.time) : env.time

  // Live Sydney weather, unless you're previewing one; otherwise it changes by itself
  if (previewTimer > 0) previewTimer -= dt
  else if (env.live && env.liveWeather) env.weather = env.liveWeather
  else if (!env.paused && (weatherTimer -= dt) <= 0) pickWeather()

  const target = WEATHERS[env.weather]
  const k = 1 - Math.exp(-dt * BLEND_RATE)
  for (const key in target) env[key] += (target[key] - env[key]) * k

  // Sun goes round once a day; the moon is opposite it
  const a = (env.phase - 0.25) * Math.PI * 2
  env.sunElev = Math.sin(a)
  env.sunX = -Math.cos(a)
  env.daylight = smooth(-0.15, 0.3, env.sunElev)

  // Sky colours for this time of day…
  let i = 0
  while (SKY[i + 1][0] < env.phase) i++
  const [t0, top0, low0] = SKY[i]
  const [t1, top1, low1] = SKY[i + 1]
  const f = (env.phase - t0) / (t1 - t0)
  env.skyTop.copy(top0).lerp(top1, f)
  env.skyLow.copy(low0).lerp(low1, f)
  // …greyed out by cloud, darkened by storms, lit up by lightning
  tmp.copy(OVERCAST_NIGHT).lerp(OVERCAST_DAY, env.daylight)
  env.skyTop.lerp(tmp, env.cloud * 0.75)
  env.skyLow.lerp(tmp, env.cloud * 0.6)
  env.skyTop.multiplyScalar(1 - env.storm * 0.45)
  env.skyLow.multiplyScalar(1 - env.storm * 0.4)

  // Lightning: random double flashes while it storms
  if (env.storm > 0.6) {
    flashTimer -= dt
    if (flashTimer <= 0) {
      env.flash = 1
      secondFlash = 0.18
      flashTimer = rand(2.5, 9)
    }
  }
  if (secondFlash > 0 && (secondFlash -= dt) <= 0) env.flash = 0.8
  env.flash = Math.max(0, env.flash - dt * 5)
  env.skyTop.lerp(FLASH, env.flash * 0.8)
  env.skyLow.lerp(FLASH, env.flash * 0.9)

  // Direct light through the window: the sun by day, a little moonlight on clear nights
  const sunUp = smooth(-0.05, 0.15, env.sunElev)
  const moonUp = smooth(-0.05, 0.15, -env.sunElev)
  env.light.copy(SUN_LOW).lerp(SUN_HIGH, smooth(0.1, 0.6, env.sunElev))
  if (sunUp < 0.5) env.light.lerp(MOON, 1 - sunUp * 2)
  env.lightAmount = (sunUp + moonUp * 0.18) * (1 - env.cloud * 0.85)

  // snow settles while it snows and slowly melts after (faster in the sun)
  const melt = 0.008 + env.daylight * 0.02 + env.rain * 0.02
  env.snowCover = Math.min(1, Math.max(0, env.snowCover + dt * (env.snow > 0.5 ? 0.03 : -melt)))
}

// Change things by hand:
//   setEnvironment({ weather: 'storm' })   preview a weather (for a few minutes, while live)
//   setEnvironment({ time: 0.5 })          leave the live clock and jump to noon (time then runs fast)
//   setEnvironment({ live: true })         back to live Sydney time + weather
//   setEnvironment({ paused: true })       freeze the clock + weather (when not live)
//   setEnvironment({ shutter: { open: 1, tilt: 0 } }) hold the shutter; ({ shutter: null }) to release
export function setEnvironment({ weather, time, paused, shutter, live } = {}) {
  if (shutter !== undefined) env.shutter = shutter
  if (typeof live === 'boolean') {
    env.live = live
    clockTimer = 0
    previewTimer = 0
  }
  if (typeof time === 'number') {
    env.live = false
    env.time = ((time % 1) + 1) % 1
  }
  if (weather && WEATHERS[weather]) {
    env.weather = weather
    weatherTimer = rand(...WEATHER_SECONDS)
    if (env.live) previewTimer = PREVIEW_SECONDS
  }
  if (typeof paused === 'boolean') env.paused = paused
}

export function nextWeather() {
  const names = Object.keys(WEATHERS)
  setEnvironment({ weather: names[(names.indexOf(env.weather) + 1) % names.length] })
}

// "11:40 pm"
export function clockTime() {
  const mins = Math.floor(env.time * 24 * 60)
  const h = Math.floor(mins / 60)
  const m = String(mins % 60).padStart(2, '0')
  return `${((h + 11) % 12) + 1}:${m} ${h < 12 ? 'am' : 'pm'}`
}

if (typeof window !== 'undefined') {
  env.time = sydneyTime()
  fetchSydneyWeather()
  setInterval(fetchSydneyWeather, REFRESH_MINUTES * 60 * 1000)
  if (import.meta.env.DEV) window.__env = { state: env, set: setEnvironment }
}
tickEnvironment(0)
