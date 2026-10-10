// A round as a GPX route, for navigating in OsmAnd.
//
// Google Maps takes at most 10 stops per link and can't be fed the next one
// mid-navigation. OsmAnd imports a GPX route of any length, routes between
// its route points on real roads and treats each one as an intermediate
// destination — announcing it and moving on to the next by itself. That's
// the checkpoint behaviour a round needs, with no trips back to this app.
//
// Only stops still to collect go in, so re-opening mid-round picks up where
// the driver is. The route has no start point: OsmAnd navigates from the
// truck's current position to the first stop, then on through the rest and
// back to the depot.

export function buildGpx({ name, stops, depot }) {
  const points = [
    ...stops.map((s) => ({ ...s, label: `${s.number}. ${s.address}` })),
    { ...depot, label: depot.name },
  ]

  const rtepts = points
    .map(
      (p) =>
        `    <rtept lat="${p.lat}" lon="${p.lng}"><name>${escape(p.label)}</name></rtept>`,
    )
    .join('\n')

  // Waypoints as well, so every stop is labelled on OsmAnd's map and can be
  // tapped, not just threaded through by the route.
  const wpts = points
    .map(
      (p) =>
        `  <wpt lat="${p.lat}" lon="${p.lng}"><name>${escape(p.label)}</name></wpt>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Atliekų maršrutai" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${escape(name)}</name></metadata>
${wpts}
  <rte>
    <name>${escape(name)}</name>
${rtepts}
  </rte>
</gpx>
`
}

/**
 * Hand the GPX to OsmAnd. On phones whose share sheet accepts the file, it
 * goes straight to the app; otherwise it downloads, and opening the
 * download offers OsmAnd.
 */
export async function openInOsmAnd(gpx, fileName) {
  const file = new File([gpx], fileName, { type: 'application/gpx+xml' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (err) {
      // The driver closed the share sheet — don't download behind their back.
      if (err.name === 'AbortError') return
    }
  }

  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

function escape(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
