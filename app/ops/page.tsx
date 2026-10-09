"use client";

import { useCallback, useEffect, useState } from "react";
import { LogoMark, TruckIcon } from "@/components/dashboard/Icons";
import ManifestLineRow from "@/components/dashboard/ManifestLine";
import {
  APP_NAME,
  AVG_KM_SAVED_PER_SKIP,
  CO2_KG_PER_L_DIESEL,
  DEMO_DAY,
  DIESEL_EUR_PER_L,
  FUEL_L_PER_100KM,
} from "@/lib/config";
import { capitalize, formatDay, formatWeekday, plural } from "@/lib/dates";
import { getRouteManifest, getRouteStats, subscribePickups, type ManifestLine, type RouteStats } from "@/lib/pickups";

const num = new Intl.NumberFormat("lt-LT", { maximumFractionDigits: 1 });
const exact = new Intl.NumberFormat("lt-LT", { maximumFractionDigits: 2 }); // constants shown as configured
const eur = new Intl.NumberFormat("lt-LT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

// Ops / judges view: tomorrow's route as the truck manifest, one ruled line per stop,
// struck and stamped live as residents skip. The map (PRD section 9) comes later.
export default function OpsPage() {
  const [route, setRoute] = useState<RouteStats | null>(null);
  const [lines, setLines] = useState<ManifestLine[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(
    () =>
      Promise.all([getRouteStats(DEMO_DAY), getRouteManifest(DEMO_DAY)])
        .then(([r, m]) => {
          setRoute(r);
          setLines(m);
          setError(false);
        })
        .catch(() => setError(true)),
    [],
  );

  useEffect(() => {
    load();
    return subscribePickups(load);
  }, [load]);

  const km = (route?.skipped ?? 0) * AVG_KM_SAVED_PER_SKIP;
  const litres = (km * FUEL_L_PER_100KM) / 100;
  // Changed lines first so the demo moment is visible without scrolling 145 rows.
  const changed = lines.filter((l) => l.status !== "planned");

  return (
    <div className="min-h-dvh bg-ground">
      <header className="border-b border-clay/60">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3 md:px-8">
          <span className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-2xl font-bold tracking-tight text-green">{APP_NAME}</span>
          </span>
          <span className="text-clay-deep">Operacijų skydelis</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-3 py-6 md:px-8 md:py-8">
        {error && (
          <p role="alert" className="mb-4 rounded-[3px] border border-clay bg-sheet-hi px-5 py-3 text-clay-deep">
            Nepavyko gauti maršruto duomenų. Patikrinkite ryšį.
          </p>
        )}

        <article className="overflow-hidden rounded-[3px] border border-rule bg-sheet">
          {/* Title row with the waybill total */}
          <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-7">
            <div className="flex items-center gap-3">
              <TruckIcon className="shrink-0 text-green" width={26} height={26} />
              <h1 className="font-display text-2xl font-semibold leading-tight md:text-3xl">
                Maršruto lapas, {formatDay(DEMO_DAY)}
                <span className="block text-lg font-medium text-clay-deep md:inline">
                  {" "}
                  · {capitalize(formatWeekday(DEMO_DAY))} · Ecoservice · Pavilnys
                </span>
              </h1>
            </div>
            <p
              className="self-start rounded-[2px] border-2 border-green px-4 py-2 font-display text-[3.5rem] font-semibold leading-none text-green md:self-auto"
              aria-live="polite"
            >
              {route ? (
                <>
                  {route.onRoute !== route.scheduled && (
                    <>
                      <s className="text-[2.25rem] font-medium text-clay-deep decoration-2">{route.scheduled}</s>{" "}
                    </>
                  )}
                  <span key={route.onRoute} className="tick">
                    {route.onRoute}
                  </span>
                  <span className="text-2xl font-medium text-green-muted">
                    {" "}
                    {plural(route.onRoute, { one: "sustojimas", few: "sustojimai", many: "sustojimų" }).replace(/^\d+ /, "")}
                  </span>
                </>
              ) : (
                <span className="text-2xl text-clay-deep">…</span>
              )}
            </p>
          </div>

          <div className="grid border-t border-rule md:grid-cols-12">
            {/* The manifest: every stop as a ruled line */}
            <section className="px-5 py-6 md:col-span-8 md:border-r md:border-rule md:px-7" aria-labelledby="lines-h">
              <h2 id="lines-h" className="font-display text-lg font-semibold text-green-muted">
                Pakeitimai per programėlę
              </h2>
              {changed.length === 0 ? (
                <p className="mt-3 border-y border-rule py-3 text-clay-deep">
                  Dar niekas nepraleido ir neužsakė. Kai gyventojas praleis, eilutė čia bus perbraukta.
                </p>
              ) : (
                <div className="mt-3 divide-y divide-rule border-y border-rule">
                  {changed.map((l) => (
                    <ManifestLineRow key={l.householdId} line={l} total={lines.length} large />
                  ))}
                </div>
              )}

              <h2 className="mt-8 font-display text-lg font-semibold text-green-muted">
                Visos stotelės <span className="font-medium text-clay-deep">({lines.length})</span>
              </h2>
              <div className="mt-3 max-h-[28rem] divide-y divide-rule/70 overflow-y-auto border-y border-rule pr-2">
                {lines.map((l) => (
                  <ManifestLineRow key={l.householdId} line={l} total={lines.length} />
                ))}
              </div>
            </section>

            <section className="border-t border-rule px-5 py-6 md:col-span-4 md:border-t-0 md:px-7" aria-labelledby="delta-h">
              <h2 id="delta-h" className="font-display text-lg font-semibold text-green-muted">
                Sutaupyta per programėlę
              </h2>
              <dl className="mt-3 divide-y divide-rule/70">
                {[
                  ["Praleista sustojimų", route?.skipped ?? "…"],
                  ["Papildomai užsakyta", route?.extras ?? "…"],
                  ["Kilometrų", `≈ ${num.format(km)}`],
                  ["Dyzelino", `≈ ${num.format(litres)} l`],
                  ["Kuro kaina", `≈ ${eur.format(litres * DIESEL_EUR_PER_L)}`],
                  ["CO₂", `≈ ${num.format(litres * CO2_KG_PER_L_DIESEL)} kg`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-clay-deep">{k}</dt>
                    <dd className="font-display text-2xl font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-clay-deep">
                Apytiksliai: {exact.format(AVG_KM_SAVED_PER_SKIP)}{"\u00a0"}km vienam praleistam sustojimui,{" "}
                {FUEL_L_PER_100KM}{"\u00a0"}l/100{"\u00a0"}km, {exact.format(DIESEL_EUR_PER_L)}{"\u00a0"}€/l,{" "}
                {exact.format(CO2_KG_PER_L_DIESEL)}{"\u00a0"}kg{"\u00a0"}CO₂/l.
              </p>
            </section>
          </div>
        </article>
      </main>
    </div>
  );
}
