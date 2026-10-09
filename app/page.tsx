"use client";

import { useEffect, useState } from "react";
import Home from "@/components/resident/Home";
import Onboarding from "@/components/resident/Onboarding";
import { PhoneFrame, Screen } from "@/components/resident/ui";
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
    // Demo helper: /?reset=1 deletes pickups for the current and the demo household,
    // clears localStorage and lands on onboarding with the demo user preselected.
    if (new URLSearchParams(window.location.search).get("reset") === "1") {
      const current = readUser();
      (async () => {
        const demoId = (await getDemoHousehold())?.id;
        const ids = new Set([current?.householdId, demoId].filter((id): id is number => !!id));
        await Promise.all([...ids].map(resetHousehold));
        try {
          localStorage.removeItem(HOUSEHOLD_KEY);
          localStorage.removeItem(NAME_KEY);
        } catch {}
        window.history.replaceState(null, "", window.location.pathname);
        setUser(null);
      })().catch(() => setUser(null));
      return;
    }
    // localStorage only exists after mount, so this has to happen in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(readUser());
  }, []);

  let content;
  if (user === undefined) {
    content = (
      <Screen>
        <p className="pt-6 text-ink/40">Kraunama…</p>
      </Screen>
    );
  } else if (!user) {
    content = (
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
  } else {
    content = <Home householdId={user.householdId} name={user.name} />;
  }

  return <PhoneFrame>{content}</PhoneFrame>;
}
