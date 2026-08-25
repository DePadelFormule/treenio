"use client";

import { useState, useTransition } from "react";
import { setWedstrijdType } from "@/app/staf/wedstrijden/actions";

const OPTIES = [
  { key: "competitie", label: "Competitie" },
  { key: "beker", label: "Beker" },
  { key: "vriendschappelijk", label: "Vriendschappelijk" },
] as const;

// Tap-chips om het wedstrijdtype te kiezen. Vriendschappelijk telt niet mee in
// de seizoensstatistieken; dat maken we visueel duidelijk met een amber chip.
export function WedstrijdTypeKiezer({ id, begin }: { id: string; begin: string }) {
  const [type, setType] = useState(begin);
  const [, start] = useTransition();

  function kies(waarde: string) {
    setType(waarde);
    start(() => { void setWedstrijdType(id, waarde); });
  }

  return (
    <span className="flex flex-wrap gap-1.5">
      {OPTIES.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => kies(o.key)}
          title={o.key === "vriendschappelijk" ? "Telt niet mee in de statistieken" : undefined}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
            type === o.key
              ? o.key === "vriendschappelijk"
                ? "bg-amber-500 text-white"
                : "bg-sparta text-white"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </span>
  );
}
