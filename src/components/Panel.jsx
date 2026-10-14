import { useStore } from '../store'
import { zoneById } from '../data/zones'
import { PHOTOS, COMING_SOON, ABOUT } from '../data/content'

// The 2D side panel that slides in once SJ has arrived at a zone.
function Body({ id }) {
  if (id === 'piano')
    return (
      <div className="now-playing">
        <p className="now-playing__tag">♪ now playing</p>
        <p>SJ is playing a little loop for you. Turn your sound on.</p>
        <p className="muted">Coming later: recordings of pieces I actually play.</p>
      </div>
    )

  if (id === 'photos')
    return (
      <div className="polaroids">
        {PHOTOS.map((p, i) => (
          <figure key={i} className="polaroid" style={{ '--tilt': `${((i % 3) - 1) * 2}deg` }}>
            {p.src ? <img src={p.src} alt={p.caption} /> : <div className="polaroid__blank" />}
            <figcaption>{p.caption}</figcaption>
          </figure>
        ))}
      </div>
    )

  if (id === 'window')
    return (
      <div className="about">
        <p>{ABOUT.intro}</p>
        <div className="about__links">
          {ABOUT.links.map((l) => (
            <a key={l.label} className="pixel-btn pixel-btn--small" href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ))}
        </div>
      </div>
    )

  return (
    <div className="coming-soon">
      <p className="coming-soon__tag">under construction</p>
      <ul>
        {(COMING_SOON[id] ?? []).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export default function Panel() {
  const arrivedZone = useStore((s) => s.arrivedZone)
  const goHome = useStore((s) => s.goHome)
  // Screen zones (PC, arcades) are used right on the screen, so they get no side panel
  const zone = arrivedZone && !zoneById(arrivedZone).screen ? zoneById(arrivedZone) : null

  return (
    <aside className={`panel ${zone ? 'panel--open' : ''} ${zone?.main ? 'panel--main' : ''}`} aria-hidden={!zone}>
      {zone && (
        <>
          <header className="panel__head">
            <div>
              <h2>{zone.label}</h2>
              <p>{zone.blurb}</p>
            </div>
            <button className="pixel-btn pixel-btn--small" onClick={goHome} aria-label="Back to room">
              ESC
            </button>
          </header>
          <Body key={zone.id} id={zone.id} />
        </>
      )}
    </aside>
  )
}
