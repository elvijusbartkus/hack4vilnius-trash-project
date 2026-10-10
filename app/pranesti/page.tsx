"use client";

import { ReportScreen } from "@/components/dashboard/Report";
import ResidentShell from "@/components/resident/ResidentShell";

// /pranesti: report a problem (photo + place) for review, so a unit can be sent out.
export default function ReportPage() {
  return (
    <ResidentShell>
      {(user, onSwitch) => (
        <ReportScreen key={user.householdId} householdId={user.householdId} name={user.name} onSwitch={onSwitch} />
      )}
    </ResidentShell>
  );
}
