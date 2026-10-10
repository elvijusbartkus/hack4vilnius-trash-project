import { DEMO_TODAY } from "@/lib/config";

// Dates are stored as 'YYYY-MM-DD' strings and treated as local calendar days.

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, days: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

// The app's "today" is fixed for the demo (DEMO_TODAY in lib/config.ts).
// For the demo it can be overridden with ?date=YYYY-MM-DD in the URL.
export function todayISO(): string {
  if (typeof window !== "undefined") {
    const d = new URLSearchParams(window.location.search).get("date");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  }
  return DEMO_TODAY;
}

// "spalio 16 d., penktadienis"
export function formatLong(s: string): string {
  return new Intl.DateTimeFormat("lt-LT", { month: "long", day: "numeric", weekday: "long" })
    .format(parseISODate(s))
    .replace(/ d\.,/, "\u00a0d.,");
}

// "Penktadienis, spalio 16 d."
export function formatHero(s: string): string {
  return `${capitalize(formatWeekday(s))}, ${formatDay(s)}`;
}

// "penktadienis"
export function formatWeekday(s: string): string {
  return new Intl.DateTimeFormat("lt-LT", { weekday: "long" }).format(parseISODate(s));
}

// Genitive weekday for "Praleisti penktadienio išvežimą?" (all Lithuanian weekdays end in -is -> -io).
export function formatWeekdayGenitive(s: string): string {
  return formatWeekday(s).replace(/is$/, "io");
}

// "spalio 16 d." (non-breaking space keeps "16 d." together)
export function formatDay(s: string): string {
  return new Intl.DateTimeFormat("lt-LT", { month: "long", day: "numeric" }).format(parseISODate(s)).replace(/ d\.$/, "\u00a0d.");
}

// "Spalio 16 d."
export function formatDayCap(s: string): string {
  return capitalize(formatDay(s));
}

// "Pn"
export function formatWeekdayShort(s: string): string {
  return capitalize(new Intl.DateTimeFormat("lt-LT", { weekday: "short" }).format(parseISODate(s)));
}

// "Pn 16"
export function formatChip(s: string): string {
  const d = parseISODate(s);
  const wd = new Intl.DateTimeFormat("lt-LT", { weekday: "short" }).format(d);
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${d.getDate()}`;
}

// Lithuanian plural forms: 1 išvežimą, 2 išvežimus, 10 išvežimų.
const pluralRules = new Intl.PluralRules("lt-LT");
export function plural(n: number, forms: { one: string; few: string; many: string }): string {
  const rule = pluralRules.select(n);
  const form = rule === "one" ? forms.one : rule === "few" ? forms.few : forms.many;
  return `${n} ${form}`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Lithuanian money with no space before the unit: "26,50€".
const eurFormat = new Intl.NumberFormat("lt-LT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function formatEur(n: number): string {
  return `${eurFormat.format(n)}€`;
}
