"use client";

import { useCallback, useEffect, useState } from "react";
import { TIME_WINDOWS } from "@/lib/config";
import { capitalize, formatDay, formatLong } from "@/lib/dates";
import { getNextPickup, skipScheduled, undoSkip, type HouseholdState } from "@/lib/pickups";
import BookScreen from "./BookScreen";
import { BottomSheet, Button, ErrorText, Screen } from "./ui";

export default function Home({ householdId, name }: { householdId: number; name: string }) {
  const [state, setState] = useState<HouseholdState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"home" | "book">("home");
  const [skipOpen, setSkipOpen] = useState(false);
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

  if (view === "book") {
    return (
      <BookScreen
        householdId={householdId}
        onBack={() => {
          setView("home");
          load();
        }}
      />
    );
  }

  const firstName = name.split(" ")[0];
  const scheduledDate = state?.scheduledDate;

  return (
    <Screen>
      <div className="pt-6">
        <h1 className="text-3xl font-bold">Labas, {firstName}</h1>
        {state && <p className="mt-1 text-ink/60">{state.household.address}</p>}
      </div>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-ink/60">Kitas išvežimas</p>
        {!state && !error && <p className="mt-2 text-2xl font-bold text-ink/30">Kraunama…</p>}
        {state?.next && (
          <>
            <p className="mt-2 text-2xl font-bold">{capitalize(formatLong(state.next.date))}</p>
            {state.next.kind === "extra" && (
              <p className="mt-1 text-clay">
                Užsakytas papildomai
                {state.next.timeWindow && ` · ${TIME_WINDOWS[state.next.timeWindow]}`}
              </p>
            )}
          </>
        )}
        {state && !state.next && <p className="mt-2 text-2xl font-bold">Nesuplanuota</p>}
      </section>

      {state?.skip && (
        <p className="-mt-2 px-2 text-ink/60">
          {capitalize(formatDay(state.skip.date))} išvežimas praleistas.{" "}
          <Button variant="text" disabled={busy} onClick={() => run(() => undoSkip(state.skip!.id))}>
            Atšaukti
          </Button>
        </p>
      )}

      {error && <ErrorText>Klaida: {error}</ErrorText>}

      <div className="mt-auto flex flex-col gap-3">
        <Button onClick={() => setView("book")} disabled={!state}>
          Užsakyti išvežimą
        </Button>
        <Button variant="secondary" onClick={() => setSkipOpen(true)} disabled={!scheduledDate || !!state?.skip || busy}>
          Praleisti
        </Button>
      </div>

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
    </Screen>
  );
}
