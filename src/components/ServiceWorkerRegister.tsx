"use client";

import { useEffect } from "react";

// Registreert de service worker in de browser. Nodig zodat Android Chrome
// "App installeren" aanbiedt (en Treenio als echte app opent).
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
