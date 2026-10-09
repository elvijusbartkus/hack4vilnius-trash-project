"use client";

import { useEffect, useRef, useState } from "react";
import { APP_NAME } from "@/lib/config";
import { searchHouseholds, type Household } from "@/lib/pickups";

// Header: product name, address switcher (search over households), user with avatar.
export default function Header({
  address,
  name,
  onSwitch,
}: {
  address: string | null;
  name: string;
  onSwitch: (h: Household) => void;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex items-center justify-between gap-3 md:gap-6">
      <div className="flex min-w-0 items-center gap-3 md:gap-4">
        <span className="shrink-0 text-lg font-bold text-green">{APP_NAME}</span>
        <AddressSwitcher address={address} onSwitch={onSwitch} />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden font-semibold sm:inline">{name}</span>
        <span
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-full bg-green text-sm font-bold text-white"
        >
          {initials}
        </span>
      </div>
    </header>
  );
}

function AddressSwitcher({ address, onSwitch }: { address: string | null; onSwitch: (h: Household) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Household[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  // Default list = first houses alphabetically; typing 2+ characters searches.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    let stale = false; // ignore responses that arrive after a newer query
    const t = setTimeout(() => {
      searchHouseholds(q.length >= 2 ? q : "")
        .then((r) => !stale && setResults(r))
        .catch(() => !stale && setResults([]));
    }, 150);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex max-w-full min-w-0 items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-sm font-semibold hover:border-ink/25"
      >
        <span className="truncate">{address ?? "Kraunama…"}</span>
        <span className="text-ink/40">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-xl">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ieškoti adreso…"
            className="w-full border-b border-ink/10 px-4 py-3 outline-none"
          />
          <ul className="max-h-72 overflow-y-auto">
            {results.map((h) => (
              <li key={h.id}>
                <button
                  onClick={() => {
                    onSwitch(h);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-sand"
                >
                  {h.address}
                  {h.is_demo_user && <span className="ml-2 text-xs font-semibold text-green">demo</span>}
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="px-4 py-3 text-ink/50">Nerasta</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
