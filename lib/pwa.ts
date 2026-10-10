// PWA helpers: service worker registration and the demo reminder notification.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` }).catch((e) => console.warn("SW registration failed", e));
}

// Resolves to the active worker, or null if none is ready within `ms` (e.g. unsupported browser).
async function activeWorker(ms = 3000): Promise<ServiceWorker | null> {
  if (!("serviceWorker" in navigator)) return null;
  const ready = navigator.serviceWorker.ready.then((r) => r.active);
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));
  return (await Promise.race([ready, timeout])) ?? null;
}

export type ReminderChannel = "system" | "fallback";

// Shows the real system notification when allowed (via the service worker, so the delay survives a locked
// screen); otherwise tells the caller to show the in-page banner instead.
export async function sendReminder(delayMs: number): Promise<ReminderChannel> {
  if (typeof window === "undefined" || !("Notification" in window)) return "fallback";
  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") return "fallback";
  const worker = await activeWorker();
  if (!worker) return "fallback";
  worker.postMessage({ type: "show-reminder", delay: delayMs, search: window.location.search });
  return "system";
}
