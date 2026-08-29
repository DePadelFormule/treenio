"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

// Haalt de serverdata van deze pagina opnieuw op zonder volledige page-reload
// — handig op overzichten die vullen terwijl mensen nog aan het invullen zijn.
export function VerversKnop({ label = "🔄 Ververs" }: { label?: string }) {
  const router = useRouter();
  const [bezig, start] = useTransition();

  return (
    <button
      type="button"
      onClick={() => start(() => router.refresh())}
      disabled={bezig}
      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-600 hover:border-sparta hover:text-sparta disabled:opacity-50"
    >
      {bezig ? "Verversen…" : label}
    </button>
  );
}
