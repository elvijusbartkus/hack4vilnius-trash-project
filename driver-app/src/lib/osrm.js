// Real road data from OSRM (OpenStreetMap routing): distances for ordering a
// round, and the driven path for drawing it. The public demo server caps a
// request at 100 points, so the distance table is fetched in blocks.

import { OSRM_URL } from '../../../lib/config.ts'

const BLOCK = 50 // sources + destinations per request stay within 100 points

const coord = (p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`

async function get(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    const json = await res.json()
    if (json.code !== 'Ok') throw new Error(json.message || json.code)
    return json
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Road distances in km between every pair of points, as a function
 * dist(a, b) keyed by point id. Pairs OSRM couldn't route stay missing;
 * the caller falls back for those.
 */
export async function roadMatrix(points) {
  const km = new Map() // `${fromId}>${toId}` -> km
  for (let i = 0; i < points.length; i += BLOCK) {
    for (let j = 0; j < points.length; j += BLOCK) {
      const from = points.slice(i, i + BLOCK)
      const to = points.slice(j, j + BLOCK)
      const all = i === j ? from : [...from, ...to]
      const sources = from.map((_, k) => k).join(';')
      const destinations = (i === j ? from.map((_, k) => k) : to.map((_, k) => from.length + k)).join(';')
      const json = await get(
        `${OSRM_URL}/table/v1/driving/${all.map(coord).join(';')}?annotations=distance&sources=${sources}&destinations=${destinations}`,
      )
      json.distances.forEach((row, a) =>
        row.forEach((m, b) => {
          if (m != null) km.set(`${from[a].id}>${to[b].id}`, m / 1000)
        }),
      )
    }
  }
  return km
}

// The path a truck actually drives through the points in this order, as
// [lat, lng] pairs for Leaflet, plus its length. Null if OSRM can't route it.
const pathCache = new Map()
export async function roadPath(points) {
  if (points.length < 2) return null
  const key = points.map(coord).join(';')
  if (pathCache.has(key)) return pathCache.get(key)
  try {
    const json = await get(`${OSRM_URL}/route/v1/driving/${key}?overview=full&geometries=geojson`)
    const route = json.routes[0]
    const result = {
      latlngs: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      km: route.distance / 1000,
    }
    pathCache.set(key, result)
    return result
  } catch {
    return null
  }
}
