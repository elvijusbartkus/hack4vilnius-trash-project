// Pickups in, driveable rounds out.
//
// Rounds are planned per fraction: a truck collects one bin type at a time,
// so mixed waste, packaging and glass never share a round even when they
// sit at the same address.

import { FRACTIONS, getFraction } from '../data/vilnius.js'
import { clusterByCapacity } from './cluster.js'
import { optimiseRoute, tourLength } from './route.js'
import { buildMapsLegs } from './maps.js'

export function buildPlan({ pickups, depot, capacityL, maxStops }) {
  const routes = []

  for (const fraction of FRACTIONS) {
    // What each bin actually costs the truck: how full it is, shrunk by
    // how hard this fraction compacts. Capacity is judged on this, not on
    // the container's nameplate size.
    const forFraction = pickups
      .filter((p) => p.fractionId === fraction.id)
      .map((p) => ({
        ...p,
        looseL: Math.round(p.volumeL * p.fillLevel),
        bodyL: Math.round((p.volumeL * p.fillLevel) / fraction.compaction),
      }))
    if (!forFraction.length) continue

    const groups = clusterByCapacity(forFraction, { capacityL, maxStops })

    for (const group of groups) {
      const optimised = optimiseRoute(depot, group)
      routes.push({
        fraction,
        ...optimised,
        fillPct: Math.round((optimised.loadL / capacityL) * 100),
        districts: [...new Set(group.map((p) => p.district))].sort(),
        urgentCount: group.filter((p) => p.urgent).length,
        legs: buildMapsLegs(depot, optimised.stops),
        // What the same stops would have cost in the order they arrived.
        unoptimisedKm: tourLength(depot, group),
      })
    }
  }

  // Number the rounds once everything is planned, so ids stay stable.
  routes.forEach((route, i) => {
    route.id = `round-${i + 1}`
    route.name = `Reisas ${i + 1}`
  })

  const totals = routes.reduce(
    (acc, r) => ({
      distanceKm: acc.distanceKm + r.distanceKm,
      unoptimisedKm: acc.unoptimisedKm + r.unoptimisedKm,
      durationMin: acc.durationMin + r.durationMin,
      stops: acc.stops + r.stops.length,
    }),
    { distanceKm: 0, unoptimisedKm: 0, durationMin: 0, stops: 0 },
  )

  return { routes, totals }
}

export { getFraction }
