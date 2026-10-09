import type { ReactNode } from "react";
import {
  AVG_KM_SAVED_PER_SKIP,
  CO2_KG_PER_L_DIESEL,
  FUEL_L_PER_100KM,
  TIME_WINDOWS,
} from "@/lib/config";
import { capitalize, formatDay, todayISO } from "@/lib/dates";
import type { Household, Pickup } from "@/lib/pickups";

export function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl bg-white p-6 shadow-sm ${className}`}>
      {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">{title}</h2>}
      {children}
    </section>
  );
}

export function ContainerCard({ household }: { household: Household }) {
  const parts = [household.bin_volume_l && `${household.bin_volume_l}L`, household.carrier, "kas 2 sav."].filter(Boolean);
  return (
    <Card title="Jūsų konteineris">
      <p className="mt-3 text-xl font-bold">{parts.join(" · ")}</p>
      <p className="mt-1 text-ink/60">Mišrios komunalinės atliekos</p>
    </Card>
  );
}

function pickupLabel(p: Pickup): string {
  if (p.status === "skipped") return "Praleista";
  if (p.status === "collected") return "Išvežta";
  if (p.status === "blocked") return "Užstatyta";
  return p.kind === "extra" ? "Užsakyta" : "Suplanuota";
}

export function HistoryCard({ household, pickups }: { household: Household; pickups: Pickup[] }) {
  // Real VASA records, newest first. Dates look like "2026-10-02 11:47:38".
  const vasa = [...(household.history ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Card title="Paskutiniai išvežimai">
      {vasa.length === 0 ? (
        <p className="mt-3 text-ink/60">VASA įrašų nėra.</p>
      ) : (
        <ul className="mt-2 divide-y divide-ink/10">
          {vasa.map((r) => (
            <li key={r.date} className="flex items-baseline justify-between gap-3 py-2.5">
              <span>{capitalize(formatDay(r.date.slice(0, 10)))}</span>
              {r.serviced ? (
                <span className="text-right text-green">
                  Išvežta <span className="text-ink/50">{r.date.slice(11, 16)}</span>
                </span>
              ) : (
                <span className="text-right text-clay">{r.reason ?? "Neišvežta"}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {pickups.length > 0 && (
        <>
          <h3 className="mt-5 text-sm font-semibold text-ink/50">Jūsų veiksmai</h3>
          <ul className="mt-1 divide-y divide-ink/10">
            {pickups.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-3 py-2.5">
                <span>
                  {capitalize(formatDay(p.date))}
                  {p.kind === "extra" && p.time_window && (
                    <span className="text-ink/50"> · {TIME_WINDOWS[p.time_window].split(" ")[0]}</span>
                  )}
                </span>
                <span className={`text-right ${p.status === "skipped" ? "text-ink/50" : "text-clay"}`}>
                  {pickupLabel(p)}
                  {p.kind === "extra" && ` · ${Number(p.price_eur)}€`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

const num = new Intl.NumberFormat("lt-LT", { maximumFractionDigits: 1 });

export function ImpactCard({ pickups }: { pickups: Pickup[] }) {
  const year = todayISO().slice(0, 4);
  const skips = pickups.filter((p) => p.status === "skipped" && p.date.startsWith(year)).length;
  const co2 = skips * AVG_KM_SAVED_PER_SKIP * (FUEL_L_PER_100KM / 100) * CO2_KG_PER_L_DIESEL;
  return (
    <Card title="Jūsų poveikis">
      <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
        <Stat value={String(skips)} label={`praleista ${year} m.`} />
        <Stat value={String(skips)} label="išvengta sustojimų" />
        <Stat value={co2 ? `≈${num.format(co2)}` : "0"} label="kg CO₂" />
      </dl>
      <p className="mt-4 text-xs text-ink/40">Apytikslis skaičiavimas.</p>
    </Card>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-sand px-2 py-3">
      <dd className="text-2xl font-bold text-green">{value}</dd>
      <dt className="mt-1 text-xs text-ink/60">{label}</dt>
    </div>
  );
}

