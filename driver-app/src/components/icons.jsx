// Authored icons shared with the resident app's style: 24px grid, 2px stroke, square caps.
function Icon({ size = 20, children, ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const CheckIcon = (p) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </Icon>
)

export const BackIcon = (p) => (
  <Icon {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
)

export const NavigateIcon = (p) => (
  <Icon {...p}>
    <path d="M4 11l16-7-7 16-2-7z" />
  </Icon>
)

// WasteWise mark: the "W route" app icon (same as the resident app header).
const W_ROUTE = 'M7.9 16.8 L15.5 37.8 L23.8 21.6 L32.3 37.8 L39.8 16.8'
export function LogoMark({ size = 32 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <rect width="48" height="48" rx="11" fill="#0f5c4a" />
      <path d="M11.8 0v48M36 0v48M0 12h48M0 26.5h48M0 40.8h48" stroke="#256b5a" strokeWidth="2" />
      <path d={W_ROUTE} fill="none" stroke="#e8890c" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d={W_ROUTE} fill="none" stroke="#0f5c4a" strokeWidth="0.9" strokeDasharray="1.6 1.6" />
      <circle cx="7.9" cy="16.8" r="4.2" fill="#e8890c" />
      <circle cx="7.9" cy="16.8" r="1.8" fill="#fff" />
      <circle cx="39.8" cy="16.8" r="4.2" fill="#e8890c" />
      <path d="M37.6 14.6h4.4M38 15.6h3.6l-0.5 3.4h-2.6z" fill="#fff" stroke="#fff" strokeWidth="0.7" strokeLinejoin="round" />
    </svg>
  )
}

// Depot marker for the map (Leaflet takes an HTML string): a small warehouse glyph.
export const DEPOT_SVG =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#e3efe9" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M3 10l9-6 9 6v10H3z"/><path d="M8 20v-6h8v6"/></svg>'

// Done-stop check for map markers (HTML string for Leaflet).
export const CHECK_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>'
