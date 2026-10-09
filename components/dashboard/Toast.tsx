"use client";

import { useEffect } from "react";
import { CheckIcon } from "./Icons";

export type ToastData = { id: number; message: string; undo?: () => void };

// Bottom toast with "Atšaukti" undo. The bar drains over 8s (CSS); hover or focus pauses it,
// so the undo never disappears while someone is reaching for it.
// Keyboard users get Ctrl/Cmd+Z while the toast is visible, so undo never needs a tab hunt.
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export default function Toast({ toast, onDone }: { toast: ToastData; onDone: () => void }) {
  const shortcut = isMac ? "⌘Z" : "Ctrl+Z";
  useEffect(() => {
    if (!toast.undo) return;
    function onKey(e: KeyboardEvent) {
      // Leave text undo alone inside inputs (e.g. the address search).
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key.toLowerCase() === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        toast.undo!();
        onDone();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toast, onDone]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:inset-x-auto md:right-8">
      <div
        role="status"
        aria-live="polite"
        className="toast slip pointer-events-auto relative w-full max-w-md overflow-hidden rounded-[3px] bg-ink text-sheet shadow-[0_16px_32px_-12px_rgb(29_33_30/0.5)]"
      >
        <div className="flex items-center gap-3 py-2.5 pl-4 pr-2.5">
          <CheckIcon className="shrink-0 text-sheet-lo" />
          <span className="flex-1 font-semibold">
            {toast.message}
            {toast.undo && <span className="sr-only">. Atšaukti galite ir klavišais {shortcut}.</span>}
          </span>
          {toast.undo && (
            <button
              onClick={() => {
                toast.undo!();
                onDone();
              }}
              className="min-h-11 shrink-0 rounded-[3px] border border-sheet/60 px-4 font-semibold text-sheet hover:bg-white/10"
            >
              Atšaukti
            </button>
          )}
          {toast.undo && (
            <kbd className="hidden shrink-0 pr-2 font-sans text-xs text-sheet-lo/80 md:inline" aria-hidden="true">
              {shortcut}
            </kbd>
          )}
        </div>
        <div className="toast-timer h-1 bg-sheet-lo/70" onAnimationEnd={onDone} aria-hidden="true" />
      </div>
    </div>
  );
}
