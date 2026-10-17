// All the real content lives here. Replace the placeholders with your own stuff.

export const PROJECTS = [
  {
    name: 'Offline AI assistant',
    stack: 'python, llms, self-hosted',
    description: 'A fully offline GPT-style assistant that runs on local hardware.',
    link: 'https://github.com/your-handle/offline-ai',
  },
  {
    name: 'Honours thesis',
    stack: 'security, research',
    description: 'Cybersecurity honours research at UTS.',
    link: 'https://github.com/your-handle/thesis',
  },
  {
    name: 'This portfolio',
    stack: 'react, three.js, gsap',
    description: 'The apartment you are standing in.',
    link: 'https://github.com/your-handle/sj-portfolio',
  },
]

// Drop images into /public/photos and list them here.
export const PHOTOS = [
  { src: '', caption: 'Street — placeholder' },
  { src: '', caption: 'Travel — placeholder' },
  { src: '', caption: 'Night — placeholder' },
  { src: '', caption: 'People — placeholder' },
  { src: '', caption: 'Beach — placeholder' },
  { src: '', caption: 'City — placeholder' },
]

export const ABOUT = {
  intro:
    "Hey, I'm SJ. I build things, break things (ethically), and take photos of Sydney. Cybersecurity + AI/ML honours grad from UTS.",
  links: [
    { label: 'GitHub', href: 'https://github.com/your-handle' },
    { label: 'LinkedIn', href: 'https://linkedin.com/in/your-handle' },
    { label: 'Email', href: 'mailto:you@example.com' },
  ],
}

// "My Showcase": the little homepage that opens on SJ-OS (the PC) — name, tagline and the pages
// behind its ABOUT / EXPERIENCE / PROJECTS / CONTACT links (projects + contact come from above).
export const SHOWCASE = { name: 'Sameer Jawad', tagline: 'Cybersecurity + AI/ML', year: 2026 }

export const EXPERIENCE = [
  { role: 'Role title — placeholder', org: 'Company', dates: '2025 – now', points: ['What you built or broke (ethically).'] },
  { role: 'Honours research', org: 'UTS', dates: '2024 – 2025', points: ['Cybersecurity honours thesis — placeholder.'] },
]

// What each zone will hold later — shown as "coming soon" for now.
export const COMING_SOON = {
  easel: ['Gallery of my paintings', 'Paint-splatter transitions'],
  kitchen: ['Fridge with Sydney eat-out map', 'Favourite spots + go-to recipes'],
  gear: ['Gym: split + PRs', 'Tennis rally mini-game', 'Surf spots + photos'],
  journal: ['Page-flip journal', 'Entries written in MDX'],
}

// The two arcade cabinets upstairs. `src` is any page to load on the cabinet's screen.
// Same-origin pages in /public work best (keyboard focus + ESC to step back). The defaults are tiny
// placeholder games in /public/arcade — point these at DOOM (e.g. a js-dos page) or anything else later.
export const ARCADE_GAMES = {
  'arcade-blue': { title: 'Breakout', src: '/arcade/breakout.html' },
  'arcade-red': { title: 'Snake', src: '/arcade/snake.html' },
}
