import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Treenio",
  description:
    "Speler­ontwikkel- en coachplatform voor één team. Privé, positief-som, geen pikorde.",
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
