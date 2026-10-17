import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store'
import { ABOUT, EXPERIENCE, PROJECTS, SHOWCASE } from '../../data/content'
import Terminal from '../Terminal'
import Icon from './Icon'
import SjLogo from './SjLogo'
import './os.css'

// SJ-OS: the retro desktop that lives on the PC's CRT (mounted on the glass by BattleStation).
// It boots straight into "My Showcase", a little 90s homepage with the SJ logo, name and links.
// Double-click icons to open apps, drag windows by their title bar, Start → Shut down to step back.
// Add an app: write a component, add it to APPS, and (optionally) to DESKTOP_ICONS.

function Welcome() {
  return (
    <div className="os-doc">
      <p>
        <b>Hi, I&apos;m SJ.</b> This is my computer. Make yourself at home.
      </p>
      <ul>
        <li>Double-click an icon to open it</li>
        <li>Drag windows around by their title bar</li>
        <li>Try the Terminal (type <code>help</code>)</li>
        <li>Press ESC or Start → Shut down to step back into the room</li>
      </ul>
    </div>
  )
}

const PAGES = {
  about: { title: 'About', Body: () => <p>{ABOUT.intro}</p> },
  experience: {
    title: 'Experience',
    Body: () =>
      EXPERIENCE.map((e) => (
        <div key={e.role} className="os-site__entry">
          <p>
            <b>{e.role}</b> · {e.org} <span className="os-muted">({e.dates})</span>
          </p>
          <ul>
            {e.points.map((pt) => (
              <li key={pt}>{pt}</li>
            ))}
          </ul>
        </div>
      )),
  },
  projects: {
    title: 'Projects',
    Body: () =>
      PROJECTS.map((p) => (
        <div key={p.name} className="os-site__entry">
          <p>
            <a href={p.link} target="_blank" rel="noreferrer">
              <b>{p.name}</b>
            </a>{' '}
            <span className="os-muted">— {p.stack}</span>
          </p>
          <p>{p.description}</p>
        </div>
      )),
  },
  contact: {
    title: 'Contact',
    Body: () => (
      <ul>
        {ABOUT.links.map((l) => (
          <li key={l.label}>
            <a href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    ),
  },
}

// My Showcase: big name and tagline over four links; each link opens a simple page
function Showcase() {
  const [page, setPage] = useState(null)
  const nav = (
    <nav className="os-site__nav">
      {Object.entries(PAGES).map(([id, pg]) => (
        <button key={id} className={`os-site__link ${id === page ? 'is-current' : ''}`} onClick={() => setPage(id)}>
          {pg.title.toUpperCase()}
        </button>
      ))}
    </nav>
  )
  const current = page && PAGES[page]
  return (
    <div className="os-site">
      <div className="os-site__page">
        {current ? (
          <div className="os-site__sub">
            <header className="os-site__bar">
              <button className="os-site__home-link" onClick={() => setPage(null)}>
                <SjLogo size={30} color="#111" /> {SHOWCASE.name}
              </button>
              {nav}
            </header>
            <h3>{current.title}</h3>
            <current.Body />
          </div>
        ) : (
          <div className="os-site__home">
            <SjLogo size={70} color="#111" className="os-site__logo" />
            <h1>{SHOWCASE.name}</h1>
            <h2>{SHOWCASE.tagline}</h2>
            {nav}
          </div>
        )}
      </div>
      <div className="os-site__status os-sunken">
        © Copyright {SHOWCASE.year} {SHOWCASE.name}
      </div>
    </div>
  )
}

function Projects() {
  const [sel, setSel] = useState(0)
  const p = PROJECTS[sel]
  return (
    <div className="os-explorer">
      <div className="os-explorer__list os-sunken">
        <div className="os-explorer__row os-explorer__row--head">
          <span>Name</span>
          <span>Stack</span>
        </div>
        {PROJECTS.map((proj, i) => (
          <div
            key={proj.name}
            className={`os-explorer__row ${i === sel ? 'is-selected' : ''}`}
            onClick={() => setSel(i)}
            onDoubleClick={() => window.open(proj.link, '_blank', 'noopener')}
          >
            <span>
              <Icon type="folder" size={16} /> {proj.name}
            </span>
            <span>{proj.stack}</span>
          </div>
        ))}
      </div>
      {p && (
        <div className="os-explorer__detail">
          <p>{p.description}</p>
          <a className="os-btn" href={p.link} target="_blank" rel="noreferrer">
            Open project ↗
          </a>
        </div>
      )}
    </div>
  )
}

function About() {
  return (
    <div className="os-doc os-doc--paper os-sunken">
      <p>{ABOUT.intro}</p>
    </div>
  )
}

function Contact() {
  return (
    <div className="os-doc">
      <p>Say hi:</p>
      <div className="os-btn-row">
        {ABOUT.links.map((l) => (
          <a key={l.label} className="os-btn" href={l.href} target="_blank" rel="noreferrer">
            {l.label}
          </a>
        ))}
      </div>
    </div>
  )
}

function Trash() {
  return (
    <div className="os-doc">
      <p>The Recycle Bin is empty.</p>
      <p className="os-muted">All my bugs are fixed. Probably.</p>
    </div>
  )
}

const APPS = {
  showcase: { title: `${SHOWCASE.name} - Showcase ${SHOWCASE.year}`, label: 'My Showcase', icon: 'sj', w: 670, h: 526, Body: Showcase, flush: true },
  welcome: { title: 'Welcome.txt', icon: 'note', w: 400, h: 200, Body: Welcome },
  projects: { title: 'My Projects', icon: 'folder', w: 500, h: 300, Body: Projects },
  terminal: { title: 'Terminal', icon: 'terminal', w: 520, h: 320, Body: Terminal, dark: true },
  about: { title: 'About Me.txt', icon: 'note', w: 400, h: 240, Body: About },
  contact: { title: 'Contact', icon: 'mail', w: 360, h: 170, Body: Contact },
  trash: { title: 'Recycle Bin', icon: 'trash', w: 320, h: 170, Body: Trash },
}
const DESKTOP_ICONS = ['showcase', 'projects', 'terminal', 'about', 'contact', 'trash']
const START_ITEMS = ['showcase', 'projects', 'terminal', 'about', 'contact', 'welcome']

const BOOT = [
  'SJ-BIOS v4.20  (C) 2026 SJ Inc.',
  'CPU: Gold Edition @ 4.20 GHz',
  'Memory test: 65536K OK',
  'Detecting drives ... C: SJ-HDD  OK',
  'Loading SJ-OS ...',
]

const TASKBAR_H = 34

export default function Desktop({ width, height }) {
  const goHome = useStore((s) => s.goHome)
  const root = useRef()
  const drag = useRef(null)
  const zTop = useRef(1)
  const [boot, setBoot] = useState(0)
  const [wins, setWins] = useState([])
  const [selected, setSelected] = useState(null)
  const [startOpen, setStartOpen] = useState(false)
  const now = useClock()

  // Boot text, one line at a time, then the desktop with My Showcase open
  useEffect(() => {
    if (boot > BOOT.length) return
    const id = setTimeout(() => setBoot((b) => b + 1), boot === BOOT.length ? 600 : 260)
    return () => clearTimeout(id)
  }, [boot])
  const booted = boot > BOOT.length
  useEffect(() => {
    if (booted) open('showcase')
  }, [booted]) // eslint-disable-line react-hooks/exhaustive-deps

  const focus = (id) => setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z: ++zTop.current, min: false } : w)))

  function open(id) {
    setStartOpen(false)
    setWins((ws) => {
      if (ws.some((w) => w.id === id)) return ws.map((w) => (w.id === id ? { ...w, z: ++zTop.current, min: false } : w))
      const app = APPS[id]
      const n = ws.length
      return [
        ...ws,
        {
          id,
          x: Math.min(140 + n * 28, width - app.w - 10),
          y: Math.min(40 + n * 26, height - TASKBAR_H - app.h - 10),
          z: ++zTop.current,
          min: false,
        },
      ]
    })
  }
  const close = (id) => setWins((ws) => ws.filter((w) => w.id !== id))
  const minimize = (id) => setWins((ws) => ws.map((w) => (w.id === id ? { ...w, min: true } : w)))

  // Dragging: the desktop is scaled onto the CRT, so convert screen pixels back to desktop pixels
  const startDrag = (e, id) => {
    if (e.button !== 0) return
    const w = wins.find((v) => v.id === id)
    const scale = root.current.getBoundingClientRect().width / width
    drag.current = { id, sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, scale }
    e.currentTarget.setPointerCapture(e.pointerId)
    focus(id)
  }
  const onDrag = (e) => {
    const d = drag.current
    if (!d) return
    const app = APPS[d.id]
    const x = Math.max(-app.w + 60, Math.min(width - 60, d.x + (e.clientX - d.sx) / d.scale))
    const y = Math.max(0, Math.min(height - TASKBAR_H - 24, d.y + (e.clientY - d.sy) / d.scale))
    setWins((ws) => ws.map((w) => (w.id === d.id ? { ...w, x, y } : w)))
  }
  const endDrag = () => (drag.current = null)

  const topId = wins.filter((w) => !w.min).sort((a, b) => b.z - a.z)[0]?.id

  return (
    <div ref={root} className="os" style={{ width, height }}>
      {!booted ? (
        <div className="os-boot">
          <SjLogo size={64} color="#e8b923" className="os-boot__logo" />
          {BOOT.slice(0, boot).map((l) => (
            <div key={l}>{l}</div>
          ))}
          <span className="os-boot__cursor">_</span>
        </div>
      ) : (
        <>
          <div
            className="os-desktop"
            style={{ bottom: TASKBAR_H }}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) {
                setSelected(null)
                setStartOpen(false)
              }
            }}
          >
            <div className="os-icons">
              {DESKTOP_ICONS.map((id) => (
                <button
                  key={id}
                  className={`os-icon ${selected === id ? 'is-selected' : ''}`}
                  onClick={() => setSelected(id)}
                  onDoubleClick={() => open(id)}
                  onKeyDown={(e) => e.key === 'Enter' && open(id)}
                >
                  <Icon type={APPS[id].icon} />
                  <span>{APPS[id].label ?? APPS[id].title}</span>
                </button>
              ))}
            </div>

            {wins.map((w) => {
              const app = APPS[w.id]
              const { Body } = app
              return (
                <section
                  key={w.id}
                  className={`os-window os-bevel ${w.id === topId ? 'is-active' : ''}`}
                  style={{ left: w.x, top: w.y, width: app.w, height: app.h, zIndex: w.z, display: w.min ? 'none' : 'flex' }}
                  onPointerDown={() => w.id !== topId && focus(w.id)}
                >
                  <header
                    className="os-titlebar"
                    onPointerDown={(e) => startDrag(e, w.id)}
                    onPointerMove={onDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                  >
                    <Icon type={app.icon} size={16} />
                    <span className="os-titlebar__text">{app.title}</span>
                    <button className="os-tbtn os-bevel" onPointerDown={(e) => e.stopPropagation()} onClick={() => minimize(w.id)} aria-label="Minimise">
                      _
                    </button>
                    <button className="os-tbtn os-bevel" onPointerDown={(e) => e.stopPropagation()} onClick={() => close(w.id)} aria-label="Close">
                      ×
                    </button>
                  </header>
                  <div className={`os-window__body ${app.dark ? 'os-window__body--dark' : ''} ${app.flush ? 'os-window__body--flush' : ''}`}>
                    <Body />
                  </div>
                </section>
              )
            })}
          </div>

          {startOpen && (
            <nav className="os-start os-bevel" style={{ bottom: TASKBAR_H - 2 }}>
              <div className="os-start__banner">
                SJ-<b>OS</b>
              </div>
              <div className="os-start__items">
                {START_ITEMS.map((id) => (
                  <button key={id} className="os-start__item" onClick={() => open(id)}>
                    <Icon type={APPS[id].icon} size={24} /> {APPS[id].label ?? APPS[id].title}
                  </button>
                ))}
                <hr />
                <button className="os-start__item" onClick={() => { setStartOpen(false); goHome() }}>
                  <Icon type="power" size={24} /> Shut down...
                </button>
              </div>
            </nav>
          )}

          <footer className="os-taskbar os-bevel" style={{ height: TASKBAR_H }}>
            <button className={`os-startbtn os-bevel ${startOpen ? 'is-pressed' : ''}`} onClick={() => setStartOpen((o) => !o)}>
              <SjLogo size={16} color="#111" /> Start
            </button>
            <div className="os-taskbar__wins">
              {wins.map((w) => (
                <button
                  key={w.id}
                  className={`os-taskbtn os-bevel ${w.id === topId ? 'is-pressed' : ''}`}
                  onClick={() => (w.id === topId ? minimize(w.id) : focus(w.id))}
                >
                  <Icon type={APPS[w.id].icon} size={16} /> {APPS[w.id].label ?? APPS[w.id].title}
                </button>
              ))}
            </div>
            <div className="os-tray os-sunken">{now}</div>
          </footer>
        </>
      )}
      <div className="crt-glass" />
    </div>
  )
}

function useClock() {
  const fmt = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const [now, setNow] = useState(fmt)
  useEffect(() => {
    const id = setInterval(() => setNow(fmt()), 10000)
    return () => clearInterval(id)
  }, [])
  return now
}
