import { useId, type ReactNode } from "react";
import {
  AVG_KM_SAVED_PER_SKIP,
  EXTRA_AMOUNTS,
  CO2_KG_PER_L_DIESEL,
  FUEL_L_PER_100KM,
  TIME_WINDOWS,
} from "@/lib/config";
import { formatDayCap, todayISO } from "@/lib/dates";
import type { Household, Pickup } from "@/lib/pickups";

// A separate panel: its own surface, its own heading, space between panels (never merged).
export function Panel({
  title,
  children,
  className = "",
  action,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={`rounded-[4px] border border-rule/70 bg-sheet px-5 py-5 md:px-6 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="font-display text-xl font-semibold text-ink">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: [ReactNode, ReactNode, string?][] }) {
  return (
    <dl className="mt-2 divide-y divide-rule/60">
      {rows.map(([k, v, cls], i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-1.5">
          <dt className="text-stone-deep">{k}</dt>
          <dd className={`text-right font-display text-[1.05rem] font-semibold ${cls ?? ""}`}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function pickupLabel(p: Pickup): string {
  if (p.status === "skipped") return p.date < todayISO() ? "Nevažiavo" : "Nevažiuos";
  if (p.status === "collected") return "Išvežta";
  if (p.status === "blocked") return "Užstatyta";
  return p.kind === "extra" ? "Papildomas" : "Patvirtinta";
}

export function HistoryField({ household, pickups }: { household: Household; pickups: Pickup[] }) {
  // Real VASA records, newest first. Dates look like "2026-10-02 11:47:38".
  const vasa = [...(household.history ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Panel title="Paskutiniai išvežimai">
      {vasa.length === 0 ? (
        <p className="mt-3 text-stone-deep">VASA įrašų dar nėra.</p>
      ) : (
        <Rows
          rows={vasa.map((r) =>
            r.serviced
              ? [formatDayCap(r.date.slice(0, 10)), `Išvežta ${r.date.slice(11, 16)}`, "text-green"]
              : [formatDayCap(r.date.slice(0, 10)), r.reason ?? "Neišvežta", "text-clay-deep"],
          )}
        />
      )}
      {pickups.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-semibold text-green-muted">Jūsų veiksmai</h3>
          <Rows
            rows={pickups.map((p) => [
              <>
                {formatDayCap(p.date)}
                {p.kind === "extra" && p.time_window && (
                  <span className="text-stone-deep"> · {TIME_WINDOWS[p.time_window].split(" ")[0]}</span>
                )}
              </>,
              `${pickupLabel(p)}${p.kind === "extra" && p.amount ? ` · ${EXTRA_AMOUNTS[p.amount]}` : ""}`,
              p.status === "skipped" || p.kind === "extra" ? "text-clay-deep" : "text-green",
            ])}
          />
        </>
      )}
    </Panel>
  );
}

const num = new Intl.NumberFormat("lt-LT", { maximumFractionDigits: 1 });

// N answers to the evening question; every "Ne" is a stop the truck did not need to make.
export function ImpactField({ pickups }: { pickups: Pickup[] }) {
  const answers = pickups.filter((p) => p.kind === "scheduled" && (p.status === "planned" || p.status === "skipped")).length;
  const no = pickups.filter((p) => p.kind === "scheduled" && p.status === "skipped").length;
  const perSkip = AVG_KM_SAVED_PER_SKIP * (FUEL_L_PER_100KM / 100) * CO2_KG_PER_L_DIESEL;
  return (
    <Panel title="Jūsų poveikis">
      <Rows
        rows={[
          ["Atsakyta į priminimus", answers],
          ["Sutaupyta sustojimų", no],
        ]}
      />
      <p className="mt-2 font-semibold">Iš viso {num.format(no * perSkip)}&nbsp;kg CO₂ mažiau</p>
      <p className="mt-1 text-sm leading-snug text-stone-deep">
        {num.format(perSkip)}kg CO₂ mažiau už kiekvieną sutaupytą sustojimą
      </p>
    </Panel>
  );
}
