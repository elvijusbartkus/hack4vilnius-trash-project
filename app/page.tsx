"use client";

import { useEffect, useState } from "react";
import Dashboard, { REMINDER_SESSION_KEY } from "@/components/dashboard/Dashboard";
import Onboarding from "@/components/resident/Onboarding";
import { DEMO_USER_NAME } from "@/lib/config";
import { getDemoHousehold, resetHousehold } from "@/lib/pickups";

// No real auth. The demo household loads by default; a household picked in the
// header switcher or in onboarding is remembered in localStorage.
const HOUSEHOLD_KEY = "householdId";
const NAME_KEY = "userName";

type User = { householdId: number; name: string };

function readStored(): User | null {
  try {
    const id = Number(localStorage.getItem(HOUSEHOLD_KEY));
    return id ? { householdId: id, name: localStorage.getItem(NAME_KEY) || DEMO_USER_NAME } : null;
  } catch {
    return null;
  }
}

function store(user: User) {
  try {
    localStorage.setItem(HOUSEHOLD_KEY, String(user.householdId));
    localStorage.setItem(NAME_KEY, user.name);
  } catch {}
}

async function demoUser(): Promise<User> {
  const demo = await getDemoHousehold();
  if (!demo) throw new Error("Demo namų ūkis nerastas. Paleiskite npm run seed.");
  return { householdId: demo.id, name: DEMO_USER_NAME };
}

export default function ResidentPage() {
  const [user, setUser] = useState<User | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clean = () => window.history.replaceState(null, "", window.location.pathname);

    (async () => {
      // /?onboarding=1 shows the old onboarding screen.
      if (params.get("onboarding") === "1") {
        setOnboarding(true);
        return;
      }

      // /?reset=1 deletes pickups for the current and demo household, clears local state,
      // and loads the demo user (the reminder will show again).
      if (params.get("reset") === "1") {
        const current = readStored();
        const demo = await demoUser();
        const ids = new Set([current?.householdId, demo.householdId].filter((id): id is number => !!id));
        await Promise.all([...ids].map(resetHousehold));
        try {
          localStorage.removeItem(HOUSEHOLD_KEY);
          localStorage.removeItem(NAME_KEY);
          sessionStorage.removeItem(REMINDER_SESSION_KEY);
        } catch {}
        clean();
        setUser(demo);
        return;
      }

      setUser(readStored() ?? (await demoUser()));
    })().catch((e) => setError(e.message));
  }, []);

  if (onboarding) {
    return (
      <Onboarding
        onDone={(household, name) => {
          const u = { householdId: household.id, name };
          store(u);
          window.history.replaceState(null, "", window.location.pathname);
          setOnboarding(false);
          setUser(u);
        }}
      />
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-8">
        {error ? (
          <p role="alert" className="rounded-[3px] border border-clay bg-sheet-hi px-5 py-4 text-clay-deep">Klaida: {error}</p>
        ) : (
          <p className="text-clay-deep">Kraunama…</p>
        )}
      </main>
    );
  }

  return (
    <Dashboard
      key={user.householdId}
      householdId={user.householdId}
      name={user.name}
      onSwitch={(h) => {
        // the demo persona's name only belongs to the demo house
        const u = { householdId: h.id, name: h.is_demo_user ? DEMO_USER_NAME : "Gyventojas" };
        store(u);
        setUser(u);
      }}
    />
  );
}
