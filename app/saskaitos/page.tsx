"use client";

import { BillingScreen } from "@/components/dashboard/Invoices";
import ResidentShell from "@/components/resident/ResidentShell";

// /saskaitos: the resident's monthly bills (mock-up payment). /saskaitos?pay=1 opens the payment.
export default function BillingPage() {
  return (
    <ResidentShell>
      {(user, onSwitch) => (
        <BillingScreen key={user.householdId} householdId={user.householdId} name={user.name} onSwitch={onSwitch} />
      )}
    </ResidentShell>
  );
}
