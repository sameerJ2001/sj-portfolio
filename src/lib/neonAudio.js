// Neon tube buzz + crackle, made with Web Audio (no sound files). Browsers only allow sound after
// the visitor clicks something, so this plays on the ENTER click as the sign flickers off.
let ctx

export function playNeonBuzz(duration = 0.7) {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)()
    ctx.resume()
    const now = ctx.currentTime
    const out = ctx.createGain()
    out.gain.value = 0.08
    out.connect(ctx.destination)

    // mains hum: a 120 Hz sawtooth, low-passed, stuttering on and off like the tube
    const hum = ctx.createOscillator()
    hum.type = 'sawtooth'
    hum.frequency.value = 120
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    const gate = ctx.createGain()
    gate.gain.setValueAtTime(0, now)
    const steps = [0, 0.05, 0.09, 0.16, 0.2, 0.32, 0.36, duration * 0.8]
    steps.forEach((t, i) => gate.gain.setValueAtTime(i % 2 ? 0.15 : 1, now + t))
    gate.gain.linearRampToValueAtTime(0, now + duration)
    hum.connect(lp).connect(gate).connect(out)
    hum.start(now)
    hum.stop(now + duration)

    // crackle: a short burst of filtered noise at the start
    const len = Math.floor(ctx.sampleRate * 0.25)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (Math.random() < 0.08 ? 1 : 0.15) * (1 - i / len)
    const noise = ctx.createBufferSource()
    noise.buffer = buf
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 2000
    noise.connect(hp).connect(out)
    noise.start(now)
  } catch {
    // no audio available: stay silent
  }
}
