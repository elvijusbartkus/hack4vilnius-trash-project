import { supabase } from "@/lib/supabase";
import { EXTRA_PICKUP_PRICE_EUR, SCHEDULE_INTERVAL_DAYS, type TimeWindow } from "@/lib/config";
import { addDays, todayISO } from "@/lib/dates";

// One real VASA service record, e.g. { date: "2026-10-02 11:47:38", serviced: true, reason: null }
export type ServiceRecord = { date: string; serviced: boolean; reason: string | null };

export type Household = {
  id: number;
  vasa_id: number;
  address: string;
  lat: number;
  lon: number;
  bin_volume_l: number | null;
  carrier: string | null;
  next_service: string | null;
  is_demo_user: boolean;
  history: ServiceRecord[];
};

export type Pickup = {
  id: number;
  household_id: number;
  date: string;
  time_window: TimeWindow | null;
  kind: "scheduled" | "extra";
  status: "planned" | "skipped" | "collected" | "blocked";
  price_eur: number;
  created_at: string;
};

export type NextPickup = {
  date: string;
  kind: "scheduled" | "extra";
  timeWindow: TimeWindow | null;
};

export type HouseholdState = {
  household: Household;
  pickups: Pickup[]; // all app pickups for this household, newest date first
  scheduledDate: string | null; // current fixed-schedule date (next_service rolled forward to today or later)
  skip: Pickup | null; // skip row for scheduledDate, if any
  nextScheduledDate: string | null; // scheduledDate, or +14 days if it is skipped
  extras: Pickup[]; // planned extra pickups from today on, soonest first
  next: NextPickup | null;
};

const HOUSEHOLD_COLUMNS = "id, vasa_id, address, lat, lon, bin_volume_l, carrier, next_service, is_demo_user, history";

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function getDemoHousehold(): Promise<Household | null> {
  const rows = check(
    await supabase.from("households").select(HOUSEHOLD_COLUMNS).eq("is_demo_user", true).limit(1),
  );
  return (rows?.[0] as Household) ?? null;
}

export async function searchHouseholds(query: string): Promise<Household[]> {
  const rows = check(
    await supabase
      .from("households")
      .select(HOUSEHOLD_COLUMNS)
      .ilike("address", `%${query}%`)
      .order("address")
      .limit(6),
  );
  return (rows ?? []) as Household[];
}

export async function getHousehold(id: number): Promise<Household | null> {
  const rows = check(await supabase.from("households").select(HOUSEHOLD_COLUMNS).eq("id", id).limit(1));
  return (rows?.[0] as Household) ?? null;
}

// Next pickup = earliest date >= today among planned extra pickups and the scheduled date.
// A skipped scheduled date moves the scheduled pickup to next_service + 14 days.
export async function getNextPickup(householdId: number): Promise<HouseholdState> {
  const today = todayISO();
  const [household, pickups] = await Promise.all([
    supabase.from("households").select(HOUSEHOLD_COLUMNS).eq("id", householdId).single().then(check),
    supabase
      .from("pickups")
      .select("*")
      .eq("household_id", householdId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .then(check),
  ]);
  const h = household as Household;
  const rows = (pickups ?? []) as Pickup[];

  let scheduledDate = h.next_service;
  while (scheduledDate && scheduledDate < today) scheduledDate = addDays(scheduledDate, SCHEDULE_INTERVAL_DAYS);

  const skip = rows.find((p) => p.kind === "scheduled" && p.status === "skipped" && p.date === scheduledDate) ?? null;
  const nextScheduledDate = scheduledDate && skip ? addDays(scheduledDate, SCHEDULE_INTERVAL_DAYS) : scheduledDate;
  const extras = rows
    .filter((p) => p.kind === "extra" && p.status === "planned" && p.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const candidates: NextPickup[] = extras.map((p) => ({ date: p.date, kind: "extra", timeWindow: p.time_window }));
  if (nextScheduledDate) candidates.push({ date: nextScheduledDate, kind: "scheduled", timeWindow: null });
  candidates.sort((a, b) => a.date.localeCompare(b.date));

  return { household: h, pickups: rows, scheduledDate, skip, nextScheduledDate, extras, next: candidates[0] ?? null };
}

// Inserts return the new row id so the toast can undo them.
export async function bookExtra(householdId: number, date: string, timeWindow: TimeWindow | null): Promise<number> {
  const row = check(
    await supabase
      .from("pickups")
      .insert({
        household_id: householdId,
        date,
        time_window: timeWindow,
        kind: "extra",
        status: "planned",
        price_eur: EXTRA_PICKUP_PRICE_EUR,
      })
      .select("id")
      .single(),
  );
  return (row as { id: number }).id;
}

// Cancelling a booked extra pickup removes the row (it never reaches the driver route).
export async function cancelExtra(pickupId: number) {
  check(await supabase.from("pickups").delete().eq("id", pickupId));
}

export async function skipScheduled(householdId: number, date: string): Promise<number> {
  const row = check(
    await supabase
      .from("pickups")
      .insert({ household_id: householdId, date, kind: "scheduled", status: "skipped", price_eur: 0 })
      .select("id")
      .single(),
  );
  return (row as { id: number }).id;
}

export async function undoSkip(pickupId: number) {
  check(await supabase.from("pickups").delete().eq("id", pickupId));
}

export async function resetHousehold(householdId: number) {
  check(await supabase.from("pickups").delete().eq("household_id", householdId));
}

// Tomorrow's truck route for the demo day: scheduled houses minus skips plus booked extras.
export type RouteStats = { date: string; scheduled: number; skipped: number; extras: number; onRoute: number };

export async function getRouteStats(date: string): Promise<RouteStats> {
  const [houses, rows] = await Promise.all([
    supabase.from("households").select("id", { count: "exact", head: true }).eq("next_service", date),
    supabase.from("pickups").select("kind, status").eq("date", date).then(check),
  ]);
  if (houses.error) throw new Error(houses.error.message);
  const scheduled = houses.count ?? 0;
  const list = (rows ?? []) as Pick<Pickup, "kind" | "status">[];
  const skipped = list.filter((p) => p.kind === "scheduled" && p.status === "skipped").length;
  const extras = list.filter((p) => p.kind === "extra" && p.status === "planned").length;
  return { date, scheduled, skipped, extras, onRoute: scheduled - skipped + extras };
}

// Live updates: calls onChange whenever any pickup row changes (driver/ops/other residents).
export function subscribePickups(onChange: () => void): () => void {
  const channel = supabase
    .channel(`pickups-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "pickups" }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// Manifest lines for a route day: every scheduled house plus booked extras, numbered by address.
export type ManifestLine = {
  no: number;
  householdId: number;
  address: string;
  binVolume: number | null;
  status: "planned" | "skipped" | "extra";
};

export async function getRouteManifest(date: string): Promise<ManifestLine[]> {
  const [scheduled, rows] = await Promise.all([
    supabase
      .from("households")
      .select("id, address, bin_volume_l")
      .eq("next_service", date)
      .order("address")
      .then(check),
    supabase.from("pickups").select("household_id, kind, status").eq("date", date).then(check),
  ]);
  const pickups = (rows ?? []) as Pick<Pickup, "household_id" | "kind" | "status">[];
  const skipped = new Set(pickups.filter((p) => p.kind === "scheduled" && p.status === "skipped").map((p) => p.household_id));
  const extraIds = [
    ...new Set(pickups.filter((p) => p.kind === "extra" && p.status === "planned").map((p) => p.household_id)),
  ];
  const houses = (scheduled ?? []) as { id: number; address: string; bin_volume_l: number | null }[];
  const scheduledIds = new Set(houses.map((h) => h.id));

  let extras: typeof houses = [];
  const missing = extraIds.filter((id) => !scheduledIds.has(id));
  if (missing.length) {
    extras = (check(await supabase.from("households").select("id, address, bin_volume_l").in("id", missing)) ?? []) as typeof houses;
  }

  return [
    ...houses.map((h) => ({ h, status: skipped.has(h.id) ? ("skipped" as const) : ("planned" as const) })),
    ...extras.map((h) => ({ h, status: "extra" as const })),
  ]
    .sort((a, b) => a.h.address.localeCompare(b.h.address, "lt"))
    .map(({ h, status }, i) => ({ no: i + 1, householdId: h.id, address: h.address, binVolume: h.bin_volume_l, status }));
}
