"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  BOOKING_DAYS_AHEAD,
  CALENDAR_DAYS,
  EXTRA_PICKUP_PRICE_EUR,
  SCHEDULE_INTERVAL_DAYS,
  TIME_WINDOWS,
  type TimeWindow,
} from "@/lib/config";
import {
  addDays,
  capitalize,
  formatDay,
  formatDayCap,
  formatHero,
  formatWeekday,
  formatWeekdayShort,
  parseISODate,
  todayISO,
} from "@/lib/dates";
import {
  bookExtra,
  cancelExtra,
  confirmScheduled,
  removePickup,
  getNextPickup,
  skipScheduled,
  subscribePickups,
  undoSkip,
  type Household,
  type HouseholdState,
  type Pickup,
  type ServiceRecord,
} from "@/lib/pickups";
import { ContainerField, HelpPanel, HistoryField, ImpactField, Panel } from "./Cards";
import Header from "./Header";
import { CloseIcon, Marker, type MarkerKind } from "./Icons";
import Toast, { type ToastData } from "./Toast";


const ERROR_TEXT = "Nepavyko susisiekti su serveriu. Patikrinkite ryšį ir bandykite dar kartą.";

type Day = {
  date: string;
  isToday: boolean;
  scheduled: boolean;
  bookable: boolean; // free, within BOOKING_DAYS_AHEAD, not Sunday
  skip: Pickup | null;
  confirmed: boolean; // "Taip, išstumsiu" saved for this date
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
    const extra = state.pickups.find((p) => p.date === date && p.kind === "extra" && p.status === "planned") ?? null;
    const isScheduled = scheduled.has(date);
    return {
      date,
      isToday: i === 0,
      scheduled: isScheduled,
      bookable: i > 0 && i <= BOOKING_DAYS_AHEAD && !isScheduled && !extra && parseISODate(date).getDay() !== 0,
      skip: state.pickups.find((p) => p.date === date && p.kind === "scheduled" && p.status === "skipped") ?? null,
      confirmed: state.pickups.some((p) => p.date === date && p.kind === "scheduled" && p.status === "planned"),
      extra,
    };
  });
}

// The newest real VASA record, if the truck could not collect last time.
function lastFailure(history: ServiceRecord[]): ServiceRecord | null {
  const newest = [...history].sort((a, b) => b.date.localeCompare(a.date))[0];
  return newest && !newest.serviced ? newest : null;
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
  const [toast, setToast] = useState<ToastData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const dayPanelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    () =>
      getNextPickup(householdId)
        .then((s) => {
          setState(s);
          setError(null);
          return s;
        })
        .catch((e) => {
          console.error(e);
          setError(ERROR_TEXT);
          return null;
        }),
    [householdId],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Live: changes made anywhere (another tab, the driver app later) refresh this house.
  useEffect(() => subscribePickups(() => void load()), [load]);

  const closeToast = useCallback(() => setToast(null), []);

  // Every action: write, refresh in place, toast with undo (the undo itself confirms with a short toast).
  async function act(write: () => Promise<number | void>, message: string, undo: (result: number | void) => Promise<unknown>) {
    try {
      const result = await write();
      await load();
      setToast({
        id: Date.now(),
        message,
        undo: () => {
          undo(result)
            .then(load)
            .then(() => setToast({ id: Date.now(), message: "Atšaukta. Viskas kaip buvo." }))
            .catch((e) => {
              console.error(e);
              setError(ERROR_TEXT);
            });
        },
      });
    } catch (e) {
      console.error(e);
      setError(ERROR_TEXT);
    }
  }

  const tomorrow = addDays(todayISO(), 1);

  // "Ne, nereikia": the truck won't come that day. Replaces an earlier "Taip" for the same date.
  const skip = (date: string) => {
    const confirmed = state?.confirmed?.date === date ? state.confirmed : null;
    const next = formatDay(addDays(date, SCHEDULE_INTERVAL_DAYS));
    return act(
      async () => {
        if (confirmed) await removePickup(confirmed.id);
        return skipScheduled(householdId, date);
      },
      `${date === tomorrow ? "Rytoj" : capitalize(formatDay(date))} pas jus neužsuks. Kitas išvežimas: ${next}`,
      async (id) => {
        await removePickup(id as number);
        if (confirmed) await confirmScheduled(householdId, date);
      },
    );
  };

  // "Taip, išstumsiu": saved as a confirmed scheduled pickup.
  const confirm = (date: string) =>
    act(
      () => confirmScheduled(householdId, date),
      date === tomorrow ? "Ačiū! Šiukšliavežė atvažiuos rytoj." : `Ačiū! Šiukšliavežė atvažiuos ${formatDay(date)}`,
      (id) => removePickup(id as number),
    );
  const unskip = (p: Pickup) =>
    act(() => undoSkip(p.id), `Grąžinta. Atvažiuosime ${formatDay(p.date)}`, () => skipScheduled(householdId, p.date));
  const book = (date: string, tw: TimeWindow | null) =>
    act(
      () => bookExtra(householdId, date, tw),
      `Užsakyta. Atvažiuosime ${tw ? `${formatDay(date)}, ${TIME_WINDOWS[tw].toLowerCase()}.` : formatDay(date)}`,
      (id) => cancelExtra(id as number),
    );
  const cancel = (p: Pickup) =>
    act(() => cancelExtra(p.id), `${capitalize(formatDay(p.date))} užsakymas atšauktas.`, () => bookExtra(householdId, p.date, p.time_window));


  const days = state ? buildDays(state) : [];
  const selectedDay = days.find((d) => d.date === selected) ?? null;

  function selectDay(date: string) {
    setSelected(date);
    requestAnimationFrame(() => dayPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  // "Užsakyti papildomai": bring the strip into view and point at the bookable days; the resident picks.
  function showBookable() {
    setSelected(null);
    setPulse((n) => n + 1);
    stripRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    requestAnimationFrame(() => stripRef.current?.querySelector<HTMLElement>("[data-bookable]")?.focus({ preventScroll: true }));
  }

  return (
    <div className="min-h-dvh bg-ground">
      <Header address={state?.household.address ?? null} name={name} onSwitch={onSwitch} />

      <main className="mx-auto max-w-[1200px] px-3 pb-32 pt-5 md:px-8 md:pt-8">
        <h1 className="sr-only">Trage: jūsų atliekų išvežimas</h1>
        {error && (
          <p role="alert" className="mb-5 rounded-[4px] border-2 border-clay bg-sheet-hi px-5 py-3 font-semibold text-clay-deep">
            {error}
          </p>
        )}

        {!state ? (
          <p className="py-16 text-stone-deep">{error ? "Duomenų nėra." : "Kraunama…"}</p>
        ) : (
          <div className="flex flex-col gap-4 md:grid md:grid-cols-12 md:items-start md:gap-6">
            <div className="max-md:contents md:col-span-8 md:flex md:flex-col md:gap-6">
              <Hero
                state={state}
                failure={lastFailure(state.household.history ?? [])}
                onSkip={skip}
                onConfirm={confirm}
                onUnskip={unskip}
                onCancel={cancel}
                onBook={showBookable}
              />

              <Panel title="Artimiausios 14 dienų" className="order-2 md:order-none">
                <div ref={stripRef}>
                  <Ledger
                    days={days}
                    selected={selected}
                    pulse={pulse}
                    onSelect={(d) => (d === selected ? setSelected(null) : selectDay(d))}
                  />
                </div>
                {selectedDay && (
                  <div ref={dayPanelRef}>
                    <DayPanel
                      key={selectedDay.date}
                      day={selectedDay}
                      onClose={() => setSelected(null)}
                      // close after acting, so the button under the cursor can't flip into its opposite
                      onSkip={(d) => (setSelected(null), skip(d))}
                      onUnskip={(p) => (setSelected(null), unskip(p))}
                      onBook={(d, tw) => (setSelected(null), book(d, tw))}
                      onCancel={(p) => (setSelected(null), cancel(p))}
                    />
                  </div>
                )}
              </Panel>
            </div>

            <div className="max-md:contents md:col-span-4 md:flex md:flex-col md:gap-6">
              <div className="order-3 md:order-none">
                <HistoryField household={state.household} pickups={state.pickups} />
              </div>
              <div className="order-4 md:order-none">
                <ContainerField household={state.household} />
              </div>
              <div className="order-5 md:order-none">
                <ImpactField pickups={state.pickups} />
              </div>
              <div className="order-6 md:order-none">
                <HelpPanel />
              </div>
            </div>
          </div>
        )}
      </main>

      {toast && <Toast key={toast.id} toast={toast} onDone={closeToast} />}
    </div>
  );
}

const HERO_BTN = "min-h-14 rounded-[4px] px-7 font-display text-xl font-semibold";
const ON_GREEN_PRIMARY = `${HERO_BTN} bg-sheet text-green hover:bg-white`;
const ON_GREEN_SECONDARY = `${HERO_BTN} border-2 border-sheet/70 text-sheet hover:bg-white/10`;
// Clay accent: the "not coming" answer.
const ON_GREEN_CLAY = `${HERO_BTN} border-2 border-clay-light text-clay-light hover:bg-clay-light/10`;

// The one panel that pops. While tomorrow is unanswered it asks the evening question itself,
// so the page never asks the same thing twice. No confirm steps: every action has undo.
function Hero({
  state,
  failure,
  onSkip,
  onConfirm,
  onUnskip,
  onCancel,
  onBook,
}: {
  state: HouseholdState;
  failure: ServiceRecord | null;
  onSkip: (date: string) => void;
  onConfirm: (date: string) => void;
  onUnskip: (p: Pickup) => void;
  onCancel: (p: Pickup) => void;
  onBook: () => void;
}) {
  const today = todayISO();
  const scheduled = state.scheduledDate;
  const extra = state.extras[0];
  const bookedFirst = !!extra && (!state.nextScheduledDate || extra.date < state.nextScheduledDate);

  let status: "question" | "confirmed" | "today" | "planned" | "skipped" | "booked" | "none";
  if (bookedFirst) status = "booked";
  else if (!scheduled) status = "none";
  else if (state.skip) status = "skipped";
  else if (scheduled === today) status = "today";
  else if (state.confirmed) status = "confirmed";
  else if (scheduled === addDays(today, 1)) status = "question";
  else status = "planned";

  const date = status === "booked" ? extra!.date : scheduled;
  const stamp: Record<typeof status, string | null> = {
    question: null,
    confirmed: "Patvirtinta",
    today: "Šiandien",
    planned: "Suplanuota",
    skipped: "Nevažiuos",
    booked: "Užsakyta",
    none: null,
  };

  // Plain-language line under the date, so no label ever sits above a struck date.
  let subline: ReactNode = null;
  if (date) {
    const wd = capitalize(formatWeekday(date));
    subline = {
      question: `${wd} · Atvažiuos pagal grafiką`,
      confirmed: `Kitas išvežimas · ${wd} · Atvažiuos, konteinerį išstumsite`,
      today: `Šiandien · Atvažiuos pagal grafiką`,
      planned: `Kitas išvežimas · ${wd} · Atvažiuos pagal grafiką`,
      skipped: `${wd} · Šiukšliavežė pas jus nevažiuos`,
      booked: `Kitas išvežimas · ${wd} · užsakyta papildomai${extra?.time_window ? ` · ${TIME_WINDOWS[extra.time_window]}` : ""}`,
      none: null,
    }[status];
  }

  // Warning (clay accent): the last real pickup failed, so tomorrow matters.
  const failureLine = failure && (status === "question" || status === "planned" || status === "confirmed") && (
    <p className="mt-5 rounded-[3px] border-2 border-clay-light bg-clay-light/10 px-4 py-3 text-sheet">
      <span className="font-semibold text-clay-light">Praėjusį kartą ({formatDay(failure.date.slice(0, 10))}) neišvežta:</span>{" "}
      {(failure.reason ?? "konteineris nepasiekiamas").toLowerCase()}. Konteineris tikriausiai pilnas, išstumkite jį prie
      gatvės.
    </p>
  );

  let actions: ReactNode;
  if (status === "question") {
    actions = (
      <>
        <button onClick={() => onConfirm(scheduled!)} className={ON_GREEN_PRIMARY}>
          Taip, išstumsiu
        </button>
        <button onClick={() => onSkip(scheduled!)} className={ON_GREEN_CLAY}>
          Ne, nereikia
        </button>
      </>
    );
  } else if (status === "planned" || status === "confirmed") {
    actions = (
      <>
        <button onClick={onBook} className={ON_GREEN_SECONDARY}>
          Užsakyti papildomai
        </button>
        <button onClick={() => onSkip(scheduled!)} className={ON_GREEN_CLAY}>
          Nereikia išvežti
        </button>
      </>
    );
  } else if (status === "skipped") {
    actions = (
      <>
        <button onClick={() => onUnskip(state.skip!)} className={ON_GREEN_PRIMARY}>
          Vis dėlto išstumsiu
        </button>
        <button onClick={onBook} className={ON_GREEN_SECONDARY}>
          Užsakyti papildomai
        </button>
      </>
    );
  } else if (status === "booked") {
    actions = (
      <>
        <button onClick={() => onCancel(extra!)} className={ON_GREEN_CLAY}>
          Atšaukti užsakymą
        </button>
        <button onClick={onBook} className={ON_GREEN_SECONDARY}>
          Užsakyti dar vieną
        </button>
      </>
    );
  } else {
    // today (truck already on the way) or nothing scheduled
    actions = (
      <button onClick={onBook} className={ON_GREEN_PRIMARY}>
        Užsakyti papildomai
      </button>
    );
  }

  const skipped = status === "skipped";

  return (
    <section
      aria-labelledby="hero-h"
      className="on-green order-1 rounded-[4px] bg-green px-6 py-6 text-sheet shadow-[0_20px_40px_-24px_rgb(31_90_60/0.8)] md:order-none md:px-9 md:py-7"
    >
      {status === "question" && (
        <p className="font-display text-2xl font-semibold leading-tight text-white md:text-[1.75rem]">
          Rytoj išvežimas. Išstumsite konteinerį?
        </p>
      )}

      <div className={`flex items-start justify-between gap-4 ${status === "question" ? "mt-3" : ""}`}>
        <h2
          id="hero-h"
          className={`font-display font-semibold leading-[0.92] tracking-[-0.015em] ${
            status === "question" ? "text-[clamp(2.5rem,6vw,4.25rem)]" : "text-[clamp(3rem,7.5vw,5.5rem)]"
          } ${skipped ? "text-clay-light line-through decoration-clay-light/70 decoration-[6px]" : "text-white"}`}
        >
          <span className="sr-only">{skipped ? "Neatvažiuos: " : "Kitas išvežimas: "}</span>
          {date ? formatDayCap(date) : "Nesuplanuota"}
        </h2>
        {stamp[status] && (
          <span
            key={status + date}
            className={`stamp mt-2 shrink-0 rounded-[2px] border-[3px] px-3 py-0.5 font-display text-base font-bold uppercase tracking-[0.08em] md:text-lg ${
              skipped ? "border-clay-light text-clay-light" : "border-sheet/80 text-sheet"
            }`}
          >
            {stamp[status]}
          </span>
        )}
      </div>

      {subline && (
        <p className={`mt-2 font-display text-xl font-medium md:text-2xl ${skipped ? "text-clay-light" : "text-sheet-lo"}`}>
          {subline}
        </p>
      )}
      {skipped && state.nextScheduledDate && (
        <p className="mt-3 font-display text-3xl font-semibold text-white">Kitas išvežimas: {formatDay(state.nextScheduledDate)}</p>
      )}
      {status === "today" && <p className="mt-3 text-sheet-lo">Šiukšliavežė jau pakeliui.</p>}
      {status === "none" && <p className="mt-3 text-sheet-lo">Grafike išvežimų nėra. Galite užsakyti papildomą.</p>}
      {failureLine}

      {/* screen readers hear state changes made on this panel */}
      <p className="sr-only" aria-live="polite">
        {stamp[status] ?? ""}
      </p>

      <div className="mt-6 flex flex-col gap-3 border-t border-sheet/25 pt-5 sm:flex-row">{actions}</div>
    </section>
  );
}

function dayKind(d: Day): MarkerKind {
  if (d.extra) return "extra";
  if (d.skip) return "skipped";
  if (d.scheduled) return "scheduled";
  if (d.bookable) return "bookable";
  return "none";
}

function dayLabel(d: Day): string {
  const when = formatHero(d.date);
  if (d.isToday) return `${when}, šiandien`;
  if (d.extra) return `${when}, užsakyta`;
  if (d.skip) return `${when}, šiukšliavežė nevažiuos`;
  if (d.scheduled) return `${when}, ${d.confirmed ? "patvirtinta, atvažiuos" : "atvažiuos pagal grafiką"}`;
  if (d.bookable) return `${when}, galima užsakyti`;
  return `${when}, užsakyti negalima`;
}

// 14 equal day columns. Arrow keys move along the strip; selecting a day opens its panel below.
function Ledger({
  days,
  selected,
  pulse,
  onSelect,
}: {
  days: Day[];
  selected: string | null;
  pulse: number;
  onSelect: (date: string) => void;
}) {
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])")];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    buttons[Math.min(Math.max(i + (e.key === "ArrowRight" ? 1 : -1), 0), buttons.length - 1)]?.focus();
  }

  return (
    <div className="mt-4">
      <div className="-mx-5 overflow-x-auto px-5 pb-1 [mask-image:linear-gradient(to_right,black_82%,transparent)] md:mx-0 md:px-0 md:[mask-image:none]">
        <div className="grid min-w-[620px] grid-cols-14 gap-1" onKeyDown={onKeyDown}>
          {days.map((d) => {
            const kind = dayKind(d);
            const date = parseISODate(d.date);
            const isSel = d.date === selected;
            const disabled = d.isToday || kind === "none";
            return (
              <button
                key={`${d.date}-${d.bookable ? pulse : 0}`}
                onClick={() => onSelect(d.date)}
                disabled={disabled}
                data-bookable={d.bookable || undefined}
                aria-label={dayLabel(d)}
                aria-pressed={isSel}
                className={`flex min-h-[88px] flex-col items-center justify-between rounded-[3px] py-2.5 transition-colors ${
                  isSel
                    ? "on-green bg-green text-sheet"
                    : disabled
                      ? "cursor-default text-stone-deep"
                      : kind === "scheduled" || kind === "extra"
                        ? "bg-sheet-lo hover:bg-sheet-hi"
                        : "hover:bg-sheet-hi"
                } ${d.bookable && pulse ? "pulse-bookable" : ""}`}
              >
                <span
                  className={`font-medium ${d.isToday ? "text-xs tracking-tight" : "text-sm"} ${
                    isSel ? "text-sheet-lo" : disabled ? "" : kind === "extra" ? "text-clay-deep" : kind === "scheduled" ? "text-green" : "text-green-muted"
                  }`}
                >
                  {d.isToday ? "Šiandien" : formatWeekdayShort(d.date)}
                </span>
                <span
                  className={`font-display text-[1.6rem] font-semibold leading-none ${
                    kind === "skipped" ? "text-clay-deep line-through decoration-clay decoration-2" : ""
                  } ${disabled && !isSel ? "font-medium opacity-70" : ""}`}
                >
                  {date.getDate()}
                </span>
                <Marker kind={kind} inverted={isSel} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-deep">
        <Legend kind="scheduled">Pagal grafiką, kas 2 sav.</Legend>
        <Legend kind="bookable">{`Galima užsakyti, ${EXTRA_PICKUP_PRICE_EUR} €`}</Legend>
        <Legend kind="extra">Užsakyta papildomai</Legend>
        <Legend kind="skipped">Nevažiuos</Legend>
      </div>
    </div>
  );
}

function Legend({ kind, children }: { kind: MarkerKind; children: string }) {
  return (
    <span className="flex items-center gap-2">
      <Marker kind={kind} />
      {children}
    </span>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: string }) {
  return (
    <button
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-[3px] px-3.5 font-semibold ${
        selected ? "bg-green text-sheet" : "border border-rule bg-sheet-hi text-ink hover:border-green-muted"
      }`}
    >
      {children}
    </button>
  );
}

const PANEL_PRIMARY = "min-h-13 rounded-[4px] bg-green px-6 font-display text-lg font-semibold text-sheet hover:bg-green-deep";
// Clay accent outline for "not coming" / cancel actions on the light panels.
const PANEL_CLAY =
  "min-h-13 rounded-[4px] border-2 border-clay px-6 font-display text-lg font-semibold text-clay-deep hover:bg-clay/10";

// The selected day continues the strip panel below a rule (not a nested card), with its one action.
function DayPanel({
  day,
  onClose,
  onSkip,
  onUnskip,
  onBook,
  onCancel,
}: {
  day: Day;
  onClose: () => void;
  onSkip: (date: string) => void;
  onUnskip: (p: Pickup) => void;
  onBook: (date: string, tw: TimeWindow | null) => void;
  onCancel: (p: Pickup) => void;
}) {
  const [tw, setTw] = useState<TimeWindow | null>(null);
  const kind = dayKind(day);

  let status: string;
  let body: ReactNode = null;
  let action: ReactNode;
  if (kind === "extra") {
    status = "Užsakytas papildomas išvežimas";
    body = (
      <p className="mt-1 text-stone-deep">
        {day.extra!.time_window ? TIME_WINDOWS[day.extra!.time_window] : "Bet kuriuo metu"} · {Number(day.extra!.price_eur)} €
      </p>
    );
    action = (
      <button onClick={() => onCancel(day.extra!)} className={PANEL_CLAY}>
        Atšaukti užsakymą
      </button>
    );
  } else if (kind === "skipped") {
    status = "Šiukšliavežė nevažiuos";
    action = (
      <button onClick={() => onUnskip(day.skip!)} className={PANEL_PRIMARY}>
        Vis dėlto išstumsiu
      </button>
    );
  } else if (kind === "scheduled") {
    status = day.confirmed ? "Atvažiuos, konteinerį išstumsite" : "Atvažiuos pagal grafiką";
    body = (
      <p className="mt-1 text-stone-deep">
        Jei konteinerio išstumti nereikia, šiukšliavežė pas jus nevažiuos. Kitas išvežimas bus{" "}
        {formatDay(addDays(day.date, SCHEDULE_INTERVAL_DAYS))}
      </p>
    );
    action = (
      <button onClick={() => onSkip(day.date)} className={PANEL_CLAY}>
        Nereikia išvežti
      </button>
    );
  } else {
    status = "Laisva diena, galima užsakyti";
    body = (
      <div className="mt-3">
        <p id={`tw-${day.date}`} className="text-sm font-semibold text-green-muted">
          Laikas <span className="font-normal text-stone-deep">(nebūtina)</span>
        </p>
        <div role="group" aria-labelledby={`tw-${day.date}`} className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(TIME_WINDOWS) as TimeWindow[]).map((key) => (
            <Chip key={key} selected={tw === key} onClick={() => setTw(tw === key ? null : key)}>
              {TIME_WINDOWS[key]}
            </Chip>
          ))}
        </div>
      </div>
    );
    action = (
      <button onClick={() => onBook(day.date, tw)} className={PANEL_PRIMARY}>
        Užsakyti už {EXTRA_PICKUP_PRICE_EUR} €
      </button>
    );
  }

  return (
    <div
      role="region"
      aria-label={`${formatHero(day.date)}: ${status}`}
      className="day-panel mt-5 border-t border-rule pt-5"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="flex items-start justify-between gap-4">
        <div aria-live="polite">
          <h3 className="font-display text-2xl font-semibold leading-tight">{formatHero(day.date)}</h3>
          <p className="font-semibold text-green-muted">{status}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Uždaryti dienos informaciją"
          className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] text-green-muted hover:bg-sheet-hi"
        >
          <CloseIcon />
        </button>
      </div>
      {body}
      <div className="mt-4">{action}</div>
    </div>
  );
}
