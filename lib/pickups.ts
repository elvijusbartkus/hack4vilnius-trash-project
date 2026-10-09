import { supabase } from "@/lib/supabase";
import { EXTRA_PICKUP_PRICE_EUR, SCHEDULE_INTERVAL_DAYS, type TimeWindow } from "@/lib/config";
import { addDays, todayISO } from "@/lib/dates";

export type Household = {
  id: number;
  vasa_id: number;
  address: string;
  lat: number;
  lon: number;
  next_service: string | null;
  is_demo_user: boolean;
};

export type Pickup = {
  id: number;
  household_id: number;
  date: string;
  time_window: TimeWindow | null;
  kind: "scheduled" | "extra";
  status: "planned" | "skipped" | "collected" | "blocked";
  price_eur: number;
};

export type NextPickup = {
  date: string;
  kind: "scheduled" | "extra";
  timeWindow: TimeWindow | null;
};

export type HouseholdState = {
  household: Household;
  scheduledDate: string | null; // the current fixed-schedule date (next_service rolled forward to today or later)
  skip: Pickup | null; // skip row for scheduledDate, if any
  next: NextPickup | null;
};

const HOUSEHOLD_COLUMNS = "id, vasa_id, address, lat, lon, next_service, is_demo_user";

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

// Next pickup = earliest date >= today among planned extra pickups and the scheduled date.
// A skipped scheduled date moves the scheduled pickup to next_service + 14 days.
export async function getNextPickup(householdId: number): Promise<HouseholdState> {
  const today = todayISO();
  const [household, pickups] = await Promise.all([
    supabase.from("households").select(HOUSEHOLD_COLUMNS).eq("id", householdId).single().then(check),
    supabase.from("pickups").select("*").eq("household_id", householdId).gte("date", today).then(check),
  ]);
  const h = household as Household;
  const rows = (pickups ?? []) as Pickup[];

  let scheduledDate = h.next_service;
  while (scheduledDate && scheduledDate < today) scheduledDate = addDays(scheduledDate, SCHEDULE_INTERVAL_DAYS);

  const skip = rows.find((p) => p.kind === "scheduled" && p.status === "skipped" && p.date === scheduledDate) ?? null;

  const candidates: NextPickup[] = rows
    .filter((p) => p.kind === "extra" && p.status === "planned")
    .map((p) => ({ date: p.date, kind: "extra", timeWindow: p.time_window }));
  if (scheduledDate) {
    candidates.push({
      date: skip ? addDays(scheduledDate, SCHEDULE_INTERVAL_DAYS) : scheduledDate,
      kind: "scheduled",
      timeWindow: null,
    });
  }
  candidates.sort((a, b) => a.date.localeCompare(b.date));

  return { household: h, scheduledDate, skip, next: candidates[0] ?? null };
}

export async function bookExtra(householdId: number, date: string, timeWindow: TimeWindow | null) {
  check(
    await supabase.from("pickups").insert({
      household_id: householdId,
      date,
      time_window: timeWindow,
      kind: "extra",
      status: "planned",
      price_eur: EXTRA_PICKUP_PRICE_EUR,
    }),
  );
}

export async function skipScheduled(householdId: number, date: string) {
  check(
    await supabase.from("pickups").insert({
      household_id: householdId,
      date,
      kind: "scheduled",
      status: "skipped",
      price_eur: 0,
    }),
  );
}

export async function undoSkip(pickupId: number) {
  check(await supabase.from("pickups").delete().eq("id", pickupId));
}

export async function resetHousehold(householdId: number) {
  check(await supabase.from("pickups").delete().eq("household_id", householdId));
}
