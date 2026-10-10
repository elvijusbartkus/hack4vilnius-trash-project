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

// TRAGE mark: a bin with its lid lifted by a check (same as the resident app header).
export function LogoMark({ size = 32 }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <rect width="32" height="32" rx="4" fill="#1f5a3c" />
      <path d="M9 12h14l-1.6 13H10.6z" fill="#dcead2" />
      <path d="M8 9.5h16" stroke="#dcead2" strokeWidth="2.2" strokeLinecap="square" />
      <path d="M12.5 17.8l2.6 2.6 4.8-5" fill="none" stroke="#1f5a3c" strokeWidth="2.4" strokeLinecap="square" />
    </svg>
  )
}

// Depot marker for the map (Leaflet takes an HTML string): a small warehouse glyph.
export const DEPOT_SVG =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#dcead2" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M3 10l9-6 9 6v10H3z"/><path d="M8 20v-6h8v6"/></svg>'

// Done-stop check for map markers (HTML string for Leaflet).
export const CHECK_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>'
