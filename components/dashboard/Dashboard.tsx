"use client";

import { useCallback, useEffect, useState } from "react";
import { CALENDAR_DAYS, EXTRA_PICKUP_PRICE_EUR, SCHEDULE_INTERVAL_DAYS, TIME_WINDOWS, type TimeWindow } from "@/lib/config";
import {
  addDays,
  formatDay,
  formatHero,
  formatWeekdayGenitive,
  formatWeekdayShort,
  parseISODate,
  todayISO,
} from "@/lib/dates";
import {
  bookExtra,
  cancelExtra,
  getNextPickup,
  skipScheduled,
  undoSkip,
  type Household,
  type HouseholdState,
  type Pickup,
} from "@/lib/pickups";
import { Card, ContainerCard, HistoryCard, ImpactCard } from "./Cards";
import Header from "./Header";
import Modal, { PrimaryButton } from "./Modal";
import Toast, { type ToastData } from "./Toast";

export const REMINDER_SESSION_KEY = "reminderShown";

type Popup =
  | { type: "reminder"; date: string }
  | { type: "skip"; date: string }
  | { type: "unskip"; skip: Pickup }
  | { type: "book"; date: string; pickDay: boolean }
  | { type: "cancel"; pickup: Pickup };

type Day = {
  date: string;
  isToday: boolean;
  scheduled: boolean;
  skip: Pickup | null;
  extra: Pickup | null;
};

function buildDays(state: HouseholdState): Day[] {
  const today = todayISO();
  const scheduled = new Set<string>();
  for (let d = state.scheduledDate; d && d < addDays(today, CALENDAR_DAYS); d = addDays(d, SCHEDULE_INTERVAL_DAYS)) {
    scheduled.add(d);
  }
  return Array.from({ length: CALENDAR_DAYS }, (_, i) => {
    const date = addDays(today, i);
    return {
      date,
      isToday: i === 0,
      scheduled: scheduled.has(date),
      skip: state.pickups.find((p) => p.date === date && p.kind === "scheduled" && p.status === "skipped") ?? null,
      extra: state.pickups.find((p) => p.date === date && p.kind === "extra" && p.status === "planned") ?? null,
    };
  });
}

export default function Dashboard({
  householdId,
  name,
  onSwitch,
}: {
  householdId: number;
  name: string;
  onSwitch: (h: Household) => void;
}) {
  const [state, setState] = useState<HouseholdState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [popup, setPopup] = useState<Popup | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const load = useCallback(
    () =>
      getNextPickup(householdId)
        .then((s) => {
          setState(s);
          setError(null);
          return s;
        })
        .catch((e) => {
          setError(e.message);
          return null;
        }),
    [householdId],
  );

  // First load, then the evening reminder once per browser session.
  useEffect(() => {
    load().then((s) => {
      if (!s?.scheduledDate || s.skip || s.scheduledDate !== addDays(todayISO(), 1)) return;
      try {
        if (sessionStorage.getItem(REMINDER_SESSION_KEY)) return;
        sessionStorage.setItem(REMINDER_SESSION_KEY, "1");
      } catch {}
      setPopup({ type: "reminder", date: s.scheduledDate });
    });
  }, [load]);

  const closePopup = useCallback(() => setPopup(null), []);
  const closeToast = useCallback(() => setToast(null), []);

  // Every action: close popup, write, refresh in place, toast with undo.
  async function act(write: () => Promise<number | void>, message: string, undo: (result: number | void) => Promise<unknown>) {
    setPopup(null);
    try {
      const result = await write();
      await load();
      setToast({
        id: Date.now(),
        message,
        undo: () => {
          undo(result)
            .then(load)
            .catch((e) => setError(e.message));
        },
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const skip = (date: string) =>
    act(() => skipScheduled(householdId, date), "Išvežimas praleistas", (id) => undoSkip(id as number));
  const unskip = (p: Pickup) =>
    act(() => undoSkip(p.id), "Išvežimas grąžintas", () => skipScheduled(householdId, p.date));
  const book = (date: string, tw: TimeWindow | null) =>
    act(() => bookExtra(householdId, date, tw), `Užsakyta ${formatDay(date)}`, (id) => cancelExtra(id as number));
  const cancel = (p: Pickup) =>
    act(() => cancelExtra(p.id), "Užsakymas atšauktas", () => bookExtra(householdId, p.date, p.time_window));

  const days = state ? buildDays(state) : [];
  const freeDays = days.filter((d) => !d.isToday && !d.scheduled && !d.extra).map((d) => d.date);

  function openDay(d: Day) {
    if (d.isToday) return;
    if (d.extra) setPopup({ type: "cancel", pickup: d.extra });
    else if (d.skip) setPopup({ type: "unskip", skip: d.skip });
    else if (d.scheduled) setPopup({ type: "skip", date: d.date });
    else setPopup({ type: "book", date: d.date, pickDay: false });
  }

  // Hero = earliest of planned extras and the current scheduled date (shown as skipped if skipped).
  const hero = state && heroItem(state);

  return (
    <div className="min-h-dvh bg-sand">
      <div className="mx-auto max-w-[1200px] px-4 py-5 md:px-8 md:py-8">
        <Header address={state?.household.address ?? null} name={name} onSwitch={onSwitch} />

        {error && <p className="mt-6 rounded-2xl bg-clay/10 px-5 py-4 text-clay">Klaida: {error}</p>}

        {!state ? (
          !error && <p className="mt-10 text-ink/40">Kraunama…</p>
        ) : (
          <div className="mt-6 flex flex-col gap-6 md:mt-8 md:grid md:grid-cols-12 md:items-start">
            <div className="max-md:contents md:col-span-8 md:flex md:flex-col md:gap-6">
              {/* 1. Hero */}
              <Card className="order-1 md:order-none md:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">Kitas išvežimas</h2>
                  {hero && <StatusChip status={hero.status} />}
                </div>
                {hero ? (
                  <p
                    className={`mt-3 text-3xl font-bold md:text-5xl ${hero.status === "skipped" ? "text-ink/35 line-through decoration-2" : ""}`}
                  >
                    {formatHero(hero.date)}
                  </p>
                ) : (
                  <p className="mt-3 text-3xl font-bold">Nesuplanuota</p>
                )}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    disabled={!hero || hero.status === "skipped"}
                    onClick={() =>
                      hero?.pickup
                        ? setPopup({ type: "cancel", pickup: hero.pickup })
                        : hero && setPopup({ type: "skip", date: hero.date })
                    }
                    className="rounded-2xl border-2 border-ink/15 bg-white px-8 py-4 text-lg font-semibold hover:border-ink/30 disabled:opacity-40"
                  >
                    {hero?.status === "booked" ? "Atšaukti užsakymą" : "Praleisti"}
                  </button>
                  <button
                    disabled={freeDays.length === 0}
                    onClick={() => setPopup({ type: "book", date: freeDays[0], pickDay: true })}
                    className="rounded-2xl bg-green px-8 py-4 text-lg font-semibold text-white hover:opacity-90 disabled:opacity-40"
                  >
                    Užsakyti kitą dieną
                  </button>
                </div>
              </Card>

              {/* 2. Calendar strip */}
              <Card title="Artimiausios 14 dienų" className="order-2 md:order-none">
                <div className="-mx-6 mt-4 overflow-x-auto px-6 pb-1">
                  <div className="flex gap-1.5">
                    {days.map((d) => (
                      <DayCell key={d.date} day={d} onClick={() => openDay(d)} />
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink/60">
                  <Legend className="bg-green">Pagal grafiką</Legend>
                  <Legend className="bg-clay">Užsakyta</Legend>
                  <Legend className="bg-ink/25">Praleista</Legend>
                </div>
              </Card>
            </div>

            <div className="max-md:contents md:col-span-4 md:flex md:flex-col md:gap-6">
              <div className="order-4 md:order-none">
                <ContainerCard household={state.household} />
              </div>
              <div className="order-3 md:order-none">
                <HistoryCard household={state.household} pickups={state.pickups} />
              </div>
              <div className="order-5 md:order-none">
                <ImpactCard pickups={state.pickups} />
              </div>
            </div>
          </div>
        )}
      </div>

      {popup && state && (
        <PopupContent
          popup={popup}
          freeDays={freeDays}
          onClose={closePopup}
          onSkip={skip}
          onUnskip={unskip}
          onBook={book}
          onCancel={cancel}
          onChangeDate={(date) => setPopup({ type: "book", date, pickDay: true })}
        />
      )}
      {toast && <Toast key={toast.id} toast={toast} onDone={closeToast} />}
    </div>
  );
}

type HeroStatus = "planned" | "skipped" | "booked";

// Hero: a booked extra if it is the next real pickup; otherwise the current scheduled date,
// shown as skipped when skipped (so the skip is visible right where you made it).
function heroItem(state: HouseholdState): { date: string; status: HeroStatus; pickup: Pickup | null } | null {
  const extra = state.extras[0];
  if (extra && (!state.nextScheduledDate || extra.date < state.nextScheduledDate)) {
    return { date: extra.date, status: "booked", pickup: extra };
  }
  if (!state.scheduledDate) return null;
  return { date: state.scheduledDate, status: state.skip ? "skipped" : "planned", pickup: null };
}

function StatusChip({ status }: { status: HeroStatus }) {
  const styles: Record<HeroStatus, [string, string]> = {
    planned: ["Suplanuota", "bg-green/10 text-green"],
    skipped: ["Praleista", "bg-ink/10 text-ink/60"],
    booked: ["Užsakyta", "bg-clay/15 text-clay"],
  };
  const [label, cls] = styles[status];
  return <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cls}`}>{label}</span>;
}

function DayCell({ day, onClick }: { day: Day; onClick: () => void }) {
  const d = parseISODate(day.date);
  const weekend = d.getDay() === 0 || d.getDay() === 6;
  const skipped = !!day.skip;
  let dot = null;
  if (day.extra) dot = "bg-clay";
  else if (skipped) dot = "bg-ink/25";
  else if (day.scheduled) dot = "bg-green";

  const label = [
    formatHero(day.date),
    day.extra && "užsakyta",
    skipped && "praleista",
    day.scheduled && !skipped && "išvežimas pagal grafiką",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      onClick={onClick}
      disabled={day.isToday}
      aria-label={label}
      className={`flex min-w-[44px] flex-1 flex-col items-center gap-1 rounded-xl border-2 py-3 transition-colors ${
        day.isToday
          ? "cursor-default border-transparent bg-sand"
          : day.scheduled && !skipped
            ? "border-green/40 bg-green/5 hover:border-green"
            : day.extra
              ? "border-clay/40 bg-clay/5 hover:border-clay"
              : "border-ink/10 hover:border-ink/30"
      }`}
    >
      <span className={`text-xs font-semibold ${weekend ? "text-ink/40" : "text-ink/60"}`}>
        {day.isToday ? "Šiand." : formatWeekdayShort(day.date)}
      </span>
      <span className={`text-lg font-bold ${skipped ? "text-ink/35 line-through" : ""}`}>{d.getDate()}</span>
      <span className={`h-2 w-2 rounded-full ${dot ?? "bg-transparent"}`} />
    </button>
  );
}

function Legend({ className, children }: { className: string; children: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      {children}
    </span>
  );
}

function PopupContent({
  popup,
  freeDays,
  onClose,
  onSkip,
  onUnskip,
  onBook,
  onCancel,
  onChangeDate,
}: {
  popup: Popup;
  freeDays: string[];
  onClose: () => void;
  onSkip: (date: string) => void;
  onUnskip: (p: Pickup) => void;
  onBook: (date: string, tw: TimeWindow | null) => void;
  onCancel: (p: Pickup) => void;
  onChangeDate: (date: string) => void;
}) {
  switch (popup.type) {
    case "reminder":
      return (
        <Modal title="Rytoj išvežimas. Ar konteineris pilnas?" onClose={onClose}>
          <p className="mt-2 text-ink/60">{formatHero(popup.date)}</p>
          <PrimaryButton onClick={() => onSkip(popup.date)}>Ne, praleisti</PrimaryButton>
          <button onClick={onClose} className="mt-3 w-full rounded-2xl py-3 text-lg font-semibold text-ink/70 hover:bg-ink/5">
            Taip, vežkite
          </button>
        </Modal>
      );

    case "skip": {
      const next = addDays(popup.date, SCHEDULE_INTERVAL_DAYS);
      return (
        <Modal title={`Praleisti ${formatWeekdayGenitive(popup.date)} išvežimą?`} onClose={onClose}>
          <p className="mt-2 text-ink/60">Šiukšliavežė pas jus neužsuks. Kitas išvežimas: {formatDay(next)}</p>
          <PrimaryButton onClick={() => onSkip(popup.date)}>Praleisti</PrimaryButton>
        </Modal>
      );
    }

    case "unskip":
      return (
        <Modal title={`Grąžinti ${formatDay(popup.skip.date)} išvežimą?`} onClose={onClose}>
          <p className="mt-2 text-ink/60">Šiukšliavežė užsuks pagal grafiką.</p>
          <PrimaryButton onClick={() => onUnskip(popup.skip)}>Grąžinti</PrimaryButton>
        </Modal>
      );

    case "book":
      return (
        <BookPopup
          key={popup.date}
          date={popup.date}
          pickDay={popup.pickDay}
          freeDays={freeDays}
          onClose={onClose}
          onBook={onBook}
          onChangeDate={onChangeDate}
        />
      );

    case "cancel":
      return (
        <Modal title={`Atšaukti ${formatDay(popup.pickup.date)} užsakymą?`} onClose={onClose}>
          <p className="mt-2 text-ink/60">
            {popup.pickup.time_window ? TIME_WINDOWS[popup.pickup.time_window] : "Bet kuriuo metu"} ·{" "}
            {Number(popup.pickup.price_eur)}€
          </p>
          <PrimaryButton onClick={() => onCancel(popup.pickup)}>Atšaukti užsakymą</PrimaryButton>
        </Modal>
      );
  }
}

function BookPopup({
  date,
  pickDay,
  freeDays,
  onClose,
  onBook,
  onChangeDate,
}: {
  date: string;
  pickDay: boolean;
  freeDays: string[];
  onClose: () => void;
  onBook: (date: string, tw: TimeWindow | null) => void;
  onChangeDate: (date: string) => void;
}) {
  const [tw, setTw] = useState<TimeWindow | null>(null);
  return (
    <Modal title={formatHero(date)} onClose={onClose}>
      {pickDay && (
        <div className="mt-4 flex flex-wrap gap-2">
          {freeDays.slice(0, 7).map((d) => (
            <button
              key={d}
              onClick={() => onChangeDate(d)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                d === date ? "bg-ink text-white" : "border border-ink/15 hover:border-ink/30"
              }`}
            >
              {formatWeekdayShort(d)} {parseISODate(d).getDate()}
            </button>
          ))}
        </div>
      )}
      <p className="mt-5 text-sm font-semibold text-ink/50">Laikas (nebūtina)</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(Object.keys(TIME_WINDOWS) as TimeWindow[]).map((key) => (
          <button
            key={key}
            onClick={() => setTw(tw === key ? null : key)}
            aria-pressed={tw === key}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              tw === key ? "bg-green text-white" : "border border-ink/15 hover:border-ink/30"
            }`}
          >
            {TIME_WINDOWS[key]}
          </button>
        ))}
      </div>
      <p className="mt-5 text-ink/60">Kaina: {EXTRA_PICKUP_PRICE_EUR}€ už papildomą išvežimą</p>
      <PrimaryButton onClick={() => onBook(date, tw)}>Užsakyti už {EXTRA_PICKUP_PRICE_EUR}€</PrimaryButton>
    </Modal>
  );
}
