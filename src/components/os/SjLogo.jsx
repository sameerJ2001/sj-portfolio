import { SJ_LOGO } from '../../lib/brand'

// The SJ shield monogram as an inline SVG, `size` pixels tall
export default function SjLogo({ size = 32, color = 'currentColor', className }) {
  const [, , w, h] = SJ_LOGO.viewBox
  return (
    <svg className={className} width={(size * w) / h} height={size} viewBox={SJ_LOGO.viewBox.join(' ')} role="img" aria-label="SJ">
      <path d={SJ_LOGO.path} fill={color} />
    </svg>
  )
}
