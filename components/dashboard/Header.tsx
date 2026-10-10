"use client";

import { useEffect, useId, useRef, useState } from "react";
import { APP_NAME } from "@/lib/config";
import { searchHouseholds, type Household } from "@/lib/pickups";
import { ChevronDownIcon, LogoMark, SearchIcon } from "./Icons";

// Header bar: product name, address switcher (combobox over households), resident.
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
    <header className="border-b border-stone bg-ground">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3 md:gap-6 md:px-8">
        <div className="flex min-w-0 items-center gap-3 md:gap-5">
          <Wordmark />
          <AddressSwitcher address={address} onSwitch={onSwitch} />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-stone-deep sm:inline">{name}</span>
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-[3px] border border-green font-display text-base font-semibold text-green"
          >
            {initials}
          </span>
        </div>
      </div>
    </header>
  );
}

// Brand lockup: the mark plus an uppercase, letterspaced wordmark (never set like a panel heading).
export function Wordmark() {
  return (
    <span className="flex shrink-0 items-center gap-2">
      <LogoMark size={30} />
      <span className="font-display text-[1.35rem] font-bold uppercase leading-none tracking-[0.14em] text-green">{APP_NAME}</span>
    </span>
  );
}

function AddressSwitcher({ address, onSwitch }: { address: string | null; onSwitch: (h: Household) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Household[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  // Default list = first houses alphabetically; typing 2+ characters searches.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    let stale = false; // ignore responses that arrive after a newer query
    const t = setTimeout(() => {
      setLoading(true);
      searchHouseholds(q.length >= 2 ? q : "")
        .then((r) => {
          if (stale) return;
          setResults(r);
          setActive(0);
        })
        .catch(() => !stale && setResults([]))
        .finally(() => !stale && setLoading(false));
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
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  }

  function choose(h: Household) {
    onSwitch(h);
    close();
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex min-h-11 max-w-full min-w-0 items-center gap-2 rounded-[3px] border border-stone bg-sheet-hi px-3 text-left hover:border-green-muted"
      >
        <span className="sr-only">Adresas: </span>
        <span className="truncate font-semibold">{address ?? "Kraunama…"}</span>
        <ChevronDownIcon width={18} height={18} className="shrink-0 text-green-muted" />
      </button>
      {open && (
        <div className="slip absolute left-0 top-full z-30 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[3px] border border-rule bg-sheet shadow-[0_16px_32px_-12px_rgb(29_33_30/0.35)]">
          <label className="flex items-center gap-2 border-b border-rule px-3">
            <SearchIcon width={18} height={18} className="shrink-0 text-green-muted" />
            <span className="sr-only">Ieškoti adreso</span>
            <input
              autoFocus
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((i) => Math.min(i + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter" && results[active]) {
                  e.preventDefault();
                  choose(results[active]);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  close();
                }
              }}
              placeholder="Gatvė ir namo numeris"
              className="min-h-12 w-full bg-transparent outline-none placeholder:text-stone-deep"
            />
          </label>
          <ul id={listId} role="listbox" aria-label="Adresai" className="max-h-72 overflow-y-auto py-1">
            {results.map((h, i) => (
              <li
                key={h.id}
                id={`${listId}-${h.id}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(h)}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 ${
                  i === active ? "bg-sheet-lo" : ""
                }`}
              >
                <span>{h.address}</span>
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-4 py-3 text-stone-deep">{loading ? "Ieškoma…" : "Adresas nerastas"}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
