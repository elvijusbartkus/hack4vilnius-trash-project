"use client";

import { useCallback, useEffect, useState } from "react";
import { TIME_WINDOWS } from "@/lib/config";
import { addDays, capitalize, formatDay, formatLong, todayISO } from "@/lib/dates";
import {
  cancelExtra,
  getNextPickup,
  skipScheduled,
  undoSkip,
  type HouseholdState,
} from "@/lib/pickups";
import BookScreen from "./BookScreen";
import History from "./History";
import { BottomSheet, Button, Card, ErrorText, Screen } from "./ui";

type Tab = "home" | "history";

export default function Home({ householdId, name }: { householdId: number; name: string }) {
  const [state, setState] = useState<HouseholdState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [booking, setBooking] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const [reminderClosed, setReminderClosed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getNextPickup(householdId)
      .then((s) => {
        setState(s);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [householdId]);

  useEffect(load, [load]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (booking) {
    return (
      <BookScreen
        householdId={householdId}
        onBack={() => {
          setBooking(false);
          load();
        }}
      />
    );
  }

  const scheduledDate = state?.scheduledDate ?? null;
  const skip = () => run(() => skipScheduled(householdId, scheduledDate!));
  // Evening reminder: the scheduled pickup is tomorrow and not skipped yet.
  const showReminder =
    !!state && !!scheduledDate && !state.skip && !reminderClosed && scheduledDate === addDays(todayISO(), 1);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        {tab === "history" ? (
          <History state={state} error={error} />
        ) : (
          <Screen>
            <div className="pt-2">
              <h1 className="text-3xl font-bold">Labas, {name.split(" ")[0]}</h1>
              {state && <p className="mt-1 text-ink/60">{state.household.address}</p>}
            </div>

            {showReminder && (
              <section className="rounded-3xl bg-green p-5 text-white shadow-md">
                <p className="text-sm font-semibold text-white/70">Priminimas</p>
                <p className="mt-1 text-2xl font-bold">Rytoj išvežimas. Ar konteineris pilnas?</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setReminderClosed(true)}
                    className="rounded-2xl bg-white py-4 text-lg font-semibold text-green active:opacity-80"
                  >
                    Taip, vežkite
                  </button>
                  <button
                    onClick={skip}
                    disabled={busy}
                    className="rounded-2xl border-2 border-white/60 py-4 text-lg font-semibold text-white active:bg-white/10 disabled:opacity-40"
                  >
                    Ne, praleisti
                  </button>
                </div>
              </section>
            )}

            {error && <ErrorText>Klaida: {error}</ErrorText>}
            {!state && !error && <p className="text-ink/40">Kraunama…</p>}

            {state && (
              <Card title="Pagal grafiką">
                {scheduledDate ? (
                  <>
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <p className={`text-2xl font-bold ${state.skip ? "text-ink/40 line-through" : ""}`}>
                        {capitalize(formatLong(scheduledDate))}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
                          state.skip ? "bg-clay/15 text-clay" : "bg-green/10 text-green"
                        }`}
                      >
                        {state.skip ? "Praleista" : "Suplanuota"}
                      </span>
                    </div>
                    <p className="mt-1 text-ink/60">
                      {[state.household.carrier, state.household.bin_volume_l && `${state.household.bin_volume_l}L`, "kas 2 sav."]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {state.skip && state.nextScheduledDate && (
                      <p className="mt-3 text-ink/80">Kitas pagal grafiką: {formatDay(state.nextScheduledDate)}</p>
                    )}
                    <div className="mt-4">
                      {state.skip ? (
                        <Button variant="secondary" disabled={busy} onClick={() => run(() => undoSkip(state.skip!.id))}>
                          Atšaukti praleidimą
                        </Button>
                      ) : (
                        <Button variant="secondary" disabled={busy} onClick={() => setSkipOpen(true)}>
                          Praleisti
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-2xl font-bold">Nesuplanuota</p>
                )}
              </Card>
            )}

            {state && (
              <Card title="Papildomi išvežimai">
                {state.extras.length === 0 ? (
                  <p className="mt-2 text-ink/60">Nėra užsakytų.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-ink/10">
                    {state.extras.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                        <div>
                          <p className="text-lg font-semibold">{capitalize(formatLong(p.date))}</p>
                          <p className="text-ink/60">
                            {p.time_window ? TIME_WINDOWS[p.time_window] : "Bet kuriuo metu"} · {Number(p.price_eur)}€
                          </p>
                        </div>
                        <Button variant="text" disabled={busy} onClick={() => run(() => cancelExtra(p.id))}>
                          Atšaukti
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button className="mt-4" onClick={() => setBooking(true)}>
                  Užsakyti išvežimą
                </Button>
              </Card>
            )}
          </Screen>
        )}
      </div>

      <nav className="grid grid-cols-2 border-t border-ink/10 bg-white pb-[env(safe-area-inset-bottom)]">
        {(
          [
            ["home", "Pradžia"],
            ["history", "Istorija"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`py-4 text-base font-semibold ${tab === key ? "text-green" : "text-ink/40"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {skipOpen && scheduledDate && (
        <BottomSheet onClose={() => setSkipOpen(false)}>
          <h2 className="text-2xl font-bold">Praleisti {formatDay(scheduledDate)} išvežimą?</h2>
          <p className="mt-2 text-ink/60">Šiukšliavežė pas jus tą dieną neužsuks.</p>
          <div className="mt-8 flex flex-col gap-3">
            <Button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await skipScheduled(householdId, scheduledDate);
                  setSkipOpen(false);
                })
              }
            >
              Taip, praleisti
            </Button>
            <Button variant="secondary" onClick={() => setSkipOpen(false)}>
              Atšaukti
            </Button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
