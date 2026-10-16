import { useEffect, useState } from 'react'
import { useStore } from './store'
import { zoneById } from './data/zones'
import { env, nextWeather, clockTime } from './lib/environment'
import Scene from './components/Scene'
import Loader from './components/Loader'
import Panel from './components/Panel'

export default function App() {
  const entered = useStore((s) => s.entered)
  const activeZone = useStore((s) => s.activeZone)
  const arrivedZone = useStore((s) => s.arrivedZone)
  const goHome = useStore((s) => s.goHome)
  const lightsOn = useStore((s) => s.lightsOn)
  const toggleLights = useStore((s) => s.toggleLights)

  // ESC returns to the overview from anywhere.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && goHome()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goHome])

  return (
    <>
      <Scene />

      {entered && (
        <nav className="hud">
          <span className="hud__title">SJ&apos;s loft</span>
          <div className="hud__actions">
            {arrivedZone && (
              <button className="pixel-btn pixel-btn--small" onClick={goHome}>
                ← back
              </button>
            )}
            <OutsideButton />
            <button className="pixel-btn pixel-btn--small" onClick={toggleLights}>
              {lightsOn ? '◐ lamps off' : '◑ lamps on'}
            </button>
            {/* TODO: point this at a plain 2D page for recruiters */}
            <a className="pixel-btn pixel-btn--small" href="#recruiter">
              recruiter mode
            </a>
          </div>
        </nav>
      )}

      {arrivedZone && zoneById(arrivedZone).screen && (
        <p className="hint">click the screen to use it · ESC or ← back to step away</p>
      )}

      {entered && !arrivedZone && (
        <p className="hint">{activeZone ? '' : 'click anything in the loft — start with the PC ★'}</p>
      )}

      <Panel />
      <Loader />
    </>
  )
}

// Live Sydney time + weather outside the window. Click to preview another weather for a few minutes.
function OutsideButton() {
  const read = () => `syd ${clockTime()} · ${env.weather}`
  const [label, setLabel] = useState(read)
  useEffect(() => {
    const id = setInterval(() => setLabel(read()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <button
      className="pixel-btn pixel-btn--small"
      title={`Live Sydney time + weather (${env.liveWeather ?? 'loading…'}). Click to preview another weather.`}
      onClick={() => {
        nextWeather()
        setLabel(read())
      }}
    >
      {label}
    </button>
  )
}
