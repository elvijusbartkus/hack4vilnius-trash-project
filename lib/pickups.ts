import { supabase } from "@/lib/supabase";
import { EXTRA_PICKUP_PRICE_EUR, SCHEDULE_INTERVAL_DAYS, type TimeWindow, type WasteType } from "@/lib/config";
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
  waste_type?: WasteType | null; // needs migration 004; absent until it has run
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
  skip: Pickup | null; // skip row for scheduledDate, if any ("Ne, nereikia")
  confirmed: Pickup | null; // planned scheduled row for scheduledDate ("Taip, išstumsiu")
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
  const confirmed = rows.find((p) => p.kind === "scheduled" && p.status === "planned" && p.date === scheduledDate) ?? null;
  const nextScheduledDate = scheduledDate && skip ? addDays(scheduledDate, SCHEDULE_INTERVAL_DAYS) : scheduledDate;
  const extras = rows
    .filter((p) => p.kind === "extra" && p.status === "planned" && p.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const candidates: NextPickup[] = extras.map((p) => ({ date: p.date, kind: "extra", timeWindow: p.time_window }));
  if (nextScheduledDate) candidates.push({ date: nextScheduledDate, kind: "scheduled", timeWindow: null });
  candidates.sort((a, b) => a.date.localeCompare(b.date));

  return { household: h, pickups: rows, scheduledDate, skip, confirmed, nextScheduledDate, extras, next: candidates[0] ?? null };
}

// Inserts return the new row id so the toast can undo them.
export async function bookExtra(
  householdId: number,
  date: string,
  timeWindow: TimeWindow | null,
  wasteType: WasteType | null = null,
): Promise<number> {
  const row: Record<string, unknown> = {
    household_id: householdId,
    date,
    time_window: timeWindow,
    kind: "extra",
    status: "planned",
    price_eur: EXTRA_PICKUP_PRICE_EUR,
  };
  let res = await supabase
    .from("pickups")
    .insert(wasteType ? { ...row, waste_type: wasteType } : row)
    .select("id")
    .single();
  // Before migration 004 has run there is no waste_type column: keep the booking, drop the type.
  if (res.error && wasteType && /waste_type/.test(res.error.message)) {
    res = await supabase.from("pickups").insert(row).select("id").single();
  }
  return (check(res) as { id: number }).id;
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

// "Taip, išstumsiu": the resident confirms the scheduled pickup (kind 'scheduled', status 'planned').
export async function confirmScheduled(householdId: number, date: string): Promise<number> {
  const row = check(
    await supabase
      .from("pickups")
      .insert({ household_id: householdId, date, kind: "scheduled", status: "planned", price_eur: 0 })
      .select("id")
      .single(),
  );
  return (row as { id: number }).id;
}

// Removes one pickup row (undo of a confirm, skip or booking).
export async function removePickup(pickupId: number) {
  check(await supabase.from("pickups").delete().eq("id", pickupId));
}

export async function undoSkip(pickupId: number) {
  check(await supabase.from("pickups").delete().eq("id", pickupId));
}

export async function resetHousehold(householdId: number) {
  check(await supabase.from("pickups").delete().eq("household_id", householdId));
}

// Demo reset: neighbours who answered "Ne, nereikia" for the route day (see DEMO_SEEDED_SKIP_VASA_IDS).
// Their pickups for that day are replaced, so repeated resets never stack rows.
export async function seedNeighbourSkips(vasaIds: number[], day: string) {
  const houses = check(await supabase.from("households").select("id").in("vasa_id", vasaIds)) ?? [];
  const ids = houses.map((h: { id: number }) => h.id);
  if (!ids.length) return;
  check(await supabase.from("pickups").delete().in("household_id", ids).eq("date", day));
  check(
    await supabase
      .from("pickups")
      .insert(ids.map((id: number) => ({ household_id: id, date: day, kind: "scheduled", status: "skipped", price_eur: 0 }))),
  );
}

// Live updates: calls onChange whenever any pickup row changes (other tabs, the driver app later).
export function subscribePickups(onChange: () => void): () => void {
  const channel = supabase
    .channel(`pickups-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "pickups" }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// Demo history for the reset: four earlier reminders answered (three "Taip", one "Ne"), every
// two weeks back from the demo day. The "Ne" sits before the VASA history window, so it never
// contradicts a real "Išvežta" record.
export async function seedDemoActivity(householdId: number, demoDay: string) {
  const answers: { weeksBack: number; status: "planned" | "skipped" }[] = [
    { weeksBack: 2, status: "planned" },
    { weeksBack: 4, status: "planned" },
    { weeksBack: 6, status: "planned" },
    { weeksBack: 8, status: "skipped" },
  ];
  check(
    await supabase.from("pickups").insert(
      answers.map((a) => ({
        household_id: householdId,
        date: addDays(demoDay, -7 * a.weeksBack),
        kind: "scheduled",
        status: a.status,
        price_eur: 0,
      })),
    ),
  );
}
