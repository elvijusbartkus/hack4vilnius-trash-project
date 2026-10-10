// TRAGE service worker: makes the app installable and shows the demo reminder notification.
// URLs are resolved against the worker's scope, so this works locally and under the GitHub Pages basePath.
const SCOPE = self.registration.scope;
// The driver app (built separately into /driver/) is left completely alone.
const isDriver = (url) => url.startsWith(SCOPE + "driver");

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Network passthrough (no offline cache in the prototype).
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || isDriver(event.request.url)) return;
  event.respondWith(fetch(event.request));
});

const REMINDER = {
  title: "TRAGE",
  body: "Rytoj išvežimas. Išstumsite konteinerį?",
};

function showReminder(search) {
  return self.registration.showNotification(REMINDER.title, {
    body: REMINDER.body,
    icon: SCOPE + "icons/icon-192.png",
    badge: SCOPE + "icons/badge-96.png",
    tag: "trage-reminder",
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: "yes", title: "Taip, išstumsiu" },
      { action: "no", title: "Ne, nereikia" },
    ],
    data: { search: search || "" },
  });
}

// The page asks the worker to show the reminder, optionally after a delay (so the phone can be locked).
self.addEventListener("message", (event) => {
  const msg = event.data || {};
  if (msg.type !== "show-reminder") return;
  const delay = Math.max(0, Math.min(msg.delay || 0, 60000));
  event.waitUntil(new Promise((resolve) => setTimeout(resolve, delay)).then(() => showReminder(msg.search)));
});

// Body click opens the reminder popup; the action buttons apply the answer directly.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const answer = event.action === "yes" || event.action === "no" ? event.action : null;
  const search = new URLSearchParams((event.notification.data && event.notification.data.search) || "");
  search.delete("answer");
  search.delete("remind");
  if (answer) search.set("answer", answer);
  else search.set("remind", "1");

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const client = list.find((c) => c.url.startsWith(SCOPE) && !isDriver(c.url));
      if (client) {
        client.postMessage({ type: "reminder", answer });
        return client.focus();
      }
      return self.clients.openWindow(SCOPE + "?" + search.toString());
    }),
  );
});
