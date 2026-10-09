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
3. **Round** — your route on the map, the Google Maps button, and the stop
   list to tick off as you collect. Progress survives a reload.

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
3. **Hand over** (`maps.js`) — build the Google Maps directions links.

## Bin fractions

Three household bins, from `FRACTIONS` in `src/data/vilnius.js`:

| Fraction | Lithuanian | Colour |
| --- | --- | --- |
| Non-recyclable | Mišrios komunalinės | slate |
| Recyclables | Pakuotės | yellow |
| Glass | Stiklas | green |

A truck collects **one fraction at a time** — glass can't ride along with
mixed waste — so `buildPlan` clusters each fraction separately and every
round carries exactly one bin type. The fraction's colour drives the round
card, the map markers and the route line.

Glass rounds come out short (~25 stops) but near-full, because glass barely
compacts — capacity-bound, where mixed-waste rounds are stop-bound. That's
the capacity constraint doing real work.

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

## The 9-waypoint limit

Google's Maps URL scheme carries an origin, a destination and **at most 9
intermediate waypoints**. A 100-stop round therefore goes over as ~10
chained legs, each starting where the last ended.

The driver never sees that as a wall of links: the round screen follows
which stops are ticked off and offers the one leg they're currently on
("Open stops 31–40"), advancing by itself. The full leg list is one
disclosure away.

Each stop row also has an arrow that navigates straight to that address, for
jumping out of order.

Waze was tried and reverted: its deep-link scheme
(`waze.com/ul?ll=…&navigate=yes`) takes exactly one destination and has no
equivalent of `waypoints`, so it cannot accept a multi-stop route at all.

The link ends at the last pickup rather than carrying on back to the depot —
the drive home needs no navigation, and spending the final slot on it would
cost a stop. So **10 stops is exactly one link and one tap**, which is why
`MAX_STOPS` is 10. Distance and time estimates *do* include the return,
because the truck really does have to drive it.

Longer rounds are split into consecutive legs that chain end-to-start; the
driver finishes one and opens the next. `buildMapsLegs` handles this and the
round screen labels the legs.

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
