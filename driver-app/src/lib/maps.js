// Handing a round over to Google Maps.
//
// The Maps URL scheme carries an origin, a destination and at most 9
// intermediate waypoints, driven in the order given. A real round is far
// bigger than that, so a round is handed over as a chain of legs: each leg
// starts where the last one ended, and the driver opens the next one when
// they get there. The round screen tracks which leg is current, so it stays
// one tap at a time rather than a wall of links.
//
// A leg ends at its last pickup rather than carrying on to the next leg's
// first stop, so no slot is wasted on navigation the driver doesn't need.

export const MAX_WAYPOINTS = 9

/**
 * Navigation to a single stop, for when a driver wants to jump straight to
 * one address instead of driving the round in order.
 */
export function stopUrl(stop) {
  const params = new URLSearchParams({
    api: '1',
    travelmode: 'driving',
    destination: coord(stop),
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/**
 * Split a round into one Google Maps link per leg.
 *
 * @param {{lat:number,lng:number}} depot  where the driver sets off from
 * @param {Array} stops                    pickups in the order to drive them
 * @returns {Array<{url:string, from:object, to:object, stopCount:number}>}
 */
export function buildMapsLegs(depot, stops) {
  if (!stops.length) return []

  const nodes = [depot, ...stops]
  const legs = []

  let i = 0
  while (i < nodes.length - 1) {
    const end = Math.min(i + MAX_WAYPOINTS + 1, nodes.length - 1)
    const slice = nodes.slice(i, end + 1)
    legs.push({
      url: directionsUrl(slice),
      from: slice[0],
      to: slice[slice.length - 1],
      // Every node past the starting one is a pickup serviced on this leg.
      // Indices are 1-based stop numbers, matching what the driver sees.
      startIndex: i + 1,
      endIndex: end,
      stopCount: slice.length - 1,
    })
    i = end
  }

  return legs
}

function directionsUrl(nodes) {
  const params = new URLSearchParams({
    api: '1',
    travelmode: 'driving',
    origin: coord(nodes[0]),
    destination: coord(nodes[nodes.length - 1]),
  })

  const waypoints = nodes.slice(1, -1)
  if (waypoints.length) {
    // URLSearchParams escapes the `|` separator, which Maps accepts.
    params.set('waypoints', waypoints.map(coord).join('|'))
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

function coord(node) {
  return `${node.lat},${node.lng}`
}
