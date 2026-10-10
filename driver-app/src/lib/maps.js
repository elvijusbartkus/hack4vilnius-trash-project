// Handing stops over to Google Maps.
//
// Maps can't take more than 10 stops in a link, and nothing outside it can
// add a stop to a navigation already running. So the round is handed over
// one stop at a time, and each link asks Maps to start turn-by-turn straight
// away (`dir_action=navigate`) — no route preview, no extra "Start" tap.

export function stopUrl(stop) {
  const params = new URLSearchParams({
    api: '1',
    travelmode: 'driving',
    destination: `${stop.lat},${stop.lng}`,
    dir_action: 'navigate',
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
