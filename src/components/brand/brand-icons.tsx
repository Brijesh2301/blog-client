import type { SVGProps } from 'react'

/**
 * Brand glyphs.
 *
 * lucide-react v1 removed third-party brand icons, so these are inlined here
 * rather than pulled from an icon package. All are single-path, currentColor,
 * and carry aria-hidden since the accessible name comes from the link label.
 */
type IconProps = SVGProps<SVGSVGElement>

const base = {
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  'aria-hidden': true as const,
  focusable: 'false' as const,
}

export function GitHubIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.1.82-.26.82-.57v-2c-3.34.73-4.04-1.6-4.04-1.6-.55-1.4-1.34-1.77-1.34-1.77-1.1-.75.08-.73.08-.73 1.21.08 1.85 1.24 1.85 1.24 1.07 1.84 2.81 1.31 3.5 1a2.6 2.6 0 0 1 .76-1.6c-2.66-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.4 1.24-3.24-.13-.3-.54-1.52.12-3.17 0 0 1.01-.33 3.3 1.24a11.5 11.5 0 0 1 6 0c2.29-1.57 3.3-1.24 3.3-1.24.66 1.65.25 2.87.12 3.17a4.65 4.65 0 0 1 1.24 3.24c0 4.63-2.82 5.65-5.49 5.95.43.37.81 1.1.81 2.22v3.29c0 .31.21.68.83.56A12 12 0 0 0 12 .5Z" />
    </svg>
  )
}

export function XIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M18.9 1.5h3.68l-8.04 9.19L24 22.5h-7.4l-5.8-7.58-6.63 7.58H.48l8.6-9.83L0 1.5h7.6l5.44 7.2L18.9 1.5Zm-1.3 18.8h2.04L6.48 3.6H4.3l13.3 16.7Z" />
    </svg>
  )
}

export function LinkedInIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14Zm1.78 13.02H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  )
}
