// All tunable numbers in one place. See PRD sections 4 and 5.

// --- Demo data (PRD section 5) ---

// The app's "today". The demo runs on the evening before the big pickup day; use this instead of the real date.
export const DEMO_TODAY = "2026-10-15";

// Day used as "today's route" in the demo: 145 Pavilnys houses are scheduled on it.
export const DEMO_DAY = "2026-10-16";

// VASA id of the household seeded as the demo resident (Alfonso Lipniūno g. 13, scheduled on DEMO_DAY).
export const DEMO_VASA_ID = 15753;

// Display name of the prefilled demo resident (PRD section 7).
export const DEMO_USER_NAME = "Baldas Venkunskas";

// Map centre for the Pavilnys demo area (mean of seeded house coordinates).
export const DEMO_AREA_CENTER: [number, number] = [54.6781, 25.3748];

// --- Fuel / emissions (PRD section 5) ---

// Garbage truck fuel use in stop-and-go collection, litres per 100 km (Cascais 2019 study, median).
export const FUEL_L_PER_100KM = 96;

// Diesel price in EUR per litre. TODO: verify current Lithuanian price.
export const DIESEL_EUR_PER_L = 1.45;

// kg of CO2 emitted per litre of diesel burned.
export const CO2_KG_PER_L_DIESEL = 2.68;

// Ecoservice depot coordinates [lat, lon], start/end of the driver route.
// TODO: set real depot coords. Placeholder = centre of the demo area.
export const DEPOT: [number, number] = [54.6781, 25.3748];

// Fallback when OSRM is unavailable: straight-line (haversine) distance times this factor.
export const HAVERSINE_ROAD_FACTOR = 1.3;

// --- Pricing placeholders (PRD section 4). Not real payments. ---

// Monthly base fee on the standard VASA fixed schedule, EUR. Placeholder.
export const BASE_FEE_STANDARD = 10.0;

// Monthly base fee on the "Pagal poreikį" (on-demand) tier, EUR. Placeholder, lower than standard.
export const BASE_FEE_ON_DEMAND = 5.0;

// Price of one extra (booked, off-schedule) pickup, EUR. Placeholder until VASA's variable fee is known.
export const EXTRA_PICKUP_PRICE_EUR = 4.0;

// Price of one pickup on the on-demand tier, EUR. Placeholder.
export const ON_DEMAND_PICKUP_PRICE_EUR = 3.0;

// Refund/credit for skipping a scheduled pickup, EUR. Placeholder (0 = no money back on standard tier).
export const SKIP_CREDIT_EUR = 0;

// --- Resident booking (PRD section 7) ---

// How many days ahead the resident can book a pickup.
export const BOOKING_DAYS_AHEAD = 7;

// Optional time windows for a booked pickup (value stored in pickups.time_window -> Lithuanian label).
export const TIME_WINDOWS = {
  rytas: "Rytas 7–11",
  diena: "Diena 11–16",
  vakaras: "Vakaras 16–21",
} as const;

export type TimeWindow = keyof typeof TIME_WINDOWS;

// Days between fixed-schedule pickups (26x per year).
export const SCHEDULE_INTERVAL_DAYS = 14;

// --- Driver (PRD section 8) ---

// Max waypoints per Google Maps directions link (URL limit is 9 between origin and destination).
export const GOOGLE_MAPS_MAX_WAYPOINTS = 9;
