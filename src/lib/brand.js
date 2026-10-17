// The SJ shield monogram (Sameer Jawad / SJ Inc.), drawn as two thick square-cornered strokes on a
// 100 × 182 grid with a gap down the middle and a pointed bottom:
//   S: tail up the lower left → the point → up beside the gap → middle bar → upper-left column → top bar
//   J: top bar → right column down into the point → hook up beside the gap
// Used by SJ-OS (SjLogo.jsx), the CRT bezel badge, and the favicon (public/favicon.svg).
export const SJ_LOGO = {
  viewBox: [0, 0, 100, 182],
  paths: ['M6 100V140L42 168V84H6V6H47', 'M53 6H94V140L58 168V100'],
  stroke: 11,
}

// Draw the monogram onto a 2D canvas: top-left at (x, y), `height` pixels tall
export function drawSjLogo(g, x, y, height, color) {
  const s = height / SJ_LOGO.viewBox[3]
  g.save()
  g.translate(x, y)
  g.scale(s, s)
  g.strokeStyle = color
  g.lineWidth = SJ_LOGO.stroke
  g.lineJoin = 'miter'
  g.miterLimit = 4
  for (const d of SJ_LOGO.paths) g.stroke(new Path2D(d))
  g.restore()
}
