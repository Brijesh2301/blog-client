import { ImageResponse } from 'next/og'

/**
 * Apple touch icon (180x180 PNG).
 *
 * iOS does not accept an SVG apple-touch-icon, so this one is rasterised.
 * It is built from shapes and an inline data-URI image only — no web font —
 * so it cannot fail to render for want of a typeface.
 *
 * Apple masks the icon itself, so the artwork is full-bleed with no rounding.
 */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><path d="M202 186h47.2c42 0 70.8 26.6 70.8 70s-28.8 70-70.8 70H202V186Zm31.8 28.7v82.6h15.4c23.6 0 39-15.6 39-41.3s-15.4-41.3-39-41.3h-15.4Z" fill="#fff" fill-opacity="0.96"/></svg>`

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 55%, #22d3ee 100%)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- satori renders plain img only */}
      <img
        width={180}
        height={180}
        alt=""
        src={`data:image/svg+xml;base64,${Buffer.from(MARK).toString('base64')}`}
      />
    </div>,
    size
  )
}
