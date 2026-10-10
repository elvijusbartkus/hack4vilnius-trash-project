import { supabase } from "@/lib/supabase";

// Problem reports from residents: a photo and a place, sent for review so a unit can be dispatched.
export const REPORT_CATEGORIES = {
  overflow: "Perpildytas konteineris",
  dumped: "Atliekos šalia konteinerio",
  damaged: "Sugadintas konteineris",
  illegal: "Nelegalus sąvartynas",
  other: "Kita",
} as const;

export type ReportCategory = keyof typeof REPORT_CATEGORIES;

export const REPORT_STATUS = {
  review: "Peržiūrima",
  dispatched: "Išsiųsta komanda",
  resolved: "Sutvarkyta",
} as const;

export type Report = {
  id: number | string;
  household_id: number | null;
  category: ReportCategory;
  place: string;
  lat: number | null;
  lon: number | null;
  comment: string | null;
  photo: string | null;
  status: keyof typeof REPORT_STATUS;
  created_at: string;
  local?: boolean; // saved on this device only (reports table not created yet)
};

export type NewReport = Omit<Report, "id" | "status" | "created_at" | "local">;

// Until migration 005 has run there is no reports table; keep reports on the device so the demo works.
export const LOCAL_REPORTS_KEY = "localReports";

function readLocal(householdId: number): Report[] {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_REPORTS_KEY) || "[]") as Report[];
    return all.filter((r) => r.household_id === householdId);
  } catch {
    return [];
  }
}

function writeLocal(report: Report) {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_REPORTS_KEY) || "[]") as Report[];
    localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify([report, ...all]));
  } catch {}
}

const missingTable = (message: string) => /reports/.test(message) && /(not find|does not exist|schema cache)/i.test(message);

export async function createReport(report: NewReport): Promise<Report> {
  const res = await supabase.from("reports").insert(report).select("*").single();
  if (!res.error) return res.data as Report;
  if (!missingTable(res.error.message)) throw new Error(res.error.message);
  const local: Report = { ...report, id: `local-${Date.now()}`, status: "review", created_at: new Date().toISOString(), local: true };
  writeLocal(local);
  return local;
}

export async function listReports(householdId: number): Promise<Report[]> {
  const res = await supabase
    .from("reports")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });
  const remote = res.error ? [] : ((res.data ?? []) as Report[]);
  if (res.error && !missingTable(res.error.message)) throw new Error(res.error.message);
  return [...readLocal(householdId), ...remote].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// Full demo reset: all reports, remote and on this device. A missing table is fine.
export async function resetAllReports() {
  await supabase.from("reports").delete().gte("id", 0);
  try {
    localStorage.removeItem(LOCAL_REPORTS_KEY);
  } catch {}
}

export async function resetReports(householdId: number) {
  await supabase.from("reports").delete().eq("household_id", householdId); // ignore "no table"
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_REPORTS_KEY) || "[]") as Report[];
    localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(all.filter((r) => r.household_id !== householdId)));
  } catch {}
}

// Phone photos are several MB; shrink to <= 1024px JPEG before storing.
export function compressPhoto(file: File, max = 1024, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Nepavyko nuskaityti nuotraukos."));
    };
    img.src = url;
  });
}
