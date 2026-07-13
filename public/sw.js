// Minimale service worker — enkel om Treenio installeerbaar te maken op Android
// (Chrome toont "App installeren" pas als er een service worker met een
// fetch-handler is). Bewust GEEN caching: elke request gaat gewoon naar het
// netwerk, zodat nieuwe versies altijd meteen zichtbaar zijn.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Geen respondWith(): de browser handelt het verzoek normaal af.
  // De aanwezigheid van deze handler is voldoende voor de installeerbaarheid.
});
