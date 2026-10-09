import { createClient } from "@supabase/supabase-js";

// Browser client (anon key). RLS is off for the hackathon, so this can read and write.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Don't throw: the build must pass without env vars. Queries will fail and show an error instead.
  console.warn(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local.",
  );
}

export const supabase = createClient(url || "http://localhost:54321", anonKey || "missing-anon-key");
