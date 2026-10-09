# PRD: Waste pickup on demand (working name: APP_NAME)

Hack4Vilnius 2026, challenge 10. Prototype for a 47h hackathon. Optimise for a working, demoable flow, not production quality.

## 1. Problem
- Private houses in Vilnius get mixed waste pickup on a fixed schedule (26x per year, every 2 weeks). The truck stops at every house whether the bin is full or not.
- Benchmarks show most bins are far from full at pickup (Tallinn 2024 pilot: 85,7% of containers under half full).
- Garbage trucks burn about 96L/100km in stop-and-go collection (Cascais, Portugal 2019 study, median), and Lithuania has a chronic shortage of truck drivers.

## 2. Solution (one sentence)
Residents tell the system when they actually need a pickup (book or skip), and the driver gets a route each morning built only from the houses that need it, opened in one tap in Google Maps or Waze.

## 3. Users
- **Resident (B2C, mobile web):** private house owner. Wants zero effort.
- **Driver (mobile web):** wants today's stops in the right order inside the navigation app they already use.
- **Ops / judges view (desktop web):** sees the map and the savings counter.

## 4. Pricing model (shown in the app, not real payments)
- Default: VASA fixed schedule stays. Non-users are not affected.
- In the app the resident can **skip** a scheduled pickup or **book** a pickup on another day (extra pickup, paid).
- "Pagal poreikį" (on-demand) tier: lower base fee, pay per booked pickup. Shown as a setting/info card only.
- All prices are constants in `lib/config.ts` (placeholders until we get the real VASA variable fee).

## 5. Data
- **Source:** VASA public container map API (atliekuaiksteles.vasa.lt), fetched 2026-10-09.
- **Demo area:** Pavilnys, Naujosios Vilnios sen. 319 private house / two-family bins (mostly 240L), all served by Ecoservice.
- **Seed file:** `data/pavilnys_houses.json` (fields: vasa_id, address, lat, lon, bin_volume_l, type, carrier, last_service, next_service).
- **Demo day:** 2026-10-16 has 145 houses scheduled on the same day. This is the "today's route" for the demo.
- **Constants (`lib/config.ts`):** FUEL_L_PER_100KM = 96, DIESEL_EUR_PER_L = 1.45 (to verify), CO2_KG_PER_L_DIESEL = 2.68, DEPOT = Ecoservice depot coords (to set).

## 6. Data model (Supabase, one shared DB for resident and driver)
- `households`: id, vasa_id, address, lat, lon, bin_volume_l, carrier, next_service (date), app_user (bool), is_demo_user (bool)
- `pickups`: id, household_id, date, time_window (nullable: 'rytas' | 'diena' | 'vakaras'), kind ('scheduled' | 'extra'), status ('planned' | 'skipped' | 'collected' | 'blocked'), price_eur, created_at
- Realtime enabled on `pickups` so the driver/ops views update live.
- Hackathon only: RLS off or fully permissive. No real auth.

**Who is on today's route:** all households with next_service = demo day and no `skipped` pickup, plus every `extra` pickup booked for that day.

## 7. Resident app (B2C), Lithuanian UI, mobile-first
Principle: open app, pick a day (and time if needed), done. Or skip. Nothing else on the main path.

1. **Onboarding (one screen):** prefilled demo user "Baldas Venkunskas". Type an address, pick from autocomplete (seeded households), "Tęsti". Under 10 seconds.
2. **Home:** card "Kitas išvežimas: [data]" plus two big buttons: "Užsakyti išvežimą" and "Praleisti".
3. **Book:** day chips for the next 7 days, optional time window collapsed under "Laikas (nebūtina)", price shown, "Patvirtinti". Then a success screen.
4. **Skip:** one confirm sheet: "Praleisti [data] išvežimą?" then "Išvežimas praleistas".
5. **Secondary (only if time):** history and "Sutaupėte X€ / Y kg CO2", report a blocked bin, on-demand tier info.

## 8. Driver app, mobile web
1. **Today's route:** ordered stop list and map. Order = nearest neighbour from depot plus 2-opt, computed in the browser.
2. **Open in Google Maps:** the route is split into legs of max 9 waypoints (Google Maps URL limit; mobile browsers allow only 3, so the link must open the Maps app). Button per leg: "1 dalis (1-10 stotelės)".
   Format: `https://www.google.com/maps/dir/?api=1&origin=LAT,LON&destination=LAT,LON&waypoints=LAT,LON|LAT,LON&travelmode=driving`
3. **Open in Waze:** Waze links take one destination only, so "Kita stotelė Waze" opens the next unvisited stop: `https://waze.com/ul?ll=LAT,LON&navigate=yes`
4. **Per stop:** "Paimta" (collected) and "Užstatyta" (blocked) buttons. Updates the DB.
5. Live: a new booking or skip updates the route without reload.

## 9. Ops / demo view, desktop
- Map of the demo area. Grey = skipped / not needed, green = on route.
- **Savings counter:** baseline route (all 145 scheduled houses) vs today's route (after skips/bookings): stops skipped, km saved, litres of diesel, € fuel, kg CO2.
- Km: OSRM public server (`router.project-osrm.org/route/v1/driving/...`) for the ordered stops; fallback = haversine x 1.3.
- Demo control: a "simulate adoption" slider that marks whole streets as app users who skip. Whole streets on purpose: savings only come when trucks can drop full street segments, not single houses.

## 10. The demo moment (build backwards from this)
Phone in hand: Baldas Venkunskas skips his pickup. On the big screen the stop turns grey, the route redraws and the counter ticks up. Then the driver taps "Atidaryti Google Maps" and the real route opens.

## 11. Tech
- Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel. Runs in any browser; judges open a link on their phone.
- Supabase (Postgres + Realtime). `@supabase/supabase-js`.
- Map: Leaflet + OpenStreetMap tiles (`react-leaflet`, client-only component).
- Routes: `/` resident app, `/driver` driver app, `/ops` demo dashboard.
- Design comes later. For now: Tailwind tokens only, Bolt-style big rounded buttons. Colours as tokens so they can be swapped: green `#1F6F4A`, clay `#C2734F`, sand background `#F6F1EA`, ink `#1B1B1B`.

## 12. Out of scope
Real auth, real payments, VASA integration, sensors for apartment blocks (pitch slide only), multi-truck routing, native apps.
