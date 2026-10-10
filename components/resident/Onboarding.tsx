"use client";

import { useEffect, useState } from "react";
import { DEMO_USER_NAME } from "@/lib/config";
import { getDemoHousehold, searchHouseholds, type Household } from "@/lib/pickups";
import { Button, ErrorText, Screen } from "./ui";

export default function Onboarding({ onDone }: { onDone: (household: Household, name: string) => void }) {
  const [name, setName] = useState(DEMO_USER_NAME);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Household | null>(null);
  const [results, setResults] = useState<Household[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Pre-select the demo household so the demo is one tap.
  useEffect(() => {
    getDemoHousehold()
      .then((h) => {
        if (h) {
          setSelected(h);
          setQuery(h.address);
        }
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (selected || query.trim().length < 2) return;
    const t = setTimeout(() => {
      searchHouseholds(query.trim())
        .then(setResults)
        .catch((e) => setError(e.message));
    }, 150);
    return () => clearTimeout(t);
  }, [query, selected]);

  const visibleResults = selected || query.trim().length < 2 ? [] : results;

  return (
    <Screen>
      <div className="pt-6">
        <h1 className="font-display text-4xl font-semibold">Sveiki!</h1>
        <p className="mt-2 text-stone-deep">Atliekų išvežimas tada, kai jums reikia.</p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-semibold text-green-muted">Vardas</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-[3px] border border-rule bg-sheet px-4 py-4 text-lg outline-none focus:border-green"
        />
      </label>

      <div className="relative flex flex-col gap-2">
        <label htmlFor="address" className="font-semibold text-green-muted">
          Adresas
        </label>
        <input
          id="address"
          value={query}
          autoComplete="off"
          placeholder="Pvz. Darkiemio g. 13"
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          className="rounded-[3px] border border-rule bg-sheet px-4 py-4 text-lg outline-none focus:border-green"
        />
        {visibleResults.length > 0 && (
          <ul className="absolute top-full z-10 mt-2 w-full overflow-hidden rounded-[3px] border border-rule bg-sheet shadow-[0_16px_32px_-12px_rgb(29_33_30/0.35)]">
            {visibleResults.map((h) => (
              <li key={h.id}>
                <button
                  className="min-h-11 w-full px-4 py-3 text-left text-lg hover:bg-sheet-lo"
                  onClick={() => {
                    setSelected(h);
                    setQuery(h.address);
                  }}
                >
                  {h.address}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <ErrorText>Nepavyko įkelti adresų: {error}</ErrorText>}

      <div className="mt-auto">
        <Button disabled={!selected || !name.trim()} onClick={() => selected && onDone(selected, name.trim())}>
          Tęsti
        </Button>
      </div>
    </Screen>
  );
}
