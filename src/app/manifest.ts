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
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
