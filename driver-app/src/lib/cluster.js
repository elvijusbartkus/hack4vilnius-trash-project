// Grouping pickups into truck-sized rounds.
//
// Two hard limits drive this:
//   1. truck capacity  — a round can't collect more litres than the truck holds
//   2. stops per round — keeps a round small enough to stay drivable, and
//      matches what a single Google Maps link can carry
//
// Approach: geographic k-means for the shape of the rounds, then a repair
// pass that pushes stops out of over-full clusters until every round is
// feasible. k-means alone has no notion of capacity, so the repair pass is
// what actually makes the result usable.

import { centroid, haversine } from './geo.js'

export function clusterByCapacity(pickups, { capacityL, maxStops }) {
  if (!pickups.length) return []

  const totalL = pickups.reduce((s, p) => s + p.bodyL, 0)
  const k = Math.max(
    Math.ceil(totalL / capacityL),
    Math.ceil(pickups.length / maxStops),
    1,
  )

  let clusters = kmeans(pickups, k)
  clusters = repairCapacity(clusters, { capacityL, maxStops })

  return clusters
    .filter((c) => c.length > 0)
    .sort((a, b) => {
      // Stable, human-friendly order: north-west rounds first.
      const ca = centroid(a)
      const cb = centroid(b)
      return cb.lat - ca.lat || ca.lng - cb.lng
    })
}

// Lloyd's algorithm with deterministic farthest-point seeding, so the same
// input always yields the same rounds (important when a dispatcher reloads).
function kmeans(points, k, maxIter = 50) {
  let centres = seed(points, k)

  for (let iter = 0; iter < maxIter; iter++) {
    const groups = Array.from({ length: k }, () => [])
    for (const p of points) {
      groups[nearestIndex(p, centres)].push(p)
    }

    const next = groups.map((g, i) => (g.length ? centroid(g) : centres[i]))
    const settled = next.every((c, i) => haversine(c, centres[i]) < 0.005)
    centres = next
    if (settled) return groups
  }

  const groups = Array.from({ length: k }, () => [])
  for (const p of points) groups[nearestIndex(p, centres)].push(p)
  return groups
}

// Pick the first centre as the point nearest the overall centroid, then
// repeatedly take the point furthest from everything chosen so far.
function seed(points, k) {
  const mid = centroid(points)
  const first = points.reduce((best, p) =>
    haversine(p, mid) < haversine(best, mid) ? p : best,
  )
  const centres = [{ lat: first.lat, lng: first.lng }]

  while (centres.length < k) {
    let furthest = points[0]
    let furthestDist = -1
    for (const p of points) {
      const d = Math.min(...centres.map((c) => haversine(p, c)))
      if (d > furthestDist) {
        furthestDist = d
        furthest = p
      }
    }
    centres.push({ lat: furthest.lat, lng: furthest.lng })
  }
  return centres
}

// Move stops out of clusters that break a limit, into the nearest cluster
// that can still take them. Opens a new round only when nothing else fits.
function repairCapacity(clusters, { capacityL, maxStops }) {
  const groups = clusters.map((c) => [...c])
  const guard = groups.flat().length * 4

  for (let step = 0; step < guard; step++) {
    const overIdx = groups.findIndex((g) => !fits(g, { capacityL, maxStops }))
    if (overIdx === -1) break

    const group = groups[overIdx]
    const centre = centroid(group)
    // Evicting the outlier keeps the remaining round geographically tight.
    const outlier = group.reduce((worst, p) =>
      haversine(p, centre) > haversine(worst, centre) ? p : worst,
    )
    group.splice(group.indexOf(outlier), 1)

    const target = groups
      .map((g, i) => ({ g, i }))
      .filter(({ g, i }) => i !== overIdx && fits([...g, outlier], { capacityL, maxStops }))
      .sort((a, b) => haversine(outlier, centroid(a.g)) - haversine(outlier, centroid(b.g)))[0]

    if (target) target.g.push(outlier)
    else groups.push([outlier])
  }

  return groups
}

function fits(group, { capacityL, maxStops }) {
  if (group.length > maxStops) return false
  // bodyL is post-compaction volume — what the truck body actually fills with.
  return group.reduce((s, p) => s + p.bodyL, 0) <= capacityL
}

function nearestIndex(point, centres) {
  let best = 0
  let bestDist = Infinity
  centres.forEach((c, i) => {
    const d = haversine(point, c)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  })
  return best
}
