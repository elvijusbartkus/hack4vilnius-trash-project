// Geographic helpers. Everything here works on plain {lat, lng} objects.

const R = 6371 // km

export function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Straight-line distance underestimates driving. 1.35 is a common urban
// detour factor — good enough for planning, the real numbers come from
// Google Maps once the driver opens the route.
export const DETOUR_FACTOR = 1.35

export function roadDistance(a, b) {
  return haversine(a, b) * DETOUR_FACTOR
}

export function centroid(points) {
  if (!points.length) return null
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 },
  )
  return { lat: sum.lat / points.length, lng: sum.lng / points.length }
}

function toRad(deg) {
  return (deg * Math.PI) / 180
}

// Deterministic PRNG so a given seed always produces the same mock city.
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
