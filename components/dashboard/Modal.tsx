"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { CloseIcon } from "./Icons";

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Shared popup: dimmed backdrop, centered panel on desktop, bottom sheet on phones.
// Closes on Esc, backdrop click and the X. Focus is trapped inside and restored on close.
// The caller makes the page behind inert.
export default function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Latest onClose without re-running the setup effect (which would steal focus on every parent render).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current!;
    (panel.querySelector<HTMLElement>("[data-autofocus]") ?? panel.querySelector<HTMLElement>(FOCUSABLE))?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  return (
    <div
      className="backdrop-in fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-[2px] md:items-center md:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onCloseRef.current()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="slip flex max-h-[calc(100dvh-1rem)] w-full flex-col rounded-t-[6px] bg-sheet pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_-16px_rgb(29_33_30/0.45)] md:max-h-[calc(100dvh-3rem)] md:max-w-[480px] md:rounded-[4px] md:pb-0 md:shadow-[0_24px_48px_-16px_rgb(29_33_30/0.5)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-rule px-6 pb-4 pt-5">
          <h2 id={titleId} className="font-display text-2xl font-semibold leading-tight text-ink">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Uždaryti"
            className="-mr-2.5 -mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] text-green-muted hover:bg-sheet-lo hover:text-ink"
          >
            <CloseIcon />
          </button>
        </div>
        {/* body scrolls on short screens so the primary button stays reachable */}
        <div className="min-h-0 overflow-y-auto px-6 pb-6 pt-4">
          {description && (
            <div id={descId} className="leading-snug text-stone-deep">
              {description}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
