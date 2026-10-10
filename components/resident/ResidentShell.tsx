"use client";

import { useEffect, useState, type ReactNode } from "react";
import { INVOICE_PAID_PREFIX } from "@/components/dashboard/Invoices";
import type { Household } from "@/lib/pickups";
import Onboarding from "@/components/resident/Onboarding";
import { DEMO_DAY, DEMO_SEEDED_SKIP_VASA_IDS, DEMO_USER_NAME } from "@/lib/config";
import { getDemoHousehold, getHousehold, resetHousehold, seedDemoActivity, seedNeighbourSkips } from "@/lib/pickups";
import { registerServiceWorker } from "@/lib/pwa";
import { resetReports } from "@/lib/reports";

// No real auth. The demo household loads by default; a household picked in the
// header switcher or in onboarding is remembered in localStorage.
const HOUSEHOLD_KEY = "householdId";
const NAME_KEY = "userName";
const OLD_DEMO_NAMES = ["Baldas Venkunskas"]; // renamed persona; ignore it if a browser still has it saved

export type ResidentUser = { householdId: number; name: string };
type User = ResidentUser;

let resetStarted = false;

function readStored(): User | null {
  try {
    const id = Number(localStorage.getItem(HOUSEHOLD_KEY));
    const stored = localStorage.getItem(NAME_KEY);
    const name = stored && !OLD_DEMO_NAMES.includes(stored) ? stored : DEMO_USER_NAME;
    return id ? { householdId: id, name } : null;
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

// Shared by every resident screen (/, /saskaitos, /pranesti): resolves who is looking (demo household,
// a stored choice, ?onboarding=1, ?reset=1) and renders the screen for them.
export default function ResidentShell({
  children,
}: {
  children: (user: ResidentUser, onSwitch: (h: Household) => void) => ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // drop ?reset / ?onboarding but keep ?date (demo date override)
    const clean = () => {
      const q = new URLSearchParams(window.location.search);
      q.delete("reset");
      q.delete("onboarding");
      const rest = q.toString();
      window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
    };

    registerServiceWorker();

    (async () => {
      // /?onboarding=1 shows the old onboarding screen.
      if (params.get("onboarding") === "1") {
        setOnboarding(true);
        return;
      }

      // /?reset=1 deletes pickups for the current and demo household, clears local state,
      // and loads the demo user (tomorrow's question shows again).
      if (params.get("reset") === "1") {
        if (resetStarted) return; // the effect can run twice (React dev mode); reset and seed only once
        resetStarted = true;
        const current = readStored();
        const demo = await demoUser();
        const ids = new Set([current?.householdId, demo.householdId].filter((id): id is number => !!id));
        await Promise.all([...ids].flatMap((id) => [resetHousehold(id), resetReports(id)]));
        await seedDemoActivity(demo.householdId, DEMO_DAY);
        await seedNeighbourSkips(DEMO_SEEDED_SKIP_VASA_IDS, DEMO_DAY);
        try {
          localStorage.removeItem(HOUSEHOLD_KEY);
          localStorage.removeItem(NAME_KEY);
          // demo invoices back to unpaid
          Object.keys(localStorage)
            .filter((k) => k.startsWith(INVOICE_PAID_PREFIX))
            .forEach((k) => localStorage.removeItem(k));
        } catch {}
        clean();
        setUser(demo);
        return;
      }

      // a stored house may no longer exist (re-seeded area): fall back to the demo house
      const stored = readStored();
      const exists = stored && (await getHousehold(stored.householdId).catch(() => null));
      setUser(exists ? stored : await demoUser());
    })().catch((e) => setError(e.message));
  }, []);

  if (onboarding) {
    return (
      <Onboarding
        onDone={(household, name) => {
          const u = { householdId: household.id, name };
          store(u);
          const q = new URLSearchParams(window.location.search);
          q.delete("onboarding");
          window.history.replaceState(null, "", window.location.pathname + (q.toString() ? `?${q}` : ""));
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
          <p role="alert" className="rounded-[3px] border border-stone bg-sheet-hi px-5 py-4 text-stone-deep">Klaida: {error}</p>
        ) : (
          <p className="text-stone-deep">Kraunama…</p>
        )}
      </main>
    );
  }

  return children(user, (h) => {
    // the demo persona's name only belongs to the demo house
    const u = { householdId: h.id, name: h.is_demo_user ? DEMO_USER_NAME : "Gyventojas" };
    store(u);
    setUser(u);
  });
}
