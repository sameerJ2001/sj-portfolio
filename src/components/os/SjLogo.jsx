import { SJ_LOGO } from '../../lib/brand'

// The SJ shield monogram as an inline SVG, `size` pixels tall
export default function SjLogo({ size = 32, color = 'currentColor', className }) {
  const [, , w, h] = SJ_LOGO.viewBox
  return (
    <svg className={className} width={(size * w) / h} height={size} viewBox={SJ_LOGO.viewBox.join(' ')} role="img" aria-label="SJ">
      {SJ_LOGO.paths.map((d) => (
        <path key={d} d={d} fill="none" stroke={color} strokeWidth={SJ_LOGO.stroke} strokeMiterlimit={4} />
      ))}
    </svg>
  )
}
