# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Hackathon judges (primary audience for design decisions):** Hack4Vilnius 2026, challenge 10. They watch the demo on a big screen (laptop/projector, desktop web) and decide in minutes whether the idea is credible and the flow is effortless.
- **Residents of private houses in Vilnius (the story):** house owners with a 240L mixed-waste bin collected every 2 weeks. Job: tell the system when they actually need a pickup (skip or book) with zero effort. Demo persona: Žygimantas Bakanas, Darkiemio g. 13, Pilaitė.
- **Garbage truck driver (separate app built by a teammate, integrated later; nothing driver-specific lives in this repo):** gets today's ordered stops and opens them in OsmAnd or Google Maps.
- **Route / ops view:** removed from this repo (2026-10-09); route views belong to the driver app built separately.

## Product Purpose
Fixed-schedule collection stops at every house whether the bin is full or not (Tallinn 2024 pilot: 85.7% of containers under half full). Residents skip or book pickups; the driver gets a route each morning built only from houses that need it. Success at the hackathon: judges see a resident skip in one click, the stop drop off the route, and the savings counter move.

## Positioning
On-demand collection for private houses built on real VASA data: the resident's single tap directly reshapes tomorrow's truck route. Savings come when whole street segments drop out, not single houses.

## Operating Context
- Demo date is fixed: DEMO_TODAY = 2026-10-21, the evening before 117 Pilaitė houses are scheduled (2026-10-22).
- Resident flow: evening reminder ("Rytoj išvežimas. Ar konteineris pilnas?"), skip, book an extra pickup on another day, undo.
- Default stays the VASA fixed schedule; non-users are unaffected.
- One shared Supabase DB; realtime on pickups so the separate driver app can update live.

## Capabilities and Constraints
- Next.js App Router + TypeScript + Tailwind v4, static export to GitHub Pages; Supabase (Postgres + Realtime); Leaflet + OSM for maps.
- UI text is Lithuanian; code in English.
- No real auth or payments. Prices are placeholders in `lib/config.ts` (extra pickup 4€).
- Working product name: "Trage" (`APP_NAME`), chosen as a placeholder by the user; final name undecided.
- The driver app is built separately by a teammate; do not add driver pages or driver-only code here.
- Scope of this repo: the resident page `/` and shared tokens in `app/globals.css`.

## Brand Commitments
- Palette pinned by the user: light green and grey clay.
- Typeface pinned by the user: something with a transport/logistics character.
- Must not feel like: a generic SaaS dashboard, a stiff government portal, playful/gamified, or eco clichés (leaves, recycling arrows, planet imagery).
- User feedback (2026-10-09): no route stop counts on the resident page; sections divided, not merged; no modal popups ("feel like scam ads"); needs a real brand feeling.
- Deferred: Smart-ID login for address verification.

## Evidence on Hand
- `data/pilaite_houses.json`: 169 real Pilaitė houses from the VASA public container map API (fetched 2026-10-10), with real pickup history (2026-09-10 to 2026-10-09), including failure reasons such as "Neišstumtas konteineris".
- Benchmarks in PRD.md: Tallinn 2024 pilot (85.7% under half full), Cascais 2019 (≈96 L/100 km in collection), Lithuanian driver shortage.
- No testimonials, customers, or measured savings exist; impact numbers use the placeholder AVG_KM_SAVED_PER_SKIP = 0.3 and must stay labelled approximate.

## Product Principles
1. One click to skip, two to book. Every extra step must justify itself.
2. The schedule is the backbone: show the resident's real VASA rhythm and data before anything the app adds.
3. Every action is reversible on the spot (toast undo).
4. Honest numbers: real data where we have it, approximate labels where we don't.
5. The resident's tap and the truck's route are one story; design both views so the link is visible.

## Accessibility & Inclusion
Residents include older house owners: readable sizes, WCAG AA contrast, large touch targets, keyboard-operable popups.
