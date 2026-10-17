// The SJ shield monogram (Sameer Jawad / SJ Inc.), measured off the original artwork: a 343 × 672
// grid, strokes ~46 thick, a 48-wide gap down the middle, both letters ending in a ~31° point.
//   S: top bar with a short leg down on its right, left column to the middle bar, right column from
//      the middle bar down to the point, and a tail up the lower left joined by the bottom diagonal.
//   J: top bar with a short leg down on its left, full-height right column into the bottom diagonal,
//      and a hook column beside the gap from the middle down to the point.
// All shapes are clockwise and filled. Used by SJ-OS (SjLogo.jsx), the CRT bezel badge and the
// favicon (public/favicon.svg).
const SHAPES = [
  // S
  [[0, 0], [148, 0], [148, 45], [0, 45]],
  [[103, 0], [148, 0], [148, 200], [103, 200]],
  [[0, 0], [48, 0], [48, 292], [0, 292]],
  [[0, 245], [148, 245], [148, 292], [0, 292]],
  [[103, 245], [148, 245], [148, 672], [103, 644.6]],
  [[0, 335], [48, 335], [48, 556], [103, 590], [103, 644.6], [0, 582]],
  // J
  [[196, 0], [343, 0], [343, 45], [196, 45]],
  [[196, 0], [243, 0], [243, 200], [196, 200]],
  [[298, 0], [343, 0], [343, 582], [243, 642.8], [243, 587.8], [298, 554.4]],
  [[196, 245], [243, 245], [243, 642.8], [196, 672]],
]

export const SJ_LOGO = {
  viewBox: [0, 0, 343, 672],
  path: SHAPES.map((pts) => 'M' + pts.map((p) => p.join(' ')).join('L') + 'Z').join(''),
}

// Draw the monogram onto a 2D canvas: top-left at (x, y), `height` pixels tall
export function drawSjLogo(g, x, y, height, color) {
  const s = height / SJ_LOGO.viewBox[3]
  g.save()
  g.translate(x, y)
  g.scale(s, s)
  g.fillStyle = color
  g.fill(new Path2D(SJ_LOGO.path))
  g.restore()
}
