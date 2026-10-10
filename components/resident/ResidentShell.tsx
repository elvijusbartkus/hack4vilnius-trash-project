"use client";

import { useEffect, useState, type ReactNode } from "react";
import { INVOICE_PAID_PREFIX } from "@/components/dashboard/Invoices";
import type { Household } from "@/lib/pickups";
import Onboarding from "@/components/resident/Onboarding";
import { DEMO_DAY, DEMO_SEEDED_SKIP_VASA_IDS, DEMO_USER_NAME } from "@/lib/config";
import { getDemoHousehold, resetAllPickups, seedDemoActivity, seedNeighbourSkips } from "@/lib/pickups";
import { registerServiceWorker } from "@/lib/pwa";
import { resetAllReports } from "@/lib/reports";

// Keys older versions kept in localStorage; cleared by the reset.
const LEGACY_KEYS = ["householdId", "userName"];

export type ResidentUser = { householdId: number; name: string };
type User = ResidentUser;

// Every full page load is a fresh demo: one reset per load, shared by all screens that mount
// (and by React dev mode's second effect run). Moving between tabs inside the app keeps state.
let resetPromise: Promise<User> | null = null;
// A house picked in the address switcher, kept across in-app navigation until the next refresh.
let current: User | null = null;
function remember(u: User) {
  current = u;
}

async function demoUser(): Promise<User> {
  const demo = await getDemoHousehold();
  if (!demo) throw new Error("Demo namų ūkis nerastas. Paleiskite npm run seed.");
  return { householdId: demo.id, name: DEMO_USER_NAME };
}

// Back to the start: no answers or bookings, the demo history and neighbour skips seeded again,
// invoices unpaid, no reports. So / opens on tomorrow's Taip/Ne question.
async function resetDemo(): Promise<User> {
  const demo = await demoUser();
  await resetAllPickups();
  await Promise.all([
    seedDemoActivity(demo.householdId, DEMO_DAY),
    seedNeighbourSkips(DEMO_SEEDED_SKIP_VASA_IDS, DEMO_DAY),
    resetAllReports(),
  ]);
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(INVOICE_PAID_PREFIX) || LEGACY_KEYS.includes(k))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
  return demo;
}

// Shared by every resident screen (/, /saskaitos, /pranesti): resets the demo on a full load,
// then renders the screen for the demo household (or the house picked in the switcher).
export default function ResidentShell({
  children,
}: {
  children: (user: ResidentUser, onSwitch: (h: Household) => void) => ReactNode;
}) {
  const [user, setUser] = useState<User | null>(current);
  const [onboarding, setOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    registerServiceWorker();

    (async () => {
      // /?onboarding=1 shows the old onboarding screen.
      if (params.get("onboarding") === "1") {
        setOnboarding(true);
        return;
      }
      if (!resetPromise) resetPromise = resetDemo();
      const demo = await resetPromise;
      // ?reset=1 is what every load does now; drop it but keep ?date (demo date override)
      if (params.has("reset")) {
        params.delete("reset");
        const rest = params.toString();
        window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
      }
      setUser(current ?? demo);
    })().catch((e) => setError(e.message));
  }, []);

  if (onboarding) {
    return (
      <Onboarding
        onDone={(household, name) => {
          const u = { householdId: household.id, name };
          remember(u);
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
    remember(u);
    setUser(u);
  });
}
