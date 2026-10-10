// Seed households from data/pilaite_houses.json. Run: npm run seed
// Households not in the file (e.g. the old Pavilnys set) are deleted first; their pickups go with them (on delete cascade).
// Uses the service role key from .env.local (server-side only, never shipped to the browser).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { DEMO_DAY, DEMO_VASA_ID } from "../lib/config";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

type House = {
  vasa_id: number;
  address: string;
  lat: number;
  lon: number;
  bin_volume_l: number;
  type: string;
  carrier: string;
  last_service: string | null;
  next_service: string | null;
  history?: { date: string; serviced: boolean; reason: string | null }[];
};

const { houses } = JSON.parse(
  readFileSync(join(process.cwd(), "data/pilaite_houses.json"), "utf8"),
) as { houses: House[] };

const demo = houses.find((h) => h.vasa_id === DEMO_VASA_ID);
if (!demo || demo.next_service !== DEMO_DAY) {
  console.error(`Demo household ${DEMO_VASA_ID} missing or not scheduled on ${DEMO_DAY}`);
  process.exit(1);
}

const rows = houses.map((h) => {
  const isDemo = h.vasa_id === DEMO_VASA_ID;
  return {
    vasa_id: h.vasa_id,
    address: h.address,
    lat: h.lat,
    lon: h.lon,
    bin_volume_l: h.bin_volume_l,
    type: h.type,
    carrier: h.carrier,
    last_service: h.last_service,
    next_service: h.next_service,
    history: h.history ?? [],
    // Exactly one demo user; everyone else is reset to non-user on re-seed.
    app_user: isDemo,
    is_demo_user: isDemo,
  };
});

async function main(url: string, serviceKey: string, demo: House) {
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Drop households that are no longer in the seed file.
  const keep = new Set(rows.map((r) => r.vasa_id));
  const existing = (await supabase.from("households").select("id, vasa_id")).data ?? [];
  const stale = existing.filter((h) => !keep.has(h.vasa_id)).map((h) => h.id);
  for (let i = 0; i < stale.length; i += 200) {
    const del = await supabase.from("households").delete().in("id", stale.slice(i, i + 200));
    if (del.error) {
      console.error("Delete failed:", del.error.message);
      process.exit(1);
    }
  }
  if (stale.length) console.log(`Deleted ${stale.length} old households (and their pickups).`);

  const { error } = await supabase.from("households").upsert(rows, { onConflict: "vasa_id" });
  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  const { count } = await supabase.from("households").select("*", { count: "exact", head: true });
  console.log(`Upserted ${rows.length} houses (table now has ${count}). Demo user: ${demo.address} (vasa_id ${DEMO_VASA_ID}).`);
}

main(url, serviceKey, demo);
