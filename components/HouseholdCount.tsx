"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Connection check: shows how many households are in Supabase.
export default function HouseholdCount() {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("households")
      .select("*", { count: "exact", head: true })
      .then(({ count, error }) => {
        if (error) setError(error.message);
        else setCount(count ?? 0);
      });
  }, []);

  if (error) return <p className="text-clay">Klaida jungiantis prie duomenų bazės: {error}</p>;
  if (count === null) return <p className="opacity-60">Kraunama…</p>;
  return <p>Namų ūkių duomenų bazėje: {count}</p>;
}
