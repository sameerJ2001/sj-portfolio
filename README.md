# SJ's Loft — portfolio

A two-level cyberpunk cutaway room. SJ sits at the PC on the upper floor, always working
(typing, mouse, glancing, sipping coffee, stretching). Click anything and the camera flies to it.
Click the PC and you sit down at a real, usable retro desktop (SJ-OS) on its CRT; click an arcade
cabinet and its game plays right on the cabinet screen.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build -> dist/
```

## Where things live

| File | What it does |
|---|---|
| `src/data/zones.js` | **Start here.** Floor plan of both levels, deck height, every zone's position (`place`), camera shot (`focus`, `zoom`/`offset`), stairs, door, overview camera. SJ's seat is worked out from the PC's position. |
| `src/data/content.js` | Your real content: projects, photos, about/contact links. |
| `src/components/furniture/Room.jsx` | The cube: floors, walls (window opening), the two upper platforms (desk deck hung on teal pipework, back deck, bridge), the olive bed railing, the block stairs. |
| `src/components/furniture/*.jsx` | One file per piece: `BattleStation` (desk + retro CRTs), `Arcade` (both cabinets), `GrandPiano`, `Window` (rainy city), `Bed`, `Kitchen`, `PhotoWall`, `Easel`, `GearCorner`, plus `Decor` (non-clickable props). |
| `src/components/os/` | SJ-OS, the desktop on the PC screen: `Desktop.jsx` (apps, windows, taskbar, start menu), `Icon.jsx`, `os.css`. |
| `src/components/ScreenHtml.jsx` | Mounts real DOM (SJ-OS, game iframes) onto a 3D screen. |
| `src/lib/screens.js` | Animated idle screens: the green terminal on the CRT, arcade attract mode. |
| `src/lib/environment.js` | Live Sydney time + weather (Open-Meteo), sunrise/sunset, sky colours, sun/moon, rain/snow/fog/storm. |
| `src/lib/outside.js` | Textures for the view outside: skyline, clouds, stars, lightning. |
| `src/components/furniture/materials.js` | Industrial palette + generated textures (speckled concrete, riveted wall panels, brick, the katakana neon sign, paintings). |
| `src/components/furniture/Pipe.jsx` | Bent pipe with rounded corners, clamp bands and flanges: the desk deck's pipe frame and the bed railing are built from it. |
| `src/components/Character.jsx` | SJ-3PO, the gold protocol droid at the PC. Edit `SEQUENCE` to change his loop of little animations; he swivels round and waves when someone enters (`WAVE`). |
| `src/components/Scene.jsx` | Lights, glow (bloom), hover outline, and which furniture goes in which zone. |
| `src/components/CameraRig.jsx` | Intro swoop + fly-to-zone camera (GSAP). |
| `src/components/Panel.jsx` | Side panel content per zone (screen zones have none). |
| `src/components/Terminal.jsx` | Fake shell, opened from SJ-OS. Add commands in `COMMANDS`. |
| `public/arcade/` | Placeholder cabinet games (`breakout.html`, `snake.html`). |
| `src/lib/pianoAudio.js` | The piano loop (Web Audio, no files). |

## Screens: SJ-OS and the arcades

Zones with a `screen` in `zones.js` (the PC and both arcades) don't open the side panel. The camera
flies straight at the glass and fills the view with it, and the screen becomes usable.

- **Add an SJ-OS app:** write a component in `src/components/os/Desktop.jsx`, add it to `APPS`, and add
  its id to `DESKTOP_ICONS` / `START_ITEMS`.
- **Change an arcade game:** set `src` in `ARCADE_GAMES` in `src/data/content.js`. Any web page works.
  For keyboard focus and ESC-to-leave, host it in `public/` (same origin). For DOOM: build a page with
  [js-dos](https://js-dos.com) and the shareware `DOOM1.WAD` (freely redistributable), put it in
  `public/arcade/doom/`, and point `src` at `/arcade/doom/index.html`.
- If you move a screen in Blender, update its `screen.local` / `size` in `zones.js` so the camera and the
  live DOM still line up with the glass.

## Outside: live Sydney time + weather

The window looks out on a snowy winter forest (like the reference video) with a faint city skyline
behind it, and it's live:

- **Time** is the real time in Sydney (`Australia/Sydney`), and the sun rises and sets at Sydney's real
  sunrise and sunset for today, so dawn, day, dusk and night happen when they do in Sydney.
- **Weather** is Sydney's current weather from [Open-Meteo](https://open-meteo.com) (free, no API key),
  refreshed every 15 minutes: clear, partly cloudy, cloudy, rain, storm (with lightning), fog, and snow
  if Sydney ever gets any. Snow settles on the branches and ground and melts after.
- If the weather can't be fetched (offline, blocked), it falls back to changing by itself every minute
  or so.
- The HUD button shows it (`syd 1:58 am · rain`). Click it to preview another weather for 3 minutes.

Sun or moonlight comes in through the window and the shutter slats cast striped shadows. The shutter
raises, lowers and tilts on its own (mostly open by day, mostly closed at night; tweak `MOVES` in
`Window.jsx`). The location, refresh rate and weather mapping are at the top of `src/lib/environment.js`.

In the browser console (dev only):

```js
__env.set({ weather: 'snow' })                   // preview a weather for a few minutes
__env.set({ time: 0.5 })                         // leave live time and jump to noon (time then runs fast)
__env.set({ live: true })                        // back to live Sydney time + weather
__env.set({ shutter: { open: 1, tilt: 0 } })     // hold the shutter; { shutter: null } lets it move again
```

The ceiling fan (`CeilingFan.jsx`) turns slowly with its bulb on top of the hub, above the blades
(like the video), and that light casts shadows: as the blades turn, their shadows sweep around the
room, over the photo wall and arcades, and every few seconds right across SJ at the desk.

## Swapping in your own Blender models

Each furniture file is just a placeholder built from boxes. To replace one:

1. Model it in Blender around the origin (0, 0, 0), floor at y = 0, front facing +Z.
2. Export **glTF 2.0 (.glb)** to `public/models/desk.glb` (for example).
3. Replace the contents of that furniture file with:

```jsx
import { useGLTF } from '@react-three/drei'
export default function BattleStation() {
  const { scene } = useGLTF('/models/desk.glb')
  return <primitive object={scene} />
}
```

Its position, click handling, hover outline and camera shot all keep working, because those come from
`zones.js`. If your chair sits a different distance in front of the desk, update `CHAIR_OFFSET` in `zones.js`
so SJ still sits in it.

## Next steps

1. Fill in `content.js` (projects, links, photos in `public/photos/`)
2. Model pieces in Blender one at a time and swap them in
3. Put real games in the arcades (see above)
4. Build out journal / easel / kitchen / gear panels
5. Mobile layout + recruiter mode, then deploy on Vercel
