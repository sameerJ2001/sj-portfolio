import { ARCADE_GAMES } from './content'

// Two-level cutaway cube, 8 x 8 footprint. x: -4 (left wall) → 4, z: -4 (back wall) → 4, y is up.
// The ground floor is y = 0. Like the reference, the upper floor (y = UP) is TWO separate platforms:
//   - the DESK DECK: a slab along the front-left of the room, framed in teal pipes, holding the PC
//   - the BACK DECK: a slab along the whole back wall, holding the arcades, photo wall, bed and AC
// with a gap between them, joined only by a short BRIDGE along the left wall. The long stair comes
// up the right side of the room to the back deck. The front-right is open double height (piano).
// SJ sits at the gold PC on the desk deck. Clicking an object flies the camera to it.
// "Screen" zones (the PC and the two arcades) fly the camera straight at the glass instead, and the
// screen becomes usable: SJ-OS on the PC, a game on each arcade.
//
// Floor plan (looking down, back wall at the top, left wall on the left):
//
//   UPPER FLOOR (y = 3)                         GROUND FLOOR (y = 0)
//   ┌───────────────────────────────────┐       ┌────────┬──────┬──────┬───────┬──────┐
//   │arcades photos  lamp bed (window) AC│       │ slats  │ wall │ easel│ alcove│boiler│
//   │ BACK DECK          ═olive rail═ ║  │       │  ┌bar──┐                       ║     │
//   ├─bridge─┬───── gap ─────┐        ║  │       │SJ└stools                 piano ║     │
//   │ fans   │               │  open  ║  │       │fridge  │                     ║     │
//   │ PC SJ  │   DESK DECK   │        ║  │       │kitchen │  crates (gear)      ║     │
//   │ shelf  │   (teal pipes)│  stairs║  │       │        │                  crates   │
//   └────────┴───────────────┴────────╨──┘       └────────┴──────────────────────────┘

export const UP = 3.0
export const WALL_H = 6.2
// The upper floor's slabs: x0 → x1, z0 → z1
export const DESK_DECK = { x0: -4, x1: -1.3, z0: -0.4, z1: 4 }
export const BACK_DECK = { x0: -4, x1: 4, z0: -4, z1: -1.1 }
export const BRIDGE = { x0: -4, x1: -2.4, z0: BACK_DECK.z1, z1: DESK_DECK.z0 }

// place:  where the furniture sits [x, y, z, rotationY]
// focus:  the point the camera looks at when zoomed in
// zoom:   how far the camera sits back (same angle as the overview)
// offset: optional custom camera offset [dx, dy, dz] — used under the decks so they don't block the view
// screen: { local, tilt, size } — a usable screen, in the furniture's own space: centre of the glass,
//         its tilt (rotation-x) and [width, height]. The camera frames it head-on; focus defaults to it.
export const ZONES = [
  // ---- upper floor ----
  {
    id: 'pc',
    label: 'Battle station',
    blurb: 'SJ-OS: projects, terminal, about',
    main: true,
    // Desk against the left wall under the bookshelf, CRT facing into the room
    place: [-3.05, UP, 1.2, Math.PI / 2],
    screen: { local: [0, 1.09, -0.296], size: [0.507, 0.38] },
  },
  {
    id: 'arcade-blue',
    label: `Arcade: ${ARCADE_GAMES['arcade-blue'].title}`,
    blurb: 'Insert coin',
    place: [-3.52, UP, -1.95, Math.PI / 2],
    cabinet: { body: '#2a63d6', glow: '#5ee7ff' },
    screen: { local: [0, 1.385, 0.388], tilt: -0.231, size: [0.56, 0.42] },
  },
  {
    id: 'arcade-red',
    label: `Arcade: ${ARCADE_GAMES['arcade-red'].title}`,
    blurb: 'Insert coin',
    place: [-3.52, UP, -2.95, Math.PI / 2],
    cabinet: { body: '#c9302c', glow: '#ff8a6b' },
    screen: { local: [0, 1.385, 0.388], tilt: -0.231, size: [0.56, 0.42] },
  },
  {
    id: 'window',
    label: 'City window',
    blurb: 'About me + contact',
    place: [1.2, UP, -3.98, 0],
    focus: [1.2, UP + 1.55, -3.9],
    offset: [0.7, 0.45, 5.6],
  },
  {
    id: 'journal',
    label: 'Bedside journal',
    blurb: 'Journal entries',
    // Bed lengthways under the window, bedside table at the head (left) end
    place: [1.2, UP, -3.1, 0],
    focus: [-0.3, UP + 0.7, -3.4],
    offset: [1.4, 1.8, 3.0],
  },
  // ---- ground floor ----
  {
    id: 'kitchen',
    label: 'Kitchen',
    blurb: 'Sydney eat-out map & recipes',
    // Along the left wall under the desk wing: sink + washer at the front, fridge behind
    place: [-3.6, 0, 2.3, Math.PI / 2],
    focus: [-3.4, 1.1, 2.2],
    offset: [4.4, 0.8, 1.6],
  },
  {
    id: 'photos',
    label: 'Photo wall',
    blurb: 'Street & travel photography',
    // Upstairs on the back wall, between the arcades and the window, under the ceiling fan
    place: [-1.85, UP, -3.98, 0],
    focus: [-1.85, UP + 1.45, -3.9],
    offset: [0.35, 0.35, 3.4],
  },
  {
    id: 'easel',
    label: 'Art corner',
    blurb: 'My paintings',
    // SJ's art corner under the back deck (paint cart, canvases, splashes all around it in Decor.jsx),
    // angled toward the camera
    place: [-0.45, 0, -2.75, 0.55],
    focus: [-0.4, 1.15, -2.7],
    offset: [1.7, 0.5, 2.8],
  },
  {
    id: 'piano',
    label: 'Grand piano',
    blurb: 'Playing something for you',
    // Open front-right of the room, beside the stairs (where the reference has the little table),
    // lid opening toward the camera
    place: [1.6, 0, 1.4, -Math.PI / 4],
    focus: [1.6, 1.0, 1.4],
    zoom: 3.9,
  },
  {
    id: 'gear',
    label: 'Gear crates',
    blurb: 'Gym, tennis & surfing',
    // Storage crates out on the floor, left of the foot of the stairs
    place: [-1.2, 0, 2.75, 0],
    focus: [-1.2, 0.8, 2.75],
    offset: [2.3, 1.7, 2.6],
  },
]

// Furniture space → world space for a zone's place [x, y, z, rotationY]
const rotY = ([x, y, z], a) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)]
const toWorld = ([px, py, pz, rot], local) => rotY(local, rot).map((v, i) => v + [px, py, pz][i])

// Work out each screen's world centre + facing direction once
for (const zone of ZONES) {
  if (!zone.screen) continue
  const { local, tilt = 0 } = zone.screen
  zone.screen.center = toWorld(zone.place, local)
  zone.screen.normal = rotY([0, -Math.sin(tilt), Math.cos(tilt)], zone.place[3])
  zone.focus ??= zone.screen.center
}

export const zoneById = (id) => ZONES.find((z) => z.id === id)

// The window opening in the back wall, in the 'window' zone's space: width, height, centre height,
// and how much the corners are cut off (the chunky chamfered frame). Room.jsx cuts the wall around it.
export const WINDOW = { w: 3.4, h: 1.45, cy: 1.68, chamfer: 0.34 }

// SJ's chair (world position + facing), worked out from the PC's place so they always match.
// CHAIR_OFFSET is how far in front of the desk origin the chair sits inside BattleStation.
const CHAIR_OFFSET = 0.55
const [pcX, pcY, pcZ, pcRot] = zoneById('pc').place
export const SEAT = {
  position: [pcX + CHAIR_OFFSET * Math.sin(pcRot), pcY, pcZ + CHAIR_OFFSET * Math.cos(pcRot)],
  facing: pcRot + Math.PI,
}

// One long straight stair up the right side of the room to the back deck's front edge:
// x centre, width, top z, bottom z
export const STAIRS = { x: 3.3, width: 0.85, topZ: BACK_DECK.z1, bottomZ: 3.6 }

export const HOME_CAMERA = { position: [13, 9.8, 13], target: [0, 2.6, 0] }

// How much of the viewport a screen fills when you're at it. Must match the Canvas camera fov (30°).
const SCREEN_FILL = 0.84
const TAN_HALF_FOV = Math.tan((15 * Math.PI) / 180)

export const zoneCamera = (zone, aspect = 16 / 9) => {
  if (zone.screen) {
    const { center, normal, size } = zone.screen
    const d = Math.max(size[1] / 2 / TAN_HALF_FOV, size[0] / 2 / (TAN_HALF_FOV * aspect)) / SCREEN_FILL
    return { target: center, position: center.map((c, i) => c + normal[i] * d) }
  }
  const [x, y, z] = zone.focus
  const [dx, dy, dz] = zone.offset ?? [zone.zoom, zone.zoom * 0.85, zone.zoom]
  return { target: zone.focus, position: [x + dx, y + dy, z + dz] }
}
