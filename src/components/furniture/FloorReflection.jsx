import { useEffect, useMemo } from 'react'
import { AdditiveBlending, PlaneGeometry } from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'

// The polished floor's mirror sheen. It renders the room reflected in the floor plane and ADDS it on
// top of the lit concrete, so neon, lamps and screens reflect brightly even though the loft is dark
// (a reflection mixed into the floor's colour would be darkened by the dim lighting). Softly blurred,
// and patchy where the sealer is worn: `gloss` is the floor's roughness map (dark = glossy).
const SHEEN = {
  name: 'FloorSheen',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    tGloss: { value: null },
    uRepeat: { value: 2 },
    uStrength: { value: 0.6 },
    uBlur: { value: 0.0045 },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec2 vUv2;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vUv2 = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform sampler2D tGloss;
    uniform float uRepeat;
    uniform float uStrength;
    uniform float uBlur;
    varying vec4 vUv;
    varying vec2 vUv2;
    #include <logdepthbuf_pars_fragment>
    void main() {
      #include <logdepthbuf_fragment>
      float gloss = 1.0 - texture2D(tGloss, vUv2 * uRepeat).g;
      vec2 uv = vUv.xy / vUv.w;
      // two rings of taps: sharper where the floor is glossy, softer on the worn patches
      float r = uBlur * (1.6 - gloss);
      vec3 c = texture2D(tDiffuse, uv).rgb * 0.2;
      for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.785398;
        c += texture2D(tDiffuse, uv + vec2(cos(a), sin(a)) * r).rgb * 0.06;
        c += texture2D(tDiffuse, uv + vec2(cos(a + 0.39), sin(a + 0.39)) * r * 2.2).rgb * 0.04;
      }
      gl_FragColor = vec4(c * color * uStrength * gloss, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}

export default function FloorReflection({ size, gloss, repeat = 2, strength = 0.78, color = '#cfe0e3', y = 0.003 }) {
  const mirror = useMemo(() => {
    const m = new Reflector(new PlaneGeometry(...size), { shader: SHEEN, textureWidth: 1024, textureHeight: 1024, clipBias: 0.003, multisample: 0, color })
    Object.assign(m.material, { transparent: true, blending: AdditiveBlending, depthWrite: false })
    m.material.uniforms.tGloss.value = gloss
    m.material.uniforms.uRepeat.value = repeat
    m.material.uniforms.uStrength.value = strength
    m.rotation.x = -Math.PI / 2
    m.position.y = y
    m.raycast = () => {} // clicks fall through to the floor underneath
    return m
  }, [size, gloss, repeat, strength, color, y])
  useEffect(() => () => mirror.dispose(), [mirror])
  return <primitive object={mirror} />
}
