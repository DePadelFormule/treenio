import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Treenio",
  title: "Treenio",
  description:
    "Speler­ontwikkel- en coachplatform voor één team. Privé, positief-som, geen pikorde.",
  manifest: "/manifest.webmanifest",
  // Zorgt op iPhone/iPad voor schermvullend openen met een eigen naam als je
  // Treenio op het beginscherm zet.
  appleWebApp: {
    capable: true,
    title: "Treenio",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#C8102E",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
