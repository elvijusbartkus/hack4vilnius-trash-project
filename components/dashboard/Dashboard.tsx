"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  BOOKING_DAYS_AHEAD,
  CALENDAR_DAYS,
  HOUSEHOLD_WASTE_TYPE,
  WASTE_TYPES,
  EXTRA_PICKUP_PRICE_EUR,
  SCHEDULE_INTERVAL_DAYS,
  type WasteType,
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
  getNextPickup,
  removePickup,
  skipScheduled,
  subscribePickups,
  type Household,
  type HouseholdState,
  type Pickup,
  type ServiceRecord,
} from "@/lib/pickups";
import { HistoryField, ImpactField, Panel } from "./Cards";
import Header from "./Header";
import { isInvoicePaid } from "./Invoices";
import { ChevronDownIcon, Marker, type MarkerKind } from "./Icons";
import Modal from "./Modal";
import { DemoControls, NotificationBanner, ReminderPopup } from "./Reminder";
import Toast, { type ToastData } from "./Toast";

const ERROR_TEXT = "Nepavyko susisiekti su serveriu. Patikrinkite ryšį ir bandykite dar kartą.";

type Day = {
  date: string;
  isToday: boolean;
  scheduled: boolean;
  skip: Pickup | null;
  extra: Pickup | null;
  bookable: boolean; // within the next BOOKING_DAYS_AHEAD days, not Sunday, no extra yet
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
    return {
      date,
      isToday: i === 0,
      scheduled: scheduled.has(date),
      skip: state.pickups.find((p) => p.date === date && p.kind === "scheduled" && p.status === "skipped") ?? null,
      extra,
      bookable: i > 0 && i <= BOOKING_DAYS_AHEAD && !extra && parseISODate(date).getDay() !== 0,
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
  const [toast, setToast] = useState<ToastData | null>(null);
  // open "Papildomas išvežimas" popup: from a calendar day (that day only) or from the section button (day choice)
  const [extraFor, setExtraFor] = useState<{ date: string; fixed: boolean } | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [banner, setBanner] = useState(false); // in-page notification (fallback when system ones aren't possible)
  const pendingRef = useRef<"yes" | "no" | "open" | null>(null);
  const [billingUnpaid, setBillingUnpaid] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBillingUnpaid(!isInvoicePaid(householdId));
  }, [householdId]);
  const [pendingTick, setPendingTick] = useState(0);
  const demo = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "1";
  const toastSeq = useRef(0); // unique key per toast so each one restarts its timer

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

  // Every action: write, refresh in place, toast with undo.
  async function act(write: () => Promise<number | void>, message: string, undo: (result: number | void) => Promise<unknown>) {
    try {
      const result = await write();
      await load();
      setToast({
        id: ++toastSeq.current,
        message,
        undo: () => {
          undo(result)
            .then(load)
            .then(() => setToast({ id: ++toastSeq.current, message: "Atšaukta. Viskas kaip buvo." }))
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

  // The resident's answer to the reminder for `date`. A new answer replaces an earlier one; undo restores it.
  function answer(date: string, yes: boolean) {
    const prev =
      state?.pickups.find((p) => p.date === date && p.kind === "scheduled" && (p.status === "planned" || p.status === "skipped")) ??
      null;
    if (prev && (prev.status === "planned") === yes) return; // same answer again: nothing to do
    const message = yes
      ? date === tomorrow
        ? "Ačiū! Šiukšliavežė atvažiuos rytoj."
        : `Ačiū! Šiukšliavežė atvažiuos ${formatDay(date)}`
      : `${date === tomorrow ? "Rytoj" : capitalize(formatDay(date))} pas jus neužsuks. Kitas išvežimas: ${formatDay(
          addDays(date, SCHEDULE_INTERVAL_DAYS),
        )}`;
    return act(
      async () => {
        if (prev) await removePickup(prev.id);
        return yes ? confirmScheduled(householdId, date) : skipScheduled(householdId, date);
      },
      message,
      async (id) => {
        await removePickup(id as number);
        if (prev) await (prev.status === "planned" ? confirmScheduled : skipScheduled)(householdId, date);
      },
    );
  }
  const confirm = (date: string) => answer(date, true);
  const decline = (date: string) => answer(date, false);

  // Reminder from a notification: open the popup, or apply an action button's answer directly.
  function handleReminder(reply: "yes" | "no" | null) {
    setBanner(false);
    const date = state?.scheduledDate;
    if (!date) return;
    if (reply) answer(date, reply === "yes");
    else setReminderOpen(true);
  }

  // Service worker messages (notification clicked while the page is open).
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "reminder") pendingRef.current = e.data.answer ?? "open";
      setPendingTick((n) => n + 1);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  // ?remind=1 / ?answer=yes|no (page opened from a notification): handled once the house has loaded.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const a = q.get("answer");
    if (q.get("remind") === "1" || a === "yes" || a === "no") {
      pendingRef.current = a === "yes" || a === "no" ? a : "open";
      q.delete("remind");
      q.delete("answer");
      window.history.replaceState(null, "", window.location.pathname + (q.toString() ? `?${q}` : ""));
    }
  }, []);

  useEffect(() => {
    if (!state || !pendingRef.current) return;
    const p = pendingRef.current;
    pendingRef.current = null;
    handleReminder(p === "open" ? null : p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, pendingTick]);

  const reportExtra = (date: string, wasteType: WasteType) => {
    setExtraFor(null);
    return act(
      () => bookExtra(householdId, date, null, wasteType),
      `Užregistruota. Šiukšliavežė paims papildomai ${formatDay(date)}`,
      (id) => cancelExtra(id as number),
    );
  };

  const cancel = (p: Pickup) =>
    act(
      () => cancelExtra(p.id),
      `${capitalize(formatDay(p.date))} papildomas išvežimas atšauktas.`,
      () => bookExtra(householdId, p.date, null, p.waste_type ?? null),
    );

  const days = state ? buildDays(state) : [];
  const bookableDays = days.filter((d) => d.bookable).map((d) => d.date);
  const extras = state?.extras ?? [];

  // From the section button: preselect the scheduled day if it is within range.
  function openExtra(date?: string) {
    if (date) return setExtraFor({ date, fixed: true }); // a day picked in the calendar: that day only
    const pre = state?.scheduledDate && bookableDays.includes(state.scheduledDate) ? state.scheduledDate : bookableDays[0];
    if (pre) setExtraFor({ date: pre, fixed: false });
  }


  return (
    <div className="min-h-dvh bg-ground">
      <div inert={!!extraFor || reminderOpen}>
        <Header
          address={state?.household.address ?? null}
          name={name}
          onSwitch={onSwitch}
          current="home"
          billingUnpaid={billingUnpaid}
        />

        <main className="mx-auto max-w-[1200px] px-3 pb-32 pt-5 md:px-8 md:pt-8">
          <h1 className="sr-only">WasteWise: jūsų atliekų išvežimas</h1>
          {demo && state && <DemoControls onFallback={(delay) => setTimeout(() => setBanner(true), delay)} />}
          {error && (
            <p role="alert" className="mb-5 rounded-[4px] border-2 border-orange bg-sheet-hi px-5 py-3 font-semibold text-orange-deep">
              {error}
            </p>
          )}

          {!state ? (
            <p className="py-16 text-stone-deep">{error ? "Duomenų nėra." : "Kraunama…"}</p>
          ) : (
            <div className="flex flex-col gap-4 md:grid md:grid-cols-12 md:items-start md:gap-6">
              <div className="max-md:contents md:col-span-8 md:flex md:flex-col md:gap-6">
                <Hero state={state} onConfirm={confirm} onDecline={decline} />

                <Panel title="Kalendorius" className="order-2 md:order-none">
                  <Ledger days={days} onPick={(d) => openExtra(d)} />
                </Panel>

                <Panel title="Papildomas išvežimas" className="order-3 md:order-none">
                  <p className="mt-2 text-stone-deep">
                    Bus daugiau atliekų nei įprastai? Praneškite, ir šiukšliavežė paims papildomai.
                  </p>
                  {extras.length > 0 && (
                    <ul className="mt-3 divide-y divide-rule/60 border-y border-rule/60">
                      {extras.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-4 py-2">
                          <span className="flex items-center gap-2.5">
                            <Marker kind="extra" />
                            <span className="font-display text-lg font-semibold">{formatHero(p.date)}</span>
                            {p.waste_type && <span className="text-stone-deep">· {WASTE_TYPES[p.waste_type]}</span>}
                          </span>
                          <button
                            onClick={() => cancel(p)}
                            className="min-h-11 rounded-[3px] border-2 border-orange px-4 font-semibold text-orange-deep hover:bg-orange/10"
                          >
                            Atšaukti
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => openExtra()}
                    disabled={bookableDays.length === 0}
                    className="mt-4 min-h-13 rounded-[4px] bg-green px-6 font-display text-lg font-semibold text-sheet hover:bg-green-deep disabled:opacity-40"
                  >
                    Pranešti apie papildomą išvežimą
                  </button>
                </Panel>
              </div>

              <div className="max-md:contents md:col-span-4 md:flex md:flex-col md:gap-6">
                <div className="order-4 md:order-none">
                  <HistoryField household={state.household} />
                </div>
                <div className="order-5 md:order-none">
                  <ImpactField pickups={state.pickups} />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {banner && state && (
        <NotificationBanner onOpen={() => handleReminder(null)} onDismiss={() => setBanner(false)} />
      )}
      {reminderOpen && state?.scheduledDate && (
        <ReminderPopup
          date={state.scheduledDate}
          containerLine={[state.household.bin_volume_l && `${state.household.bin_volume_l}L`, state.household.carrier, "kas 2 sav.", WASTE_TYPES[HOUSEHOLD_WASTE_TYPE]]
            .filter(Boolean)
            .join(" · ")}
          onClose={() => setReminderOpen(false)}
          onAnswer={(yes) => {
            setReminderOpen(false);
            answer(state.scheduledDate!, yes);
          }}
        />
      )}
      {extraFor && state && (
        <ExtraPopup
          initialDate={extraFor.date}
          fixedDay={extraFor.fixed}
          days={bookableDays}
          scheduledDate={state.scheduledDate}
          onClose={() => setExtraFor(null)}
          onReport={reportExtra}
        />
      )}
      {toast && <Toast key={toast.id} toast={toast} onDone={closeToast} />}
    </div>
  );
}

const HERO_BTN = "min-h-14 rounded-[4px] px-7 font-display text-xl font-semibold";
const ON_GREEN_PRIMARY = `${HERO_BTN} bg-sheet text-green hover:bg-white`;
// "Ne, nereikia": white text on green (8.1:1, AA) with an orange outline as the accent.
const ON_GREEN_CLAY = `${HERO_BTN} border-[3px] border-orange-light text-white hover:bg-orange-light/15`;

// The newest real VASA record, if the truck could not collect last time.
function lastFailure(history: ServiceRecord[]): ServiceRecord | null {
  const newest = [...history].sort((a, b) => b.date.localeCompare(a.date))[0];
  return newest && !newest.serviced ? newest : null;
}

// Hero: three states from today's date.
//  1. Day before the scheduled pickup: the evening question (one click, toast with undo).
//  2. A pickup day in the real VASA history: emptied (green) or not (orange).
//  3. Any other day: the next pickup.
function Hero({
  state,
  onConfirm,
  onDecline,
}: {
  state: HouseholdState;
  onConfirm: (date: string) => void;
  onDecline: (date: string) => void;
}) {
  const today = todayISO();
  const h = state.household;
  const record = (h.history ?? []).find((r) => r.date.slice(0, 10) === today) ?? null;
  const scheduled = state.scheduledDate;
  const isEve = !record && !!scheduled && scheduled === addDays(today, 1);
  // day · litres · who collects · cadence · what it is
  const containerLine = [h.bin_volume_l && `${h.bin_volume_l}L`, h.carrier, "kas 2 sav.", WASTE_TYPES[HOUSEHOLD_WASTE_TYPE]]
    .filter(Boolean)
    .join(" · ");

  const answer = isEve ? (state.skip ? "no" : state.confirmed ? "yes" : null) : null;
  const failure = isEve && !answer ? lastFailure(h.history ?? []) : null;

  let title: string;
  let tone: "plain" | "good" | "bad" = "plain";
  let detail: string | null = null;
  if (record) {
    const when = formatDay(record.date.slice(0, 10));
    if (record.serviced) {
      title = `Ištuštinta ${when}, ${record.date.slice(11, 16)}`;
      tone = "good";
    } else {
      title = `Neištuštinta: ${(record.reason ?? "konteineris nepasiektas").toLowerCase()}`;
      tone = "bad";
      detail = `${capitalize(when)} Kitas išvežimas: ${scheduled ? formatDay(scheduled) : "nežinomas"}`;
    }
  } else if (isEve) {
    title = formatDayCap(scheduled!);
  } else {
    const next = state.nextScheduledDate ?? scheduled;
    title = next ? `Kitas išvežimas: ${formatDay(next)}` : "Išvežimų grafike nėra";
  }

  return (
    <section
      aria-labelledby="hero-h"
      className="on-green route-grid order-1 rounded-[4px] bg-green px-6 py-6 text-sheet shadow-[0_20px_40px_-24px_rgb(15_92_74/0.8)] md:order-none md:px-9 md:py-7"
    >
      {isEve && (
        <p className="font-display text-2xl font-semibold leading-tight text-white md:text-[1.75rem]">
          {answer ? "Sekantis išvežimas rytoj" : "Sekantis išvežimas rytoj, ar išstumsite konteinerį?"}
        </p>
      )}

      <div className={`flex items-start justify-between gap-4 ${isEve ? "mt-3" : ""}`}>
        <h2
          id="hero-h"
          className={`font-display font-semibold leading-[0.95] tracking-[-0.015em] ${
            isEve ? "text-[clamp(2.5rem,6vw,4.25rem)]" : "text-[clamp(2.25rem,5.5vw,4rem)]"
          } ${tone === "bad" || answer === "no" ? "text-orange-light" : "text-white"} ${
            answer === "no" ? "line-through decoration-orange-light/70 decoration-[6px]" : ""
          }`}
        >
          {title}
        </h2>
        {answer && (
          <span
            key={answer}
            className={`stamp mt-2 shrink-0 rounded-[2px] border-[3px] px-3 py-0.5 font-display text-base font-bold uppercase tracking-[0.08em] md:text-lg ${
              answer === "no" ? "border-orange-light text-orange-light" : "border-sheet/80 text-sheet"
            }`}
          >
            {answer === "no" ? "Nevažiuos" : "Patvirtinta"}
          </span>
        )}
      </div>

      {/* the container, as one quiet line under the date */}
      <p className="mt-2 font-display text-lg font-medium text-sheet-lo md:text-xl">
        {isEve && scheduled ? `${capitalize(formatWeekday(scheduled))} · ` : ""}
        {containerLine}
      </p>
      {detail && <p className="mt-2 text-sheet-lo">{detail}</p>}
      {answer === "no" && state.nextScheduledDate && (
        <p className="mt-3 font-display text-2xl font-semibold text-white">Kitas išvežimas: {formatDay(state.nextScheduledDate)}</p>
      )}

      {failure && (
        <p className="mt-5 rounded-[3px] border-2 border-orange-light bg-orange-light/10 px-4 py-3 text-sheet">
          <span className="font-semibold text-orange-light">
            Praėjusį kartą ({formatDay(failure.date.slice(0, 10))}) neišvežta:
          </span>{" "}
          {(failure.reason ?? "konteineris nepasiektas").toLowerCase()}.
        </p>
      )}

      <p className="sr-only" aria-live="polite">
        {answer === "no" ? "Nevažiuos" : answer === "yes" ? "Patvirtinta" : ""}
      </p>

      {isEve && !answer && (
        <div className="mt-6 flex flex-col gap-3 border-t border-sheet/25 pt-5 sm:flex-row">
          <button onClick={() => onConfirm(scheduled!)} className={ON_GREEN_PRIMARY}>
            Taip, išstumsiu
          </button>
          <button onClick={() => onDecline(scheduled!)} className={ON_GREEN_CLAY}>
            Ne, nereikia
          </button>
        </div>
      )}
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
  const parts = [formatHero(d.date)];
  if (d.isToday) parts.push("šiandien");
  if (d.extra) parts.push("papildomas išvežimas");
  if (d.skip) parts.push("šiukšliavežė nevažiuos");
  else if (d.scheduled) parts.push("išvežimas pagal grafiką");
  if (d.bookable) parts.push("galima pranešti apie papildomą");
  return parts.join(", ");
}

// 14 equal day columns. Days within the next 7 open the extra-pickup popup with that day selected.
function Ledger({ days, onPick }: { days: Day[]; onPick: (date: string) => void }) {
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])")];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    const next = buttons[Math.min(Math.max(i + (e.key === "ArrowRight" ? 1 : -1), 0), buttons.length - 1)];
    next?.focus();
    next?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }

  // The strip scrolls sideways at every width; fades and arrows show which way there is more.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: true });
  const updateEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    updateEdges();
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, [updateEdges]);
  const page = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  const arrow =
    "absolute top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-rule bg-sheet-hi text-green shadow-[0_6px_16px_-8px_rgb(29_33_30/0.5)] hover:bg-white md:flex";

  return (
    <div className="mt-4">
      <div className="relative">
      {edges.left && (
        <>
          <div className="pointer-events-none absolute inset-y-0 -left-5 z-10 w-16 bg-gradient-to-r from-sheet via-sheet/80 to-transparent md:left-0" aria-hidden="true" />
          <button onClick={() => page(-1)} aria-label="Ankstesnės dienos" className={`${arrow} -left-3`}>
            <ChevronDownIcon className="rotate-90" />
          </button>
        </>
      )}
      {edges.right && (
        <>
          <div className="pointer-events-none absolute inset-y-0 -right-5 z-10 w-16 bg-gradient-to-l from-sheet via-sheet/80 to-transparent md:right-0" aria-hidden="true" />
          <button onClick={() => page(1)} aria-label="Tolesnės dienos" className={`${arrow} -right-3`}>
            <ChevronDownIcon className="-rotate-90" />
          </button>
        </>
      )}
      <div
        ref={scrollRef}
        onScroll={updateEdges}
        className="-mx-5 snap-x snap-mandatory overflow-x-auto scroll-px-5 px-5 pb-1 [scrollbar-width:none] md:mx-0 md:scroll-px-0 md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        <div className="grid w-max auto-cols-[64px] grid-flow-col gap-1.5 md:auto-cols-[76px]" onKeyDown={onKeyDown}>
          {days.map((d) => {
            const kind = dayKind(d);
            const date = parseISODate(d.date);
            const disabled = !d.bookable;
            return (
              <button
                key={d.date}
                onClick={() => onPick(d.date)}
                disabled={disabled}
                aria-label={dayLabel(d)}
                className={`flex min-h-[88px] snap-start flex-col items-center justify-between rounded-[3px] py-2.5 transition-colors ${
                  disabled ? "cursor-default" : "hover:bg-sheet-hi"
                } ${d.scheduled || d.extra ? "bg-sheet-lo" : ""} ${kind === "none" ? "text-stone-deep" : ""}`}
              >
                <span
                  className={`font-medium ${d.isToday ? "text-xs tracking-tight" : "text-sm"} ${
                    d.extra ? "text-orange-deep" : d.scheduled ? "text-green" : kind === "none" ? "" : "text-green-muted"
                  }`}
                >
                  {d.isToday ? "Šiandien" : formatWeekdayShort(d.date)}
                </span>
                <span
                  className={`font-display text-[1.6rem] font-semibold leading-none ${
                    kind === "skipped" ? "text-orange-deep line-through decoration-orange decoration-2" : ""
                  } ${kind === "none" ? "font-medium opacity-70" : ""}`}
                >
                  {date.getDate()}
                </span>
                {/* a scheduled day can also take an extra report; it keeps its own mark */}
                <Marker kind={kind} />
              </button>
            );
          })}
        </div>
      </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-deep">
        <Legend kind="scheduled">Pagal grafiką, kas 2 sav.</Legend>
        <Legend kind="bookable">Galima pranešti apie papildomą išvežimą</Legend>
        <Legend kind="extra">Papildomas išvežimas</Legend>
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

// "Papildomas išvežimas" popup: the day (fixed when picked in the calendar), which bin, price, one button.
function ExtraPopup({
  initialDate,
  fixedDay,
  days,
  scheduledDate,
  onClose,
  onReport,
}: {
  initialDate: string;
  fixedDay: boolean;
  days: string[];
  scheduledDate: string | null;
  onClose: () => void;
  onReport: (date: string, wasteType: WasteType) => void;
}) {
  const [date, setDate] = useState(initialDate);
  const [wasteType, setWasteType] = useState<WasteType>(HOUSEHOLD_WASTE_TYPE);
  return (
    <Modal
      title="Papildomas išvežimas"
      description={fixedDay ? capitalize(formatHero(date)) : "Bus daugiau atliekų nei įprastai? Pasirinkite dieną."}
      onClose={onClose}
    >
      {!fixedDay && (
        <>
          <p id="extra-day" className="mt-4 text-sm font-semibold text-green-muted">
            Diena
          </p>
          <div role="group" aria-labelledby="extra-day" className="mt-2 flex flex-wrap gap-2">
            {days.map((d) => (
              <Chip key={d} selected={d === date} onClick={() => setDate(d)}>
                {`${formatWeekdayShort(d)} ${parseISODate(d).getDate()}${d === scheduledDate ? " · grafikas" : ""}`}
              </Chip>
            ))}
          </div>
        </>
      )}
      <p id="extra-bin" className="mt-5 text-sm font-semibold text-green-muted">
        Kokios atliekos?
      </p>
      <div role="group" aria-labelledby="extra-bin" className="mt-2 flex flex-wrap gap-2">
        {(Object.keys(WASTE_TYPES) as WasteType[]).map((t) => (
          <Chip key={t} selected={wasteType === t} onClick={() => setWasteType(t)}>
            {WASTE_TYPES[t]}
          </Chip>
        ))}
      </div>
      <p className="mt-5 flex items-baseline justify-between border-t border-rule pt-3">
        <span className="text-stone-deep">{fixedDay ? WASTE_TYPES[wasteType] : capitalize(formatHero(date))}</span>
        <span className="font-display text-xl font-semibold">{EXTRA_PICKUP_PRICE_EUR}&nbsp;€</span>
      </p>
      <button
        data-autofocus
        onClick={() => onReport(date, wasteType)}
        className="mt-4 flex min-h-14 w-full items-center justify-center rounded-[4px] bg-green px-6 font-display text-xl font-semibold text-sheet hover:bg-green-deep"
      >
        Pranešti
      </button>
    </Modal>
  );
}
