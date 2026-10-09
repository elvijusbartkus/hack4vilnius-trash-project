"use client";

import { useEffect } from "react";

export type ToastData = { id: number; message: string; undo?: () => void };

export const TOAST_MS = 6000;

// Bottom toast with an "Atšaukti" undo button; disappears after 6 seconds.
export default function Toast({ toast, onDone }: { toast: ToastData; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, TOAST_MS);
    return () => clearTimeout(t);
  }, [toast.id, onDone]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-4 rounded-2xl bg-ink px-5 py-4 text-white shadow-xl"
      >
        <span className="font-semibold">{toast.message}</span>
        {toast.undo && (
          <button
            onClick={() => {
              toast.undo!();
              onDone();
            }}
            className="shrink-0 font-semibold text-sand underline-offset-2 hover:underline"
          >
            Atšaukti
          </button>
        )}
      </div>
    </div>
  );
}
