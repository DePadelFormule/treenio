import type { MetadataRoute } from "next";

// Web-app-manifest: maakt Treenio installeerbaar op Android (Chrome → "App
// installeren") en zorgt voor schermvullend openen met de Sparta-huisstijl.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Treenio — Nivo Sparta JO17-2",
    short_name: "Treenio",
    description: "Coachplatform voor Nivo Sparta JO17-2.",
    start_url: "/staf",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#C8102E",
    // PNG's van 192 én 512 px zijn nodig zodat Android Chrome "App installeren"
    // aanbiedt (SVG alleen is niet genoeg voor de installatie-criteria).
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
