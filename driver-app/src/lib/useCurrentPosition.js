import { useEffect, useState } from 'react'

// The phone's position, kept fresh while a round is open, so the navigation
// link can carry it as the route's start.
//
// It's watched from the moment the round opens rather than fetched on tap:
// a GPS fix (or the permission prompt) can take seconds, and by then Chrome
// no longer treats the tap as the user's, so it won't open the OsmAnd app.
export function useCurrentPosition() {
  const [pos, setPos] = useState(null)

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      // Denied or unavailable: the link simply goes without a start point.
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 30000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  return pos
}
