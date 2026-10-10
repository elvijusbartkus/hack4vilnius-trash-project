import { useId, type ReactNode } from "react";
import { AVG_KM_SAVED_PER_SKIP, CO2_KG_PER_L_DIESEL, FUEL_L_PER_100KM } from "@/lib/config";
import { formatDayCap, plural, todayISO } from "@/lib/dates";
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

export function HistoryField({ household }: { household: Household }) {
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
              : [formatDayCap(r.date.slice(0, 10)), r.reason ?? "Neišvežta", "text-orange-deep"],
          )}
        />
      )}
    </Panel>
  );
}

const num = new Intl.NumberFormat("lt-LT", { maximumFractionDigits: 1 });

// CO₂ first: the one number a resident cares about, then what it came from.
export function ImpactField({ pickups }: { pickups: Pickup[] }) {
  const year = todayISO().slice(0, 4);
  const mine = pickups.filter((p) => p.kind === "scheduled" && p.date.startsWith(year));
  const answers = mine.filter((p) => p.status === "planned" || p.status === "skipped").length;
  const no = mine.filter((p) => p.status === "skipped").length;
  const perSkip = AVG_KM_SAVED_PER_SKIP * (FUEL_L_PER_100KM / 100) * CO2_KG_PER_L_DIESEL;
  return (
    <Panel title="Jūsų poveikis">
      <p className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-5xl font-semibold leading-none text-green">{num.format(no * perSkip)}</span>
        <span className="font-display text-xl font-semibold text-green">kg CO₂</span>
      </p>
      <p className="mt-1 font-semibold">mažiau išmetė šiukšliavežė {year} m.</p>
      {no > 0 ? (
        <p className="mt-3 leading-snug text-stone-deep">
          {plural(no, { one: "kartą", few: "kartus", many: "kartų" })} atsakėte „Ne, nereikia“, todėl šiukšliavežei nereikėjo
          važiuoti pas jus. Kiekvienas toks kartas: {num.format(perSkip)}kg CO₂ mažiau.
        </p>
      ) : (
        <p className="mt-3 leading-snug text-stone-deep">
          Kai konteineris nepilnas, atsakykite „Ne, nereikia“: kiekvienas kartas sutaupo {num.format(perSkip)}kg CO₂.
        </p>
      )}
      <p className="mt-3 border-t border-rule/60 pt-2 text-sm text-stone-deep">
        Atsakyta į {plural(answers, { one: "priminimą", few: "priminimus", many: "priminimų" })}
      </p>
    </Panel>
  );
}
