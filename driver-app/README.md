# driver-app

The driver's phone app. Sign in, tap your round, see it on the map, send it
to Google Maps.

```bash
npm install
npm run dev
```

## Screens

1. **Sign in** — shift-terminal style: tap your name. Mock only; the real app
   hands off to the fleet account system.
2. **Today** — just the rounds assigned to you, with progress on each.
3. **Round** — your route on the map, a one-tap "collected, go to the next
   stop" button that drives Google Maps, and the stop list. Progress
   survives a reload.

A driver never sees another crew's route — that's what kept the first version
unreadable. Planning output for the whole city belongs in a dispatcher view,
which this isn't.

## Where the rounds come from

`src/data/shift.js` runs the planner once and deals the rounds out to drivers.
In production the dispatcher's planner writes this and the app just reads back
the rounds for the signed-in driver.

`src/lib/plan.js` is the planner itself, in three stages:

1. **Group** (`cluster.js`) — geographic k-means, then a repair pass that
   evicts stops from rounds breaking the truck's capacity or the stop limit
   and hands them to the nearest round that can still take them. k-means alone
   has no notion of capacity, so the repair pass is what makes rounds usable.
2. **Order** (`route.js`) — nearest-neighbour for a fast first guess, then
   2-opt to un-cross the path.
3. **Hand over** (`osmand.js`, `maps.js`) — the whole round as one OsmAnd
   link, or Google Maps links one stop at a time.

## Container types

Three container types, from `FRACTIONS` in `src/data/vilnius.js`:

| Type | Lithuanian | Colour |
| --- | --- | --- |
| Non-recyclable | Nerūšiuojamos atliekos | slate |
| Recyclable | Rūšiuojamos atliekos | yellow |
| Glass | Stiklas | green |

The driver only ever sees the type, never a container size. Each type keeps
a nominal `volumeL` purely for capacity planning.

A truck collects **one type at a time** — glass can't ride along with mixed
waste — so `buildPlan` clusters each type separately and every round carries
exactly one. Each driver is also assigned a single type for the whole day
(`fractionId` in `src/data/shift.js`), and only gets rounds of that type.
The type's colour drives the round card, the map markers and the route line.

## Round size and truck capacity

Rounds run to **100 stops**, bound by truck capacity or by `MAX_STOPS` as a
shift-length cap — never by the navigation app. An earlier version sized
rounds at 10 stops to fit a single Maps link, which let a URL limit dictate
how a truck works. It doesn't.

Capacity is judged on what actually fills the truck body:

```
bodyL = container size × how full it is ÷ the fraction's compaction factor
```

Skip compaction and a 16 m³ truck looks like it holds 15 bins. With it, a
mixed-waste round reaches the 100-stop cap at ~60% body full — stop-bound,
not capacity-bound. Glass is barely compressible, so glass rounds fill the
truck at ~25 stops and really are short.

Service time per stop scales with container size (1 min + 1 min per 1000 L):
a wheelie bin is quick, a 2500 L communal container means working the lift.

*Known simplification:* only volume is modelled, not payload weight. Real
glass rounds often hit the axle limit before the body is full.

## Navigating the whole round in OsmAnd

**Navigacija OsmAnd** is a link to
`https://osmand.net/map/navigate?via=…&end=…&profile=truck`, with the stops
still to collect as `via` points and the depot as `end` (`src/lib/osmand.js`).
OsmAnd opens with that route loaded from the phone's position, and treats
each via point as an intermediate destination it moves past by itself, so
there's no 10-stop limit and no trips back to this app. The driver taps
"Start" once in OsmAnd and ticks containers off in the stop list whenever it
suits.

On Android the link is wrapped in Chrome's `intent://` syntax naming the
`net.osmand` package. That opens the app directly rather than the osmand.net
website, and falls back to the Play Store if OsmAnd isn't installed (OsmAnd+
users, `net.osmand.plus`, would need the package changed). OsmAnd's
`osmand.api://navigate_gpx`, which would skip the Start tap, isn't open to
browsers.

## Google Maps fallback (one stop at a time)

Nothing outside Google Maps can add a stop to a navigation that's already
running, and a Maps link carries at most 10 stops. Chaining 10-stop links
meant the driver kept reopening legs, so the round now goes over **one stop
at a time**, as a single tap at each container:

1. **Pradėti — vykti į 1.** opens Maps navigating to the first stop.
2. At each container the driver switches back and taps **✓ Ištuštinta**.
   That one tap marks the stop collected *and* opens Maps on the next one.
3. After the last stop the same button sends them back to the depot.

Every link carries `dir_action=navigate`, so Maps starts turn-by-turn
straight away with no route preview or extra "Start" tap. **Vėl atidaryti
navigaciją** reopens the current stop if Maps was closed, and each row in the
stop list has an arrow for jumping to an address out of order.

The web app can't notice arrival by itself: once Maps is in front, the
browser stops giving the page GPS. Fully hands-free would need a native app,
either Google's Navigation SDK (multi-stop, arrival callbacks) or an
Android overlay button floating over Maps.

Waze was tried and reverted, because its deep links take one destination
with no waypoints. With one stop per link that no longer matters, so Waze
could come back as an option.

## Mock data

`src/data/vilnius.js` generates 420 pickups — a day's dispatch — across eight
Vilnius mikrorajonai, with bin fractions, container sizes, fill levels and
the odd urgent stop. It's seeded, so every reload shows the same day. Batch
size, truck capacity and the stop cap are constants at the top of
`src/data/shift.js`.

**To wire up the real feed**, replace `generatePickups` with a fetch from the
resident app. Everything downstream only needs this shape:

```js
{ id, address, district, lat, lng, fractionId, containerType, volumeL,
  fillLevel, urgent }
```

## Estimates

Distances are straight-line with a 1.35 urban detour factor, at 24 km/h plus
3 min per stop. Good enough for sizing a shift — Google Maps gives the real
numbers once a round is opened.
