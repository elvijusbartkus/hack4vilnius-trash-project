"use client";

import { useEffect, useRef, useState } from "react";
import {
  EXTRA_PICKUP_PRICE_EUR,
  INVOICE_AMOUNT_EUR,
  INVOICE_DUE,
  INVOICE_PERIOD,
  INVOICE_RANGE,
  PAST_INVOICE_PERIODS,
} from "@/lib/config";
import { formatDay, formatEur } from "@/lib/dates";
import type { Pickup } from "@/lib/pickups";
import { Panel } from "./Cards";
import { CheckIcon } from "./Icons";
import Modal from "./Modal";

// Mock-up only: no real payments, no provider SDK. Paid status lives in localStorage
// (per household and period) so it survives a refresh; /?reset=1 clears it.
export const INVOICE_PAID_PREFIX = "invoicePaid:";
const paidKey = (householdId: number) => `${INVOICE_PAID_PREFIX}${householdId}:${INVOICE_PERIOD}`;

const METHODS = ["Swedbank", "SEB", "Luminor", "Revolut", "Apple Pay / Google Pay"];

function Chip({ paid }: { paid: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-[2px] border px-2 py-0.5 text-sm font-semibold ${
        paid ? "border-green/60 bg-sheet-hi text-green" : "border-clay bg-clay/10 text-clay-deep"
      }`}
    >
      {paid ? "Apmokėta" : "Neapmokėta"}
    </span>
  );
}

export function InvoicesPanel({
  householdId,
  pickups,
  onPaid,
}: {
  householdId: number;
  pickups: Pickup[];
  onPaid: () => void;
}) {
  const [paid, setPaid] = useState(false);
  const [paying, setPaying] = useState(false);

  // localStorage only exists in the browser, so read it after mount.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPaid(localStorage.getItem(paidKey(householdId)) === "1");
    } catch {}
  }, [householdId]);

  // Extra pickups booked in this period are added to the bill.
  const extras = pickups.filter(
    (p) => p.kind === "extra" && p.status !== "skipped" && p.date >= INVOICE_RANGE[0] && p.date <= INVOICE_RANGE[1],
  ).length;
  const extrasTotal = extras * EXTRA_PICKUP_PRICE_EUR;
  const total = INVOICE_AMOUNT_EUR + extrasTotal;

  function markPaid() {
    try {
      localStorage.setItem(paidKey(householdId), "1");
    } catch {}
    setPaid(true);
    setPaying(false);
    onPaid();
  }

  return (
    <Panel title="Sąskaitos">
      {/* current invoice */}
      <div className="mt-3 border-y border-rule/60 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg font-semibold leading-tight">Vietinė rinkliava</p>
            <p className="text-sm text-stone-deep">
              {INVOICE_PERIOD} · apmokėti iki {formatDay(INVOICE_DUE)}
            </p>
          </div>
          <Chip paid={paid} />
        </div>

        <dl className="mt-3 space-y-1 text-[0.95rem]">
          <div className="flex justify-between gap-3">
            <dt className="text-stone-deep">Atliekų tvarkymo rinkliava</dt>
            <dd className="font-display font-semibold">{formatEur(INVOICE_AMOUNT_EUR)}</dd>
          </div>
          {extras > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-stone-deep">
                Papildomi išvežimai: {extras} × {formatEur(EXTRA_PICKUP_PRICE_EUR).replace(",00", "")}
              </dt>
              <dd className="font-display font-semibold">{formatEur(extrasTotal)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3 border-t border-rule/60 pt-1.5">
            <dt className="font-semibold">Iš viso</dt>
            <dd className="font-display text-lg font-semibold">{formatEur(total)}</dd>
          </div>
        </dl>

        {!paid && (
          <button
            onClick={() => setPaying(true)}
            className="mt-3 min-h-12 w-full rounded-[4px] bg-green px-5 font-display text-lg font-semibold text-sheet hover:bg-green-deep"
          >
            Mokėti {formatEur(total)}
          </button>
        )}
      </div>

      {/* earlier invoices: amounts and numbers blurred on purpose */}
      <ul className="mt-1 divide-y divide-rule/60">
        {PAST_INVOICE_PERIODS.map((period) => (
          <li key={period} className="flex items-center justify-between gap-3 py-2">
            <span>
              <span className="block text-[0.95rem]">{period}</span>
              <span className="block text-xs text-stone-deep">
                <span className="sr-only">Sąskaitos numeris paslėptas</span>
                <span aria-hidden="true" className="select-none blur-[5px]">
                  Nr. VR-2026-00000
                </span>
              </span>
            </span>
            <span className="flex items-center gap-2.5">
              <span className="sr-only">Suma paslėpta</span>
              <span aria-hidden="true" className="select-none font-display font-semibold blur-[5px]">
                {formatEur(INVOICE_AMOUNT_EUR)}
              </span>
              <Chip paid />
            </span>
          </li>
        ))}
      </ul>

      {paying && <PaymentPopup amount={total} onClose={() => setPaying(false)} onPaid={markPaid} />}
    </Panel>
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
        <span className="text-stone-deep">
          Vietinė rinkliava · {INVOICE_PERIOD}
        </span>
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
