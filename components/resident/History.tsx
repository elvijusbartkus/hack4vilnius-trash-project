import { TIME_WINDOWS } from "@/lib/config";
import { capitalize, formatLong, plural } from "@/lib/dates";
import type { HouseholdState, Pickup } from "@/lib/pickups";
import { Card, ErrorText, Screen } from "./ui";

function pickupLabel(p: Pickup): string {
  if (p.status === "skipped") return "Praleista";
  if (p.status === "collected") return "Išvežta";
  if (p.status === "blocked") return "Užstatyta";
  return p.kind === "extra" ? "Užsakyta papildomai" : "Suplanuota";
}

export default function History({ state, error }: { state: HouseholdState | null; error: string | null }) {
  const skipped = state?.pickups.filter((p) => p.status === "skipped").length ?? 0;
  // Real VASA records, newest first. Dates look like "2026-10-02 11:47:38".
  const vasa = [...(state?.household.history ?? [])].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Screen>
      <h1 className="pt-2 text-3xl font-bold">Istorija</h1>

      {error && <ErrorText>Klaida: {error}</ErrorText>}
      {!state && !error && <p className="text-ink/40">Kraunama…</p>}

      {state && (
        <>
          <p className="-mt-2 rounded-2xl bg-green/10 px-4 py-3 font-semibold text-green">
            Praleidote {plural(skipped, { one: "išvežimą", few: "išvežimus", many: "išvežimų" })}, sutaupėte{" "}
            {plural(skipped, { one: "sustojimą", few: "sustojimus", many: "sustojimų" })}
          </p>

          <Card title="VASA duomenys">
            {vasa.length === 0 ? (
              <p className="mt-2 text-ink/60">Įrašų nėra.</p>
            ) : (
              <ul className="mt-2 divide-y divide-ink/10">
                {vasa.map((r) => (
                  <li key={r.date} className="flex items-center justify-between gap-3 py-3">
                    <span>{capitalize(formatLong(r.date.slice(0, 10)))}</span>
                    <span className={`text-right font-semibold ${r.serviced ? "text-green" : "text-clay"}`}>
                      {r.serviced ? "Išvežta" : (r.reason ?? "Neišvežta")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Programėlėje">
            {state.pickups.length === 0 ? (
              <p className="mt-2 text-ink/60">Dar nieko neužsakėte ir nepraleidote.</p>
            ) : (
              <ul className="mt-2 divide-y divide-ink/10">
                {state.pickups.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p>{capitalize(formatLong(p.date))}</p>
                      {p.kind === "extra" && (
                        <p className="text-sm text-ink/60">
                          {p.time_window ? TIME_WINDOWS[p.time_window] : "Bet kuriuo metu"} · {Number(p.price_eur)}€
                        </p>
                      )}
                    </div>
                    <span className={`text-right font-semibold ${p.status === "skipped" ? "text-clay" : "text-ink"}`}>
                      {pickupLabel(p)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}
