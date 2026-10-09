"use client";

import { useState } from "react";
import { BOOKING_DAYS_AHEAD, EXTRA_PICKUP_PRICE_EUR, TIME_WINDOWS, type TimeWindow } from "@/lib/config";
import { addDays, capitalize, formatChip, formatLong, todayISO } from "@/lib/dates";
import { bookExtra } from "@/lib/pickups";
import { Button, ErrorText, Screen } from "./ui";

export default function BookScreen({ householdId, onBack }: { householdId: number; onBack: () => void }) {
  // Next 7 days, starting tomorrow (today's route is already planned).
  const days = Array.from({ length: BOOKING_DAYS_AHEAD }, (_, i) => addDays(todayISO(), i + 1));
  const [date, setDate] = useState(days[0]);
  const [showTime, setShowTime] = useState(false);
  const [timeWindow, setTimeWindow] = useState<TimeWindow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      await bookExtra(householdId, date, timeWindow);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <Screen>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green text-4xl text-white">✓</div>
          <h1 className="mt-4 text-3xl font-bold">Užsakyta!</h1>
          <p className="text-lg">{capitalize(formatLong(date))}</p>
          {timeWindow && <p className="text-ink/60">{TIME_WINDOWS[timeWindow]}</p>}
        </div>
        <Button onClick={onBack}>Grįžti</Button>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="-ml-2 rounded-full px-3 py-2 text-2xl" aria-label="Atgal">
          ←
        </button>
        <h1 className="text-2xl font-bold">Užsakyti išvežimą</h1>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink/60">Diena</h2>
        <div className="grid grid-cols-4 gap-2">
          {days.map((d) => (
            <button
              key={d}
              onClick={() => setDate(d)}
              className={`rounded-2xl py-3 text-lg font-semibold ${
                d === date ? "bg-green text-white" : "border-2 border-ink/10 bg-white"
              }`}
            >
              {formatChip(d)}
            </button>
          ))}
        </div>
        <p className="text-ink/60">{capitalize(formatLong(date))}</p>
      </section>

      <section className="flex flex-col gap-3">
        <button onClick={() => setShowTime(!showTime)} className="flex items-center justify-between text-left">
          <span className="text-sm font-semibold text-ink/60">Laikas (nebūtina)</span>
          <span className="text-ink/60">{showTime ? "▲" : "▼"}</span>
        </button>
        {showTime && (
          <div className="flex flex-col gap-2">
            {(Object.keys(TIME_WINDOWS) as TimeWindow[]).map((tw) => (
              <button
                key={tw}
                onClick={() => setTimeWindow(timeWindow === tw ? null : tw)}
                className={`rounded-2xl px-4 py-3 text-left text-lg font-semibold ${
                  tw === timeWindow ? "bg-green text-white" : "border-2 border-ink/10 bg-white"
                }`}
              >
                {TIME_WINDOWS[tw]}
              </button>
            ))}
          </div>
        )}
      </section>

      {error && <ErrorText>Nepavyko užsakyti: {error}</ErrorText>}

      <div className="mt-auto flex flex-col gap-4">
        <p className="text-center text-lg">
          Kaina: <span className="font-bold">{EXTRA_PICKUP_PRICE_EUR}€</span>
        </p>
        <Button onClick={confirm} disabled={saving}>
          {saving ? "Užsakoma…" : "Patvirtinti"}
        </Button>
      </div>
    </Screen>
  );
}
