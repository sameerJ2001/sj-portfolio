// Tiny Web Audio "piano" — no samples needed. Plays a looping arpeggio
// (C – Am – F – G). Later: swap for Tone.js + real piano samples or your own recording.
let ctx

const NOTE_HZ = (midi) => 440 * Math.pow(2, (midi - 69) / 12)

function pluck(midi, when, dur = 1.4, gain = 0.18) {
  const osc = ctx.createOscillator()
  const osc2 = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'triangle'
  osc2.type = 'sine'
  osc.frequency.value = NOTE_HZ(midi)
  osc2.frequency.value = NOTE_HZ(midi) * 2
  g.gain.setValueAtTime(0, when)
  g.gain.linearRampToValueAtTime(gain, when + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  osc.connect(g)
  osc2.connect(g)
  g.connect(ctx.destination)
  osc.start(when)
  osc2.start(when)
  osc.stop(when + dur)
  osc2.stop(when + dur)
}

// Chords as MIDI notes: bass + arpeggio
const PROGRESSION = [
  [48, 60, 64, 67, 72],
  [45, 57, 60, 64, 69],
  [41, 57, 60, 65, 69],
  [43, 55, 59, 62, 67],
]

// Starts looping; calls onNote(midi) as each note plays. Returns a stop() function.
export function playPiano(onNote) {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
  ctx.resume()
  const step = 0.28
  let bar = 0
  let stopped = false
  const timers = []

  const scheduleBar = () => {
    if (stopped) return
    const chord = PROGRESSION[bar % PROGRESSION.length]
    const start = ctx.currentTime + 0.05
    pluck(chord[0], start, 2.2, 0.16)
    const pattern = [1, 2, 3, 4, 3, 2, 3, 4]
    pattern.forEach((n, i) => {
      pluck(chord[n], start + i * step)
      timers.push(setTimeout(() => !stopped && onNote?.(chord[n]), (0.05 + i * step) * 1000))
    })
    timers.push(setTimeout(() => !stopped && onNote?.(chord[0]), 50))
    bar++
    timers.push(setTimeout(scheduleBar, pattern.length * step * 1000))
  }
  scheduleBar()

  return () => {
    stopped = true
    timers.forEach(clearTimeout)
  }
}
