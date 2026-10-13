// Offline support: always try the network first so updates show up straight away,
// and fall back to the last saved copy when there's no signal.
const CACHE = "promed-service-v1";
const FILES = [
  "./",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const cached = () => caches.match(e.request, { ignoreSearch: true })
    .then(r => r || (e.request.mode === "navigate" ? caches.match("./") : undefined))
    .then(r => r || Response.error());
  // Weak signal: don't wait more than 4 s before using the saved copy
  const timeout = new Promise((_, no) => setTimeout(no, 4000));
  e.respondWith(
    Promise.race([fetch(e.request), timeout])
      .then(r => {
        if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return r;
      })
      .catch(cached)
  );
});
