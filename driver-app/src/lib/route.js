// Ordering the stops inside one round.
//
// This is a travelling-salesman problem with a fixed start and end (the
// depot). Nearest-neighbour gives a decent first guess fast; 2-opt then
// un-crosses the path, which is where most of the saving comes from.

import { roadDistance } from './geo.js'

const AVG_SPEED_KMH = 24 // city driving with a heavy truck

// Pull up, empty, move on. A wheelie bin is quick; a large glass container
// means manoeuvring the lift, so service time tracks its size.
function serviceMinutes(stop) {
  return 1 + stop.volumeL / 1000
}

export function optimiseRoute(depot, stops) {
  if (!stops.length) {
    return { stops: [], distanceKm: 0, durationMin: 0, loadL: 0, looseL: 0 }
  }

  const ordered = twoOpt(depot, nearestNeighbour(depot, stops))
  const distanceKm = tourLength(depot, ordered)

  return {
    stops: ordered,
    distanceKm,
    durationMin: Math.round(
      (distanceKm / AVG_SPEED_KMH) * 60 +
        ordered.reduce((s, p) => s + serviceMinutes(p), 0),
    ),
    // loadL is what the truck body fills with; looseL is what was tipped in.
    loadL: ordered.reduce((s, p) => s + p.bodyL, 0),
    looseL: ordered.reduce((s, p) => s + p.looseL, 0),
  }
}

function nearestNeighbour(depot, stops) {
  const remaining = [...stops]
  const order = []
  let current = depot

  while (remaining.length) {
    let bestIdx = 0
    let bestDist = Infinity
    remaining.forEach((p, i) => {
      const d = roadDistance(current, p)
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    })
    current = remaining[bestIdx]
    order.push(current)
    remaining.splice(bestIdx, 1)
  }
  return order
}

// Repeatedly reverse the segment between two stops when doing so shortens
// the round trip, until no reversal helps.
function twoOpt(depot, order) {
  const route = [...order]
  let improved = true

  while (improved) {
    improved = false
    for (let i = 0; i < route.length - 1; i++) {
      for (let j = i + 1; j < route.length; j++) {
        const a = i === 0 ? depot : route[i - 1]
        const b = route[i]
        const c = route[j]
        const d = j === route.length - 1 ? depot : route[j + 1]

        const before = roadDistance(a, b) + roadDistance(c, d)
        const after = roadDistance(a, c) + roadDistance(b, d)

        if (after < before - 1e-9) {
          route.splice(i, j - i + 1, ...route.slice(i, j + 1).reverse())
          improved = true
        }
      }
    }
  }
  return route
}

// Depot → every stop in order → back to the depot.
export function tourLength(depot, stops) {
  if (!stops.length) return 0
  let total = roadDistance(depot, stops[0])
  for (let i = 0; i < stops.length - 1; i++) {
    total += roadDistance(stops[i], stops[i + 1])
  }
  return total + roadDistance(stops[stops.length - 1], depot)
}
