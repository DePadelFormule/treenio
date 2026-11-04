"use client";

import { useState } from "react";
import Link from "next/link";
import { PositieTaakVeld } from "@/components/PositieTaakVeld";

interface Situatie {
  key: string;
  naam: string;
}

interface Positie {
  key: string;
  label: string;
}

// Tabs wisselen puur via client-state (geen paginanavigatie), zodat nog
// niet opgeslagen tekst in een ander tabblad niet verdwijnt: alle tabbladen
// blijven gemonteerd, alleen het actieve is zichtbaar.
export function PositieTakenTabs({
  situaties,
  posities,
  takenPerSituatie,
}: {
  situaties: readonly Situatie[];
  posities: Positie[];
  takenPerSituatie: Record<string, Record<string, string>>;
}) {
  const [actief, setActief] = useState(situaties[0].key);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {situaties.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActief(s.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                actief === s.key ? "bg-sparta text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {s.naam}
            </button>
          ))}
        </div>
        <Link href={`/staf/positietaken/print?situatie=${actief}`} className="text-sm font-semibold text-sparta hover:underline">
          🖨 Printbare kaartjes →
        </Link>
      </div>

      {situaties.map((s) => (
        <div key={s.key} className={actief === s.key ? "grid gap-4 sm:grid-cols-2" : "hidden"}>
          {posities.map((p) => (
            <PositieTaakVeld
              key={p.key}
              positieCode={p.key}
              positieLabel={p.label}
              situatie={s.key}
              begin={takenPerSituatie[s.key]?.[p.key] ?? ""}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
