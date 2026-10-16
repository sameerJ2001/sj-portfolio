import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, ExtrudeGeometry, LatheGeometry, MathUtils, Path, Shape, ShapeGeometry, SRGBColorSpace, Vector2 } from 'three'
import { useStore } from '../../store'
import { playPiano } from '../../lib/pianoAudio'
import { C, K } from './materials'
import RBox from './RBox'

// Shigeru Kawai concert grand, self-playing: when the camera zooms in it plays a loop, the right
// keys go down and little notes float up.
// Polished ebony case in the real grand shape (straight bass side, curved treble bentside, rounded
// tail) with the lid propped open on its stick, showing the gold-bronze iron plate, strings
// (copper-wound bass crossing over the treble), tuning pins and dampers. 88 keys (52 white, 36 black),
// key slip, cheek blocks, a nameboard with gold lettering, a music desk, tapered round legs with brass
// caster cups, and a lyre with three gold pedals. Local: keyboard at +z, tail at -z, bass on the left.
const WHITE_KEYS = 52
const KEY_W = 0.0235
const KEYS_X0 = (-WHITE_KEYS * KEY_W) / 2 + KEY_W / 2
const HAS_SHARP = [1, 0, 1, 1, 0, 1, 1] // from A: A#, -, C#, D#, -, F#, G#
const PC_TO_WHITE = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6] // C..B → white key within the octave
const whiteIndex = (midi) => MathUtils.clamp(Math.floor(midi / 12) * 7 + PC_TO_WHITE[midi % 12] - 12, 0, WHITE_KEYS - 1)

const CASE_BOTTOM = 0.63
const CASE_TOP = 0.9
const RIM = 0.035 // how far the rim stands above the plate
const KEY_TOP = 0.745

const ebony = { ...K.lacquer('#070709'), roughness: 0.12, clearcoatRoughness: 0.03, envMapIntensity: 2.2 }
const gold = { color: '#c9a24a', metalness: 1, roughness: 0.28 }

// Case outline in (x, -z): front edge at z = 0.55, tail at z = -1.05
function outline(frontZ = 0.55) {
  const s = new Shape()
  s.moveTo(-0.74, -frontZ)
  s.lineTo(0.74, -frontZ)
  s.lineTo(0.74, -0.3)
  s.bezierCurveTo(0.74, 0.05, 0.3, 0.1, 0.24, 0.45)
  s.bezierCurveTo(0.18, 0.85, 0.02, 1.05, -0.3, 1.05)
  s.quadraticCurveTo(-0.74, 1.05, -0.74, 0.7)
  s.lineTo(-0.74, -frontZ)
  return s
}
// The same outline shrunk toward its middle (for the rim's inside edge and the plate)
function inset(f) {
  const pts = outline().getPoints(48)
  const p = new Path()
  pts.forEach(({ x, y }, i) => {
    const px = x * f - 0.01
    const py = (y - 0.25) * f + 0.25
    i ? p.lineTo(px, py) : p.moveTo(px, py)
  })
  return p
}
// shape coords (x, -z) extruded upward → world
const toWorld = (g, y0) => {
  g.rotateX(-Math.PI / 2)
  g.translate(0, y0, 0)
  return g
}

function canvas(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

// The iron plate seen from above: gold-bronze, struts, holes showing the spruce soundboard, the
// dampers, rows of tuning pins, overstrung strings and the maker's name. Bottom of the canvas = front.
function plateTexture() {
  return canvas(512, 560, (g, W, H) => {
    const grad = g.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, '#b8913e')
    grad.addColorStop(1, '#8f6c28')
    g.fillStyle = grad
    g.fillRect(0, 0, W, H)
    // holes through to the soundboard
    g.fillStyle = '#c9a46a'
    for (const [x, y, rx, ry, a] of [
      [0.3, 0.3, 0.13, 0.07, 0.5],
      [0.52, 0.42, 0.1, 0.06, 0.9],
      [0.2, 0.55, 0.09, 0.05, 0.2],
      [0.62, 0.24, 0.08, 0.05, 0.7],
    ]) {
      g.beginPath()
      g.ellipse(x * W, y * H, rx * W, ry * H, a, 0, Math.PI * 2)
      g.fill()
    }
    // struts
    g.strokeStyle = 'rgba(70,50,15,0.55)'
    g.lineWidth = 6
    for (const [x0, y0, x1, y1] of [
      [0.15, 0.8, 0.35, 0.05],
      [0.42, 0.8, 0.45, 0.15],
      [0.7, 0.8, 0.55, 0.3],
    ]) {
      g.beginPath()
      g.moveTo(x0 * W, y0 * H)
      g.lineTo(x1 * W, y1 * H)
      g.stroke()
    }
    // treble + tenor strings: silver, straight back, shorter to the right
    g.lineWidth = 1
    for (let i = 0; i < 70; i++) {
      const x = W * (0.4 + i * 0.0078)
      const len = H * (0.62 - i * 0.0068)
      g.strokeStyle = i % 3 ? 'rgba(225,228,232,0.85)' : 'rgba(170,175,180,0.85)'
      g.beginPath()
      g.moveTo(x, H * 0.84)
      g.lineTo(x + 6, H * 0.84 - len)
      g.stroke()
    }
    // bass strings: copper-wound, long, crossing diagonally over the tenor
    g.lineWidth = 2.2
    for (let i = 0; i < 22; i++) {
      g.strokeStyle = i % 2 ? '#b4683a' : '#9c5428'
      g.beginPath()
      g.moveTo(W * (0.05 + i * 0.012), H * 0.86)
      g.lineTo(W * (0.25 + i * 0.016), H * 0.06)
      g.stroke()
    }
    // dampers: black felt blocks across the front
    g.fillStyle = '#121214'
    for (let i = 0; i < 44; i++) g.fillRect(W * (0.07 + i * 0.019), H * 0.8, W * 0.014, H * 0.035)
    // tuning pins
    g.fillStyle = '#d9dde2'
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 60; i++) g.fillRect(W * (0.06 + i * 0.0145) + row * 3, H * (0.9 + row * 0.02), 3, 3)
    // maker's name in raised gold
    g.save()
    g.translate(W * 0.6, H * 0.58)
    g.rotate(-1.35)
    g.fillStyle = '#e8c86a'
    g.font = 'bold 22px Georgia, "Times New Roman", serif'
    g.textAlign = 'center'
    g.fillText('SHIGERU KAWAI', 0, 0)
    g.restore()
  })
}

function nameTexture() {
  return canvas(1024, 64, (g, W, H) => {
    g.fillStyle = '#070709'
    g.fillRect(0, 0, W, H)
    g.fillStyle = '#d9b45a'
    g.font = '600 30px Georgia, "Times New Roman", serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('S H I G E R U   K A W A I', W / 2, H / 2 + 1)
  })
}

// Tapered round leg with a ring detail, ending in a brass caster cup
function legGeometry() {
  const pts = [
    [0.0, 0.0],
    [0.04, 0.0],
    [0.04, 0.03],
    [0.046, 0.05],
    [0.052, 0.3],
    [0.06, 0.42],
    [0.066, 0.45],
    [0.06, 0.48],
    [0.062, 0.52],
    [0.074, 0.54],
    [0.074, 0.57],
    [0.0, 0.57],
  ].map(([r, y]) => new Vector2(r, y))
  return new LatheGeometry(pts, 32)
}

export default function GrandPiano() {
  const keys = useRef([])
  const pressed = useRef(new Float32Array(WHITE_KEYS))
  const notes = useRef([])
  const playing = useStore((s) => s.arrivedZone === 'piano')

  const geo = useMemo(() => {
    const caseShape = outline()
    const body = toWorld(
      new ExtrudeGeometry(caseShape, { depth: CASE_TOP - CASE_BOTTOM - 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, curveSegments: 40 }),
      CASE_BOTTOM + 0.01
    )
    const rimShape = outline()
    rimShape.holes.push(inset(0.94))
    const rim = toWorld(new ExtrudeGeometry(rimShape, { depth: RIM, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3, curveSegments: 40 }), CASE_TOP)
    const plateShape = new Shape(inset(0.945).getPoints())
    const plate = toWorld(new ShapeGeometry(plateShape, 40), CASE_TOP + 0.004)
    const lidShape = outline(0.33)
    const lid = new ExtrudeGeometry(lidShape, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2, curveSegments: 40 })
    lid.translate(0.74, 0, 0) // hinge on the left edge
    lid.rotateX(-Math.PI / 2)
    const plateTex = plateTexture()
    plateTex.repeat.set(1 / 1.48, 1 / 1.6)
    plateTex.offset.set(0.74 / 1.48, 0.55 / 1.6)
    return { body, rim, plate, lid, plateTex, name: nameTexture(), leg: legGeometry() }
  }, [])

  useEffect(() => {
    if (!playing) return
    let n = 0
    const stop = playPiano((midi) => {
      pressed.current[whiteIndex(midi)] = 1
      const note = notes.current[n++ % notes.current.length]
      if (note) note.userData.life = 1
    })
    return stop
  }, [playing])

  useFrame((_, dt) => {
    keys.current.forEach((k, i) => {
      if (!k) return
      pressed.current[i] = Math.max(0, pressed.current[i] - dt * 4)
      k.rotation.x = MathUtils.damp(k.rotation.x, pressed.current[i] * 0.07, 20, dt)
    })
    notes.current.forEach((m, i) => {
      if (!m) return
      const life = (m.userData.life = Math.max(0, (m.userData.life ?? 0) - dt * 0.6))
      m.visible = life > 0
      m.position.set(-0.4 + (i % 4) * 0.25 + Math.sin(life * 6 + i) * 0.08, 1.3 + (1 - life) * 1.3, 0.3)
      m.scale.setScalar(0.6 + life * 0.4)
    })
  })

  const ebonyMat = <meshPhysicalMaterial {...ebony} />
  const LID_ANGLE = 0.48
  const propX = 0.6
  const propH = (propX + 0.74) * Math.tan(LID_ANGLE)

  return (
    <group>
      {/* case, rim, iron plate with strings */}
      <mesh geometry={geo.body} castShadow receiveShadow>
        {ebonyMat}
      </mesh>
      <mesh geometry={geo.rim} castShadow>
        {ebonyMat}
      </mesh>
      <mesh geometry={geo.plate} receiveShadow>
        <meshPhysicalMaterial map={geo.plateTex} metalness={0.55} roughness={0.38} clearcoat={0.4} />
      </mesh>

      {/* lid, hinged on the straight bass side and propped open on its stick */}
      <group position={[-0.74, CASE_TOP + RIM, 0]} rotation-z={LID_ANGLE}>
        <mesh geometry={geo.lid} castShadow>
          {ebonyMat}
        </mesh>
      </group>
      <mesh position={[propX, CASE_TOP + RIM + propH / 2, 0.05]}>
        <cylinderGeometry args={[0.011, 0.013, propH, 12]} />
        {ebonyMat}
      </mesh>

      {/* music desk */}
      <RBox args={[1.02, 0.27, 0.018]} r={0.008} m={ebony} position={[0, CASE_TOP + 0.17, 0.46]} rotation-x={-0.22} />
      <RBox args={[1.02, 0.02, 0.05]} r={0.006} m={ebony} position={[0, CASE_TOP + 0.04, 0.5]} />

      {/* keybed, cheek blocks, key slip, nameboard with gold lettering */}
      <RBox args={[1.46, 0.07, 0.38]} r={0.015} m={ebony} position={[0, 0.69, 0.72]} />
      {[-1, 1].map((side) => (
        <RBox key={side} args={[0.11, 0.1, 0.36]} r={0.03} m={ebony} position={[side * 0.675, 0.77, 0.72]} />
      ))}
      <RBox args={[1.24, 0.035, 0.016]} r={0.006} m={ebony} position={[0, 0.725, 0.895]} />
      <RBox args={[1.24, 0.07, 0.04]} r={0.008} m={ebony} position={[0, 0.79, 0.575]} />
      <mesh position={[0, 0.79, 0.596]}>
        <planeGeometry args={[0.46, 0.029]} />
        <meshPhysicalMaterial map={geo.name} roughness={0.2} clearcoat={1} />
      </mesh>

      {/* 88 keys: 52 white (each pivots at the back so it can be pressed), 36 black */}
      {Array.from({ length: WHITE_KEYS }).map((_, i) => (
        <group key={i} ref={(g) => (keys.current[i] = g)} position={[KEYS_X0 + i * KEY_W, KEY_TOP - 0.011, 0.6]}>
          <RBox args={[KEY_W - 0.0018, 0.022, 0.29]} r={0.003} m={{ color: '#f2efe6', roughness: 0.32, clearcoat: 0.4 }} position={[0, 0, 0.145]} shadow={false} />
        </group>
      ))}
      {Array.from({ length: WHITE_KEYS - 1 }).map((_, i) =>
        HAS_SHARP[i % 7] ? (
          <RBox key={`b${i}`} args={[0.012, 0.02, 0.17]} r={0.003} m={ebony} position={[KEYS_X0 + (i + 0.5) * KEY_W, KEY_TOP + 0.009, 0.69]} shadow={false} />
        ) : null
      )}

      {/* tapered legs with brass caster cups */}
      {[
        [-0.6, 0.48],
        [0.6, 0.48],
        [-0.3, -0.78],
      ].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0.06, z]}>
          <mesh geometry={geo.leg} castShadow>
            {ebonyMat}
          </mesh>
          <mesh position={[0, -0.015, 0]}>
            <cylinderGeometry args={[0.046, 0.05, 0.06, 24]} />
            <meshPhysicalMaterial {...gold} />
          </mesh>
          <mesh position={[0, -0.04, 0]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.02, 0.02, 0.025, 16]} />
            <meshPhysicalMaterial color="#1a1a1c" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* lyre: twin columns, pedal box with three gold pedals, brace back to the case */}
      <group position={[0, 0, 0.2]}>
        {[-0.09, 0.09].map((x) => (
          <mesh key={x} position={[x, 0.37, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.022, 0.52, 16]} />
            {ebonyMat}
          </mesh>
        ))}
        <RBox args={[0.34, 0.07, 0.14]} r={0.02} m={ebony} position={[0, 0.08, 0.03]} />
        {[-0.07, 0, 0.07].map((x) => (
          <RBox key={x} args={[0.032, 0.014, 0.13]} r={0.006} m={gold} position={[x, 0.07, 0.14]} />
        ))}
        <mesh position={[0, 0.36, -0.28]} rotation-x={0.95}>
          <cylinderGeometry args={[0.01, 0.01, 0.7, 10]} />
          {ebonyMat}
        </mesh>
      </group>

      {/* Floating music notes (only visible while playing) */}
      {Array.from({ length: 8 }).map((_, i) => (
        <group key={`n${i}`} ref={(g) => (notes.current[i] = g)} visible={false}>
          <mesh>
            <sphereGeometry args={[0.05, 10, 10]} />
            <meshBasicMaterial color={i % 2 ? C.gold : C.teal} toneMapped={false} />
          </mesh>
          <mesh position={[0.045, 0.1, 0]}>
            <boxGeometry args={[0.012, 0.2, 0.012]} />
            <meshBasicMaterial color={i % 2 ? C.gold : C.teal} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Artist bench: tufted leather top on lacquered legs */}
      <group position={[0, 0, 1.35]}>
        <RBox args={[0.8, 0.07, 0.36]} r={0.025} m={ebony} position={[0, 0.45, 0]} />
        <RBox args={[0.76, 0.06, 0.32]} r={0.025} m={{ ...K.fabric('#1d1a1d'), roughness: 0.6 }} position={[0, 0.51, 0]} />
        {[-0.24, 0, 0.24].flatMap((x) => [-0.07, 0.07].map((z) => [x, z])).map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 0.541, z]}>
            <sphereGeometry args={[0.008, 8, 6]} />
            <meshPhysicalMaterial color="#0e0d0f" roughness={0.4} />
          </mesh>
        ))}
        {[
          [-0.34, -0.13],
          [0.34, -0.13],
          [-0.34, 0.13],
          [0.34, 0.13],
        ].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 0.21, z]} castShadow>
            <cylinderGeometry args={[0.022, 0.016, 0.42, 16]} />
            {ebonyMat}
          </mesh>
        ))}
      </group>
    </group>
  )
}
