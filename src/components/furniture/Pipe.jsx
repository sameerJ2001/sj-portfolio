import { useMemo } from 'react'
import { CurvePath, LineCurve3, QuadraticBezierCurve3, Quaternion, TubeGeometry, Vector3 } from 'three'

// A bent metal pipe through a list of [x, y, z] points, with rounded bends at every corner,
// optional clamp bands along the straight runs and flanges at the ends. Used for the industrial
// pipework: the desk deck's frame and railing, the bed railing, etc.
const Z = new Vector3(0, 0, 1)

function pipePath(points, bend) {
  const v = points.map((p) => new Vector3(...p))
  const path = new CurvePath()
  let start = v[0]
  for (let i = 1; i < v.length - 1; i++) {
    const [a, b, c] = [v[i - 1], v[i], v[i + 1]]
    const r = Math.min(bend, a.distanceTo(b) / 2, b.distanceTo(c) / 2)
    const p1 = b.clone().add(a.clone().sub(b).setLength(r))
    const p2 = b.clone().add(c.clone().sub(b).setLength(r))
    path.add(new LineCurve3(start, p1))
    path.add(new QuadraticBezierCurve3(p1, b, p2))
    start = p2
  }
  path.add(new LineCurve3(start, v[v.length - 1]))
  return { path, v }
}

// Rings placed along each straight run, `every` metres apart, facing along the pipe
function ringsAlong(v, every, inset) {
  const out = []
  for (let i = 0; i < v.length - 1; i++) {
    const dir = v[i + 1].clone().sub(v[i])
    const len = dir.length()
    const n = Math.floor((len - 2 * inset) / every)
    if (n < 1) continue
    dir.normalize()
    const q = new Quaternion().setFromUnitVectors(Z, dir)
    for (let k = 0; k <= n; k++) {
      const d = inset + ((len - 2 * inset) * k) / n
      out.push({ p: v[i].clone().addScaledVector(dir, d), q })
    }
  }
  return out
}

export default function Pipe({ points, radius = 0.035, bend = 0.14, color, clampEvery = 0, flanges = true, castShadow = true }) {
  const key = JSON.stringify(points)
  const { geo, clamps, ends } = useMemo(() => {
    const { path, v } = pipePath(points, bend)
    const geo = new TubeGeometry(path, Math.max(12, Math.ceil(path.getLength() * 28)), radius, 10, false)
    const clamps = clampEvery ? ringsAlong(v, clampEvery, bend + 0.12) : []
    const dirAt = (a, b) => b.clone().sub(a).normalize()
    const ends = [
      { p: v[0], q: new Quaternion().setFromUnitVectors(Z, dirAt(v[1], v[0])) },
      { p: v[v.length - 1], q: new Quaternion().setFromUnitVectors(Z, dirAt(v[v.length - 2], v[v.length - 1])) },
    ]
    return { geo, clamps, ends }
  }, [key, radius, bend, clampEvery]) // eslint-disable-line react-hooks/exhaustive-deps

  const mat = <meshStandardMaterial color={color} metalness={0.55} roughness={0.38} />
  return (
    <group>
      <mesh geometry={geo} castShadow={castShadow} receiveShadow>
        {mat}
      </mesh>
      {clamps.map(({ p, q }, i) => (
        <group key={i} position={p} quaternion={q}>
          <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[radius * 1.45, radius * 1.45, 0.05, 12]} />
            <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
          </mesh>
        </group>
      ))}
      {flanges &&
        ends.map(({ p, q }, i) => (
          <group key={`f${i}`} position={p} quaternion={q}>
            <mesh rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[radius * 1.8, radius * 1.8, 0.035, 12]} />
              {mat}
            </mesh>
          </group>
        ))}
    </group>
  )
}
