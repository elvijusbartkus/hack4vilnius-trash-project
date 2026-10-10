"use client";

import { useState } from "react";
import { capitalize, formatHero } from "@/lib/dates";
import { sendReminder } from "@/lib/pwa";
import { CloseIcon, LogoMark } from "./Icons";
import Modal from "./Modal";

// The evening question as a popup (opened from a notification or the in-page banner). One click answers.
export function ReminderPopup({
  date,
  containerLine,
  onClose,
  onAnswer,
}: {
  date: string;
  containerLine: string;
  onClose: () => void;
  onAnswer: (yes: boolean) => void;
}) {
  return (
    <Modal
      title="Rytoj išvežimas. Išstumsite konteinerį?"
      description={`${capitalize(formatHero(date))} · ${containerLine}`}
      onClose={onClose}
    >
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          data-autofocus
          onClick={() => onAnswer(true)}
          className="min-h-14 rounded-[4px] bg-green px-5 font-display text-xl font-semibold text-sheet hover:bg-green-deep"
        >
          Taip, išstumsiu
        </button>
        <button
          onClick={() => onAnswer(false)}
          className="min-h-14 rounded-[4px] border-[3px] border-orange px-5 font-display text-xl font-semibold text-orange-deep hover:bg-orange/10"
        >
          Ne, nereikia
        </button>
      </div>
    </Modal>
  );
}

// Fallback when system notifications are unavailable (iOS Safari, permission denied):
// an in-page banner styled like a phone notification. Clicking it opens the reminder popup.
export function NotificationBanner({ onOpen, onDismiss }: { onOpen: () => void; onDismiss: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[60] flex justify-center px-3">
      <div
        role="alert"
        className="notif-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[18px] bg-white/95 p-3 text-ink shadow-[0_12px_32px_-8px_rgb(29_33_30/0.45)] backdrop-blur"
      >
        <button onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 text-left" aria-label="Atidaryti priminimą">
          <LogoMark size={38} />
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-bold">WasteWise</span>
              <span className="text-xs text-stone-deep">dabar</span>
            </span>
            <span className="mt-0.5 block leading-snug">Rytoj išvežimas. Išstumsite konteinerį?</span>
          </span>
        </button>
        <button
          onClick={onDismiss}
          aria-label="Uždaryti pranešimą"
          className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-deep hover:bg-ink/5"
        >
          <CloseIcon width={16} height={16} />
        </button>
      </div>
    </div>
  );
}

// Demo-only control (?demo=1): send the reminder now or after 5 s (time to lock the phone).
export function DemoControls({ onFallback }: { onFallback: (delayMs: number) => void }) {
  const [status, setStatus] = useState<string | null>(null);

  async function send(delayMs: number) {
    setStatus("Siunčiama…");
    try {
      const channel = await sendReminder(delayMs);
      if (channel === "system") {
        setStatus(delayMs ? "Pranešimas ateis po 5 s." : "Pranešimas išsiųstas.");
      } else {
        onFallback(delayMs);
        setStatus("Sistemos pranešimai neleidžiami, rodomas puslapio pranešimas.");
      }
    } catch (e) {
      console.error(e);
      onFallback(delayMs);
      setStatus("Rodomas puslapio pranešimas.");
    }
  }

  return (
    // phones: in the page flow above the hero; desktop: floating top-right
    <div className="mb-4 rounded-[4px] border border-rule bg-sheet-hi p-3 md:fixed md:right-3 md:top-[76px] md:z-40 md:mb-0 md:w-60 md:shadow-[0_12px_28px_-12px_rgb(29_33_30/0.4)]">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-stone-deep">Demo</p>
      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-1">
        <button
          onClick={() => send(0)}
          className="min-h-11 rounded-[3px] bg-green px-3 font-semibold text-sheet hover:bg-green-deep"
        >
          Siųsti priminimą
        </button>
        <button
          onClick={() => send(5000)}
          className="min-h-11 rounded-[3px] border-2 border-green px-3 font-semibold text-green hover:bg-sheet"
        >
          Siųsti po 5s
        </button>
      </div>
      {status && (
        <p className="mt-2 text-xs leading-snug text-stone-deep" aria-live="polite">
          {status}
        </p>
      )}
    </div>
  );
}
