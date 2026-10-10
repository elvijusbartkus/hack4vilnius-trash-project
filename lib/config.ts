// All tunable numbers in one place. See PRD sections 4 and 5.

// Product name placeholder (working name until we pick one).
export const APP_NAME = "WasteWise";

// --- Demo data (PRD section 5) ---

// The app's "today". The demo runs on the evening before the big pickup day; use this instead of the real date.
export const DEMO_TODAY = "2026-10-21";

// Day used as "today's route" in the demo: 117 Pilaitė houses are scheduled on it.
export const DEMO_DAY = "2026-10-22";

// VASA id of the household seeded as the demo resident (Darkiemio g. 13, Pilaitė, scheduled on DEMO_DAY).
export const DEMO_VASA_ID = 9175;

// Neighbours whose "Ne, nereikia" for DEMO_DAY is seeded by the demo reset (/?reset=1), so the
// driver's route starts with a few real skips: Pajautos g. 8A, Vištyčio g. 4, Stalupėnų g. 56-2 and 54.
export const DEMO_SEEDED_SKIP_VASA_IDS = [3602, 3600, 13886, 4113];

// Display name of the prefilled demo resident (PRD section 7).
export const DEMO_USER_NAME = "Žygimantas Bakanas";

// Map centre for the Pilaitė demo area (mean of seeded house coordinates).
export const DEMO_AREA_CENTER: [number, number] = [54.7088, 25.1882];

// --- Fuel / emissions (PRD section 5) ---

// Garbage truck fuel use in stop-and-go collection, litres per 100 km (Cascais 2019 study, median).
export const FUEL_L_PER_100KM = 96;

// Diesel price in EUR per litre. TODO: verify current Lithuanian price.
export const DIESEL_EUR_PER_L = 1.45;

// kg of CO2 emitted per litre of diesel burned.
export const CO2_KG_PER_L_DIESEL = 2.68;

// Depot [lat, lon] where driver routes start and end: the driver app's base, Jočionių g. 13.
export const DEPOT: [number, number] = [54.6508, 25.2731];

// PLACEHOLDER: average truck km saved per skipped stop, for the resident impact card. Not measured.
export const AVG_KM_SAVED_PER_SKIP = 0.3;

// Fallback when OSRM is unavailable: straight-line (haversine) distance times this factor.
export const HAVERSINE_ROAD_FACTOR = 1.3;

// Public OSRM server for road distances of the driver route (demo use only).
export const OSRM_URL = "https://router.project-osrm.org";

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

// --- Invoices (mock-up only: no real payments), billed monthly ---

// PLACEHOLDER amounts. Vilnius bills the local waste fee in two parts:
// a fixed part (pastovioji dalis) and a variable part by bin size and scheduled emptyings (kintamoji dalis).
export const INVOICE_FIXED_EUR = 2.95;
export const INVOICE_PER_EMPTYING_EUR = 1.95; // per scheduled emptying of a 240 L bin

// Current invoice month, due date (ISO) and the date range whose extra pickups are added to it.
export const INVOICE_PERIOD = "2026 m. spalis";
export const INVOICE_DUE = "2026-11-15";
export const INVOICE_RANGE: [string, string] = ["2026-10-01", "2026-10-31"];

// Earlier months shown as paid (amounts blurred in the list, full breakdown when opened).
export const PAST_INVOICES: { period: string; range: [string, string] }[] = [
  { period: "2026 m. rugsėjis", range: ["2026-09-01", "2026-09-30"] },
  { period: "2026 m. rugpjūtis", range: ["2026-08-01", "2026-08-31"] },
  { period: "2026 m. liepa", range: ["2026-07-01", "2026-07-31"] },
];

// --- Resident booking (PRD section 7) ---

// Days shown in the resident calendar (starting today), four weeks.
export const CALENDAR_DAYS = 28;

// How many days ahead the resident can book a pickup.
export const BOOKING_DAYS_AHEAD = 7;

// Optional time windows for a booked pickup (value stored in pickups.time_window -> Lithuanian label).
export const TIME_WINDOWS = {
  rytas: "Rytas 7–11",
  diena: "Diena 11–16",
  vakaras: "Vakaras 16–21",
} as const;

export type TimeWindow = keyof typeof TIME_WINDOWS;

// Which bin an extra pickup is for (stored in pickups.waste_type, migration 004).
export const WASTE_TYPES = {
  mixed: "Mišrios atliekos",
  packaging: "Pakuotės",
  glass: "Stiklas",
  green: "Žaliosios atliekos",
} as const;

export type WasteType = keyof typeof WASTE_TYPES;

// The household's regular bin (all seeded Pilaitė bins are mixed municipal waste).
export const HOUSEHOLD_WASTE_TYPE: WasteType = "mixed";

// Days between fixed-schedule pickups (26x per year).
export const SCHEDULE_INTERVAL_DAYS = 14;

