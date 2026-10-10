import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// One round, nothing else. The driver is looking at the stops they're about
// to drive, so the map shows only those — no other crews, no other colours.
//
// Leaflet's default marker images don't survive bundling, so every marker
// here is a divIcon drawn from CSS instead.
export default function RouteMap({ depot, round, doneIds, activeIndex }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)

  useEffect(() => {
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([54.6872, 25.2797], 12)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.control.attribution({ prefix: false, position: 'bottomleft' })
      .addAttribution('&copy; OpenStreetMap')
      .addTo(map)

    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()

    const colour = round.fraction.colour
    const path = [depot, ...round.stops, depot].map((p) => [p.lat, p.lng])
    L.polyline(path, { color: colour, weight: 4, opacity: 0.8 }).addTo(layer)

    L.marker([depot.lat, depot.lng], { icon: depotIcon() })
      .bindTooltip('Bazė', { direction: 'top' })
      .addTo(layer)

    // A hundred numbered circles is unreadable. Past a couple of dozen
    // stops the markers become plain dots and the path carries the order;
    // the stop you're heading to stays full size and numbered.
    const compact = round.stops.length > 25

    round.stops.forEach((stop, i) => {
      const done = doneIds.includes(stop.id)
      L.marker([stop.lat, stop.lng], {
        icon: stopIcon(i + 1, colour, {
          done,
          active: i === activeIndex,
          urgent: stop.urgent,
          compact: compact && i !== activeIndex,
        }),
        zIndexOffset: i === activeIndex ? 1000 : done ? 0 : 500,
      })
        .bindTooltip(`${i + 1}. ${stop.address}`, { direction: 'top' })
        .addTo(layer)
    })

    map.fitBounds(path, { padding: [50, 50] })
  }, [depot, round, doneIds, activeIndex])

  return <div className="map" ref={containerRef} />
}

function depotIcon() {
  return L.divIcon({
    className: '',
    html: '<div class="marker-depot">🏭</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

// Stops carry the round's fraction colour, so a glass round reads as green
// and a mixed-waste round as slate at a glance.
function stopIcon(n, colour, { done, active, urgent, compact }) {
  const classes = ['marker-stop']
  if (compact) classes.push('is-compact')
  if (done) classes.push('is-done')
  if (active) classes.push('is-active')
  if (urgent && !done) classes.push('is-urgent')

  const style = done ? '' : ` style="background:${colour}"`
  const label = compact ? '' : done ? '✓' : n
  const size = compact ? 12 : 28

  return L.divIcon({
    className: '',
    html: `<div class="${classes.join(' ')}"${style}>${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}
