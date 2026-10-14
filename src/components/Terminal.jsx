import { useEffect, useRef, useState } from 'react'
import { PROJECTS } from '../data/content'

// Fake shell, opened from SJ-OS on the PC. Add commands in COMMANDS.
// It lives on a 3D-transformed screen, so it never uses scrollIntoView/autoFocus (those scroll the page).
const COMMANDS = {
  help: () => ['commands: whoami, ls projects, open <n>, skills, contact, clear, sudo'],
  whoami: () => ['SJ — developer, security nerd, photographer.', 'Based in Sydney. CS honours (cyber + AI/ML) @ UTS.'],
  'ls projects': () => PROJECTS.map((p, i) => `[${i + 1}] ${p.name.padEnd(22)} ${p.stack}`),
  skills: () => ['python  typescript  react  three.js', 'pentesting  ctf  ml  llms'],
  contact: () => ['github: github.com/your-handle', 'email:  you@example.com'],
  sudo: () => ['nice try. this incident will be reported. 👀'],
}

export default function Terminal() {
  const [lines, setLines] = useState(['SJ-OS v0.1 — type `help` to start'])
  const [input, setInput] = useState('')
  const boxRef = useRef(null)
  const inputRef = useRef(null)
  const focusInput = () => inputRef.current?.focus({ preventScroll: true })

  useEffect(focusInput, [])
  // keep the newest line in view by scrolling the terminal itself, not the page
  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [lines])

  const run = (raw) => {
    const cmd = raw.trim().toLowerCase()
    if (cmd === 'clear') return setLines([])

    let out
    const open = cmd.match(/^open (\d+)$/)
    if (open) {
      const p = PROJECTS[Number(open[1]) - 1]
      out = p ? [`${p.name}: ${p.description}`, `→ ${p.link}`] : ['no such project']
    } else if (cmd.startsWith('sudo')) {
      out = COMMANDS.sudo()
    } else {
      out = COMMANDS[cmd]?.() ?? [`command not found: ${cmd}`]
    }
    setLines((l) => [...l, `sj@apartment:~$ ${raw}`, ...out])
  }

  return (
    <div ref={boxRef} className="terminal" onClick={focusInput}>
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (input.trim()) run(input)
          setInput('')
        }}
      >
        <span>sj@apartment:~$ </span>
        <input
          ref={inputRef}
          autoComplete="off"
          spellCheck={false}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Terminal input"
        />
      </form>
    </div>
  )
}
