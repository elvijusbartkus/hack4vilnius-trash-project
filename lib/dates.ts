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

export function todayISO(): string {
  return toISODate(new Date());
}

// "spalio 16 d., penktadienis"
export function formatLong(s: string): string {
  return new Intl.DateTimeFormat("lt-LT", { month: "long", day: "numeric", weekday: "long" }).format(
    parseISODate(s),
  );
}

// "spalio 16 d."
export function formatDay(s: string): string {
  return new Intl.DateTimeFormat("lt-LT", { month: "long", day: "numeric" }).format(parseISODate(s));
}

// "Pn 16"
export function formatChip(s: string): string {
  const d = parseISODate(s);
  const wd = new Intl.DateTimeFormat("lt-LT", { weekday: "short" }).format(d);
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${d.getDate()}`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
