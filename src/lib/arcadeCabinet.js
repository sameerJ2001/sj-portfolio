import { Color } from 'three'
import { GLYPHS, VoxelGrid } from './voxels.js'

// The arcade cabinet as voxels (2 cm), built to the reference: a stepped crown over a sign with "SJ"
// and two light bars, a hood with a light strip over a tilted screen recess, a control deck with two
// LED pods, joysticks and an "88" panel, controller cables looping down over an inset lower panel,
// and side panels with a dark outline. buildCabinet() returns the filled grid and its palette:
// Arcade.jsx meshes it; voxel/export-arcade.mjs writes it out as a MagicaVoxel .vox to remodel.
// Local metres: x across (centred), y up from the floor, z toward the front (back face at -0.375).
// Size: 0.86 wide × 2.25 tall × 1.0 deep (43 × 113 × 50 voxels).
export const V = 0.02 // voxel size
const HALF_W = 0.43 // outer half-width, side panels included
const BODY = 0.385 // half-width between the side panels

// Side silhouettes as [z (front), y (up)]: body, and the side panels standing proud of it
const PROFILE = [
  [-0.375, 0], [0.34, 0], [0.34, 0.8], [0.6, 0.85], [0.6, 0.99], [0.47, 1.07], [0.44, 1.13],
  [0.32, 1.64], [0.5, 1.66], [0.5, 1.95], [-0.375, 1.95],
]
const SIDE = [
  [-0.375, 0], [0.36, 0], [0.36, 0.8], [0.62, 0.85], [0.62, 1.0], [0.48, 1.08], [0.45, 1.13],
  [0.33, 1.64], [0.52, 1.66], [0.52, 1.97], [-0.375, 1.97],
]
const MINI_8 = ['###', '#.#', '###', '#.#', '###']

// palette slots
const [BODY_C, SIDE_C, DARK, EDGE, DECK, CABLE, BEZEL, SIGN, POD, STICK, INSET, BALL] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const [WHITE, ACCENT, DIM] = [20, 21, 22]

export function buildCabinet({ body, glow }, screen) {
  const g = new VoxelGrid({ size: V, min: [-HALF_W, 0, -0.38], max: [HALF_W, 2.28, 0.64] })
  const box = (x, y, z, c) => g.box(x, y, z, c)
  const sym = (x0, x1) => [[x0, x1], [-x1, -x0]]

  // shell: body between the side panels, slightly bigger side panels either side
  g.profile(PROFILE, [-BODY, BODY], BODY_C)
  for (const x of sym(BODY + 0.005, HALF_W)) g.profile(SIDE, x, SIDE_C)
  // dark outline round the outer face of each side panel
  for (const i of [0, g.n[0] - 1])
    for (let j = 0; j < g.n[1]; j++)
      for (let k = 0; k < g.n[2]; k++)
        if (g.get(i, j, k) === SIDE_C && (!g.get(i, j + 1, k) || !g.get(i, j - 1, k) || !g.get(i, j, k + 1) || !g.get(i, j, k - 1)))
          g.put(i, j, k, EDGE)

  // recessed kick plate
  g.paint([-BODY, BODY], [0, 0.08], [0.3, 0.36], 0)
  g.paint([-BODY, BODY], [0, 0.08], [0.28, 0.3], DARK)
  // inset lower panel with chamfered top corners and two vertical grooves
  const inset = (i, j) => {
    const [x, y] = g.centre(i, j, 0)
    return y >= 0.12 && y <= 0.74 && Math.abs(x) <= 0.31 - Math.max(0, y - 0.66)
  }
  g.paint([-BODY, BODY], [0, 0.8], [0.32, 0.34], 0, inset)
  g.paint([-BODY, BODY], [0, 0.8], [0.3, 0.32], INSET, inset)
  for (const x of [-0.12, 0.12]) {
    g.paint([x - 0.005, x + 0.005], [0.14, 0.7], [0.3, 0.32], 0)
    g.paint([x - 0.005, x + 0.005], [0.14, 0.7], [0.28, 0.3], DARK)
  }

  // control deck: lit top surface, glowing lip, two LED pods with sticks, the "88" panel
  g.each([-BODY, BODY], [0.84, 1.14], [0.42, 0.62], (i, j, k) => g.get(i, j, k) && !g.get(i, j + 1, k) && g.put(i, j, k, DECK))
  box([-BODY, BODY], [0.86, 0.88], [0.58, 0.6], ACCENT)
  for (const s of [-1, 1]) {
    const cx = s * 0.26
    box([cx - 0.12, cx + 0.12], [0.97, 1.11], [0.46, 0.6], POD)
    box([cx - 0.12, cx + 0.12], [1.1, 1.12], [0.46, 0.6], DECK)
    for (const dx of [-0.03, 0.03]) g.point(cx + dx, 1.08, 0.59, WHITE)
    box([cx + s * 0.04 - 0.005, cx + s * 0.04 + 0.005], [1.12, 1.18], [0.51, 0.53], STICK)
    box([cx + s * 0.04 - 0.02, cx + s * 0.04 + 0.02], [1.18, 1.22], [0.5, 0.54], BALL)
  }
  box([-0.12, 0.12], [0.88, 0.98], [0.58, 0.6], DARK)
  MINI_8.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (ch !== '#') return
      for (const x0 of [-0.08, 0.02]) g.point(x0 + c * V, 0.97 - r * V, 0.59, DIM)
    }),
  )

  // controller cables: drop from each pod, sag down in front of the lower panel, back up into it
  const cable = (a, b, c) => {
    for (let t = 0; t <= 1; t += 0.002) {
      const p = [0, 1, 2].map((n) => (1 - t) * (1 - t) * a[n] + 2 * (1 - t) * t * b[n] + t * t * c[n])
      const [i, j, k] = g.at(...p)
      if (!g.get(i, j, k)) g.put(i, j, k, CABLE)
    }
  }
  cable([-0.24, 0.85, 0.57], [-0.2, 0.2, 0.37], [-0.03, 0.8, 0.35])
  cable([0.27, 0.85, 0.57], [0.22, 0.3, 0.37], [0.06, 0.78, 0.35])

  // screen: carve everything in front of the tilted glass, dark bezel behind it
  const [, sy, sz] = screen.local
  const [sw, sh] = screen.size
  const slope = Math.tan(-screen.tilt)
  const planeZ = (y) => sz - (y - sy) * slope
  const half = (sh / 2) * Math.cos(screen.tilt)
  const m = 0.03
  g.each([-sw / 2 - m, sw / 2 + m], [sy - half - m, sy + half + m], [0, 0.64], (i, j, k) => {
    const [, y, z] = g.centre(i, j, k)
    if (z + V / 2 > planeZ(y) - 0.004) g.put(i, j, k, 0)
    else if (z > planeZ(y) - 0.07 && g.get(i, j, k)) g.put(i, j, k, BEZEL)
  })
  // light strip under the hood, washing down over the screen
  g.each([-0.3, 0.3], [1.64, 1.68], [0.33, 0.5], (i, j, k) => g.get(i, j, k) && !g.get(i, j - 1, k) && g.put(i, j, k, ACCENT))

  // sign on top of the hood: framed front, "SJ" and two light bars in white, stepped crown
  box([-0.33, 0.33], [1.95, 2.13], [0.2, 0.48], SIGN)
  box([-0.33, 0.33], [1.95, 2.13], [0.46, 0.48], BODY_C)
  box([-0.31, 0.31], [1.97, 2.11], [0.46, 0.48], SIGN)
  ;['S', 'J'].forEach((ch, n) =>
    GLYPHS[ch].forEach((row, r) =>
      [...row].forEach((px, c) => {
        if (px !== '#') return
        for (const z of [0.47, 0.49]) g.point(-0.1 + n * 0.12 + c * V, 2.09 - r * V, z, WHITE)
      }),
    ),
  )
  for (const x of [-0.28, 0.28]) box([x - 0.005, x + 0.005], [1.99, 2.09], [0.46, 0.5], WHITE)
  box([-0.14, 0.14], [2.14, 2.19], [0.24, 0.44], SIGN)
  for (const x of sym(0.06, 0.14)) box(x, [2.2, 2.25], [0.28, 0.42], SIGN)

  const b = new Color(body)
  const shade = (f) => '#' + b.clone().multiplyScalar(f).getHexString()
  const lit = '#' + b.clone().lerp(new Color(glow), 0.45).multiplyScalar(1.15).getHexString()
  const palette = {
    [BODY_C]: { color: body },
    [SIDE_C]: { color: shade(0.86) },
    [EDGE]: { color: shade(0.5) },
    [DARK]: { color: shade(0.32) },
    [DECK]: { color: lit },
    [CABLE]: { color: '#0b0b0e', jitter: 0.15 },
    [BEZEL]: { color: '#07080c', jitter: 0.2 },
    [SIGN]: { color: shade(0.62) },
    [POD]: { color: shade(0.9) },
    [STICK]: { color: '#2b2b30' },
    [INSET]: { color: shade(0.78) },
    [BALL]: { color: glow },
    [WHITE]: { color: '#ffffff', glow: true, jitter: 0.04 },
    [ACCENT]: { color: glow, glow: true, jitter: 0.06 },
    [DIM]: { color: shade(1.6), glow: true },
  }
  return { grid: g, palette }
}

