"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EXTRA_PICKUP_PRICE_EUR,
  INVOICE_FIXED_EUR,
  INVOICE_PER_EMPTYING_EUR,
  SCHEDULE_INTERVAL_DAYS,
  INVOICE_DUE,
  INVOICE_PERIOD,
  INVOICE_RANGE,
  PAST_INVOICES,
} from "@/lib/config";
import { addDays, formatDay, formatEur, plural } from "@/lib/dates";
import { getNextPickup, subscribePickups, type Household, type Pickup } from "@/lib/pickups";
import { Panel } from "./Cards";
import Header from "./Header";
import { CheckIcon } from "./Icons";
import Modal from "./Modal";
import Toast, { type ToastData } from "./Toast";

// Mock-up only: no real payments, no provider SDK. Paid status lives in localStorage
// (per household and month) so it survives a refresh; /?reset=1 clears it.
export const INVOICE_PAID_PREFIX = "invoicePaid:";
const paidKey = (householdId: number) => `${INVOICE_PAID_PREFIX}${householdId}:${INVOICE_PERIOD}`;

export function isInvoicePaid(householdId: number): boolean {
  try {
    return localStorage.getItem(paidKey(householdId)) === "1";
  } catch {
    return false;
  }
}

// Scheduled emptyings inside this invoice month, stepping the 2-week schedule from next_service.
function scheduledInRange(nextService: string, range: [string, string] = INVOICE_RANGE): number {
  let d = nextService;
  while (d >= range[0]) d = addDays(d, -SCHEDULE_INTERVAL_DAYS);
  let n = 0;
  for (d = addDays(d, SCHEDULE_INTERVAL_DAYS); d <= range[1]; d = addDays(d, SCHEDULE_INTERVAL_DAYS)) n++;
  return n;
}

const METHODS = ["Swedbank", "SEB", "Luminor", "Revolut", "Apple Pay / Google Pay"];

function Chip({ paid }: { paid: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-[2px] border px-2 py-0.5 text-sm font-semibold ${
        paid ? "border-green/60 bg-sheet-hi text-green" : "border-orange bg-orange/10 text-orange-deep"
      }`}
    >
      {paid ? "Apmokėta" : "Neapmokėta"}
    </span>
  );
}

// The "Sąskaitos" screen (/saskaitos): this month's bill with a demo payment, earlier months below.
// /saskaitos?pay=1 opens the payment popup directly (linkable from a reminder or an e-mail).
export function BillingScreen({
  householdId,
  name,
  onSwitch,
}: {
  householdId: number;
  name: string;
  onSwitch: (h: Household) => void;
}) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [paid, setPaid] = useState(false);
  const [paying, setPaying] = useState(false);
  const [openPast, setOpenPast] = useState<(typeof PAST_INVOICES)[number] | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const toastSeq = useRef(0);

  const load = useCallback(
    () =>
      getNextPickup(householdId)
        .then((s) => {
          setHousehold(s.household);
          setPickups(s.pickups);
        })
        .catch((e) => console.error(e)),
    [householdId],
  );

  useEffect(() => {
    load();
    return subscribePickups(() => void load());
  }, [load]);

  // localStorage and the URL only exist in the browser, so read them after mount.
  useEffect(() => {
    const isPaid = isInvoicePaid(householdId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaid(isPaid);
    const q = new URLSearchParams(window.location.search);
    if (q.get("pay") === "1") {
      if (!isPaid) setPaying(true);
      q.delete("pay");
      window.history.replaceState(null, "", window.location.pathname + (q.toString() ? `?${q}` : ""));
    }
  }, [householdId]);

  // Extra pickups booked this month are added to the bill.
  const extras = pickups.filter(
    (p) => p.kind === "extra" && p.status !== "skipped" && p.date >= INVOICE_RANGE[0] && p.date <= INVOICE_RANGE[1],
  ).length;
  const extrasTotal = extras * EXTRA_PICKUP_PRICE_EUR;
  // Variable part: emptyings scheduled this month for the bin (by the schedule, not by answers).
  const emptyings = household?.next_service ? scheduledInRange(household.next_service) : 2;
  const binL = household?.bin_volume_l ?? 240;
  const variable = emptyings * INVOICE_PER_EMPTYING_EUR;
  const total = INVOICE_FIXED_EUR + variable + extrasTotal;

  const markPaid = useCallback(() => {
    try {
      localStorage.setItem(paidKey(householdId), "1");
    } catch {}
    setPaid(true);
    setPaying(false);
    setToast({ id: ++toastSeq.current, message: "Sąskaita apmokėta" });
  }, [householdId]);

  return (
    <div className="min-h-dvh bg-ground">
      <div inert={paying || !!openPast}>
        <Header
          address={household?.address ?? null}
          name={name}
          onSwitch={onSwitch}
          current="billing"
        />

        <main className="mx-auto max-w-[1200px] px-3 pb-32 pt-5 md:px-8 md:pt-8">
          <h1 className="mb-4 font-display text-3xl font-semibold md:mb-6 md:text-4xl">Sąskaitos</h1>

          <div className="flex flex-col gap-4 md:grid md:grid-cols-12 md:items-start md:gap-6">
            {/* this month */}
            <section
              aria-labelledby="current-invoice"
              className="rounded-[4px] border border-rule/70 bg-sheet px-5 py-5 md:col-span-8 md:px-8 md:py-7"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="current-invoice" className="font-display text-2xl font-semibold md:text-3xl">
                    Atliekų tvarkymo sąskaita
                  </h2>
                  <p className="mt-0.5 text-stone-deep">
                    {INVOICE_PERIOD} · apmokėti iki {formatDay(INVOICE_DUE)}
                  </p>
                  <p className="text-sm text-stone-deep">Vietinė rinkliava už komunalinių atliekų tvarkymą</p>
                </div>
                <Chip paid={paid} />
              </div>

              <p className="mt-5 font-display text-[clamp(2.75rem,7vw,4.5rem)] font-semibold leading-none tracking-[-0.015em]">
                {formatEur(total)}
              </p>

              <dl className="mt-5 divide-y divide-rule/60 border-y border-rule/60">
                <div className="flex justify-between gap-3 py-2.5">
                  <dt>
                    <span className="block">Pastovioji dalis</span>
                    <span className="block text-sm text-stone-deep">už būstą, kas mėnesį vienoda</span>
                  </dt>
                  <dd className="font-display text-lg font-semibold">{formatEur(INVOICE_FIXED_EUR)}</dd>
                </div>
                <div className="flex justify-between gap-3 py-2.5">
                  <dt>
                    <span className="block">Kintamoji dalis</span>
                    <span className="block text-sm text-stone-deep">
                      {plural(emptyings, { one: "ištuštinimas", few: "ištuštinimai", many: "ištuštinimų" })} × {binL}L ×{" "}
                      {formatEur(INVOICE_PER_EMPTYING_EUR)}
                    </span>
                  </dt>
                  <dd className="font-display text-lg font-semibold">{formatEur(variable)}</dd>
                </div>
                {extras > 0 && (
                  <div className="flex justify-between gap-3 py-2.5">
                    <dt className="text-stone-deep">
                      Papildomi išvežimai: {extras} × {formatEur(EXTRA_PICKUP_PRICE_EUR).replace(",00", "")}
                    </dt>
                    <dd className="font-display text-lg font-semibold">{formatEur(extrasTotal)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3 py-2.5">
                  <dt className="font-semibold">Iš viso</dt>
                  <dd className="font-display text-xl font-semibold">{formatEur(total)}</dd>
                </div>
              </dl>

              {paid ? (
                <p className="mt-5 flex items-center gap-2 font-semibold text-green">
                  <CheckIcon /> Apmokėta. Ačiū!
                </p>
              ) : (
                <button
                  onClick={() => setPaying(true)}
                  className="mt-5 min-h-14 w-full rounded-[4px] bg-green px-6 font-display text-xl font-semibold text-sheet hover:bg-green-deep sm:w-auto"
                >
                  Mokėti {formatEur(total)}
                </button>
              )}
            </section>

            {/* earlier months: same breakdown as the popup, by the bin's schedule */}
            <Panel title="Ankstesnės sąskaitos" className="md:col-span-4">
              <ul className="mt-2 divide-y divide-rule/60">
                {PAST_INVOICES.map((inv) => {
                  const n = household?.next_service ? scheduledInRange(household.next_service, inv.range) : 2;
                  return (
                    <li key={inv.period}>
                      <button
                        onClick={() => setOpenPast(inv)}
                        aria-label={`${inv.period} sąskaita, apmokėta. Atidaryti`}
                        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-[3px] py-2.5 text-left hover:bg-sheet-hi"
                      >
                        <span>
                          <span className="block">{inv.period}</span>
                          <span className="block text-sm text-stone-deep">
                            {plural(n, { one: "ištuštinimas", few: "ištuštinimai", many: "ištuštinimų" })}
                          </span>
                        </span>
                        <span className="flex items-center gap-2.5">
                          <span className="font-display font-semibold">
                            {formatEur(INVOICE_FIXED_EUR + n * INVOICE_PER_EMPTYING_EUR)}
                          </span>
                          <Chip paid />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </div>
        </main>
      </div>

      {paying && <PaymentPopup amount={total} onClose={() => setPaying(false)} onPaid={markPaid} />}
      {openPast && (
        <PastInvoicePopup
          period={openPast.period}
          emptyings={household?.next_service ? scheduledInRange(household.next_service, openPast.range) : 2}
          binL={binL}
          onClose={() => setOpenPast(null)}
        />
      )}
      {toast && <Toast key={toast.id} toast={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

// Demo payment: pick a method, "Mokėti", 1.5 s "connecting", success.
function PaymentPopup({ amount, onClose, onPaid }: { amount: number; onClose: () => void; onPaid: () => void }) {
  const [method, setMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Keep the latest callback without restarting the 1.5 s timer when the page re-renders.
  const onPaidRef = useRef(onPaid);
  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => onPaidRef.current(), 1500);
    return () => clearTimeout(t);
  }, [loading]);

  return (
    <Modal title="Apmokėti sąskaitą" onClose={loading ? () => {} : onClose}>
      <p className="flex items-baseline justify-between">
        <span className="text-stone-deep">Atliekų tvarkymo sąskaita · {INVOICE_PERIOD}</span>
        <span className="font-display text-2xl font-semibold">{formatEur(amount)}</span>
      </p>

      <p id="pay-methods" className="mt-5 text-sm font-semibold text-green-muted">
        Mokėjimo būdas
      </p>
      <div role="radiogroup" aria-labelledby="pay-methods" className="mt-2 divide-y divide-rule/60 border-y border-rule/60">
        {METHODS.map((m) => {
          const selected = method === m;
          return (
            <button
              key={m}
              role="radio"
              aria-checked={selected}
              disabled={loading}
              onClick={() => setMethod(m)}
              className={`flex min-h-12 w-full items-center justify-between px-2 text-left text-lg font-semibold ${
                selected ? "bg-sheet-hi text-green" : "hover:bg-sheet-hi"
              }`}
            >
              {m}
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                  selected ? "border-green bg-green text-sheet" : "border-stone"
                }`}
                aria-hidden="true"
              >
                {selected && <CheckIcon width={14} height={14} />}
              </span>
            </button>
          );
        })}
      </div>

      <button
        disabled={!method || loading}
        onClick={() => setLoading(true)}
        aria-live="polite"
        className={`mt-5 flex min-h-14 w-full items-center justify-center rounded-[4px] bg-green px-6 font-display text-xl font-semibold text-sheet hover:bg-green-deep ${
          loading ? "cursor-progress" : "disabled:opacity-50"
        }`}
      >
        {loading ? "Jungiamasi prie banko..." : "Mokėti"}
      </button>
      <p className="mt-3 text-center text-xs text-stone-deep">Mokėjimas per Paysera · Demo, pinigai nenurašomi</p>
    </Modal>
  );
}

// An earlier month's bill: the same breakdown as the current one, already paid.
function PastInvoicePopup({
  period,
  emptyings,
  binL,
  onClose,
}: {
  period: string;
  emptyings: number;
  binL: number;
  onClose: () => void;
}) {
  const variable = emptyings * INVOICE_PER_EMPTYING_EUR;
  const total = INVOICE_FIXED_EUR + variable;
  return (
    <Modal title="Atliekų tvarkymo sąskaita" description={`${period} · Vietinė rinkliava už komunalinių atliekų tvarkymą`} onClose={onClose}>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="font-display text-4xl font-semibold leading-none">{formatEur(total)}</span>
        <Chip paid />
      </div>
      <dl className="mt-4 divide-y divide-rule/60 border-y border-rule/60">
        <div className="flex justify-between gap-3 py-2.5">
          <dt>
            <span className="block">Pastovioji dalis</span>
            <span className="block text-sm text-stone-deep">už būstą, kas mėnesį vienoda</span>
          </dt>
          <dd className="font-display text-lg font-semibold">{formatEur(INVOICE_FIXED_EUR)}</dd>
        </div>
        <div className="flex justify-between gap-3 py-2.5">
          <dt>
            <span className="block">Kintamoji dalis</span>
            <span className="block text-sm text-stone-deep">
              {plural(emptyings, { one: "ištuštinimas", few: "ištuštinimai", many: "ištuštinimų" })} × {binL}L ×{" "}
              {formatEur(INVOICE_PER_EMPTYING_EUR)}
            </span>
          </dt>
          <dd className="font-display text-lg font-semibold">{formatEur(variable)}</dd>
        </div>
        <div className="flex justify-between gap-3 py-2.5">
          <dt className="font-semibold">Iš viso</dt>
          <dd className="font-display text-xl font-semibold">{formatEur(total)}</dd>
        </div>
      </dl>
      <button
        data-autofocus
        onClick={onClose}
        className="mt-5 flex min-h-12 w-full items-center justify-center rounded-[4px] border-2 border-green px-6 font-display text-lg font-semibold text-green hover:bg-sheet-hi"
      >
        Uždaryti
      </button>
    </Modal>
  );
}
