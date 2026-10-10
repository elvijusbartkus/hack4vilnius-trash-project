// Handing the whole round to OsmAnd in one tap.
//
// OsmAnd answers https://osmand.net/map/navigate?via=…&end=…&profile=… by
// building a route through every `via` point in order and opening it ready
// to drive; each via point is an intermediate destination it announces and
// moves past by itself. No 10-stop limit, and no coming back to this app
// between stops. With no `start`, the route begins at the phone's position.
//
// That link is only "browsable", not a verified app link, so a plain <a>
// would open the osmand.net website. On Android we wrap it in Chrome's
// intent:// syntax naming OsmAnd's package, which opens the app directly and
// falls back to its Play Store page if it isn't installed.
//
// OsmAnd's richer osmand.api:// commands (e.g. navigate_gpx, which would
// skip the final "Start" tap) aren't exposed to browsers at all.

// The free OsmAnd from Google Play. OsmAnd+ is `net.osmand.plus`.
const PACKAGE = 'net.osmand'
const STORE_URL = `https://play.google.com/store/apps/details?id=${PACKAGE}`

/**
 * @param {Array<{lat:number,lng:number}>} stops  in driving order
 * @param {{lat:number,lng:number}} end            where the round finishes
 */
export function osmandRouteUrl(stops, end) {
  // Built by hand rather than with URLSearchParams: OsmAnd splits `via` on
  // `,` and `;`, and those must reach it unescaped.
  const query = [
    stops.length ? `via=${stops.map(coord).join(';')}` : null,
    `end=${coord(end)}`,
    'profile=truck', // OsmAnd falls back to its default profile if absent
  ]
    .filter(Boolean)
    .join('&')

  const path = `osmand.net/map/navigate?${query}`

  if (!/android/i.test(navigator.userAgent)) return `https://${path}`

  return (
    `intent://${path}#Intent;scheme=https;package=${PACKAGE};` +
    `S.browser_fallback_url=${encodeURIComponent(STORE_URL)};end`
  )
}

function coord(p) {
  return `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`
}
