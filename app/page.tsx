"use client";

import { useEffect, useState } from "react";
import Home from "@/components/resident/Home";
import Onboarding from "@/components/resident/Onboarding";
import { Screen } from "@/components/resident/ui";
import { getDemoHousehold, resetHousehold } from "@/lib/pickups";

// No real auth: the chosen household lives in localStorage.
const HOUSEHOLD_KEY = "householdId";
const NAME_KEY = "userName";

type User = { householdId: number; name: string } | null;

function readUser(): User {
  try {
    const id = Number(localStorage.getItem(HOUSEHOLD_KEY));
    const name = localStorage.getItem(NAME_KEY);
    return id && name ? { householdId: id, name } : null;
  } catch {
    return null;
  }
}

export default function ResidentPage() {
  const [user, setUser] = useState<User | undefined>(undefined); // undefined = still loading

  useEffect(() => {
    // Demo helper: /?reset=1 deletes this household's pickups and clears localStorage.
    if (new URLSearchParams(window.location.search).get("reset") === "1") {
      const current = readUser();
      (async () => {
        const id = current?.householdId ?? (await getDemoHousehold())?.id;
        if (id) await resetHousehold(id);
        try {
          localStorage.removeItem(HOUSEHOLD_KEY);
          localStorage.removeItem(NAME_KEY);
        } catch {}
        window.history.replaceState(null, "", "/");
        setUser(null);
      })().catch(() => setUser(null));
      return;
    }
    // localStorage only exists after mount, so this has to happen in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(readUser());
  }, []);

  if (user === undefined) {
    return (
      <Screen>
        <p className="pt-6 text-ink/40">Kraunama…</p>
      </Screen>
    );
  }

  if (!user) {
    return (
      <Onboarding
        onDone={(household, name) => {
          try {
            localStorage.setItem(HOUSEHOLD_KEY, String(household.id));
            localStorage.setItem(NAME_KEY, name);
          } catch {}
          setUser({ householdId: household.id, name });
        }}
      />
    );
  }

  return <Home householdId={user.householdId} name={user.name} />;
}
