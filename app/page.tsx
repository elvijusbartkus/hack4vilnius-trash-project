"use client";

import Dashboard from "@/components/dashboard/Dashboard";
import ResidentShell from "@/components/resident/ResidentShell";

export default function ResidentPage() {
  return (
    <ResidentShell>
      {(user, onSwitch) => (
        <Dashboard key={user.householdId} householdId={user.householdId} name={user.name} onSwitch={onSwitch} />
      )}
    </ResidentShell>
  );
}
