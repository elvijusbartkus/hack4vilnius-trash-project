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
        <h1 className="text-3xl font-bold">Sveiki!</h1>
        <p className="mt-2 text-ink/60">Atliekų išvežimas tada, kai jums reikia.</p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink/60">Vardas</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-2xl border-2 border-ink/10 bg-white px-4 py-4 text-lg outline-none focus:border-green"
        />
      </label>

      <div className="relative flex flex-col gap-2">
        <label htmlFor="address" className="text-sm font-semibold text-ink/60">
          Adresas
        </label>
        <input
          id="address"
          value={query}
          autoComplete="off"
          placeholder="Pvz. Alfonso Lipniūno g. 13"
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          className="rounded-2xl border-2 border-ink/10 bg-white px-4 py-4 text-lg outline-none focus:border-green"
        />
        {visibleResults.length > 0 && (
          <ul className="absolute top-full z-10 mt-2 w-full overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-lg">
            {visibleResults.map((h) => (
              <li key={h.id}>
                <button
                  className="w-full px-4 py-3 text-left text-lg active:bg-sand"
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
