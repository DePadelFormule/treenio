"use client";

import { useState, useTransition } from "react";
import { setWedstrijdFase } from "@/app/staf/wedstrijden/actions";

// Tap-chips om de fase van een wedstrijd te kiezen: de bekende fases plus een
// knop om een nieuwe fase te starten.
export function WedstrijdFaseKiezer({ id, begin, faseOpties }: { id: string; begin: number | null; faseOpties: number[] }) {
  const [fase, setFase] = useState(begin);
  const [, start] = useTransition();
  const volgende = (faseOpties.at(-1) ?? 0) + 1;
  const opties = faseOpties.includes(volgende) ? faseOpties : [...faseOpties, volgende];

  function kies(waarde: number) {
    setFase(waarde);
    start(() => { void setWedstrijdFase(id, waarde); });
  }

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-neutral-400">Fase</span>
      {opties.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => kies(f)}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
            fase === f ? "bg-sparta text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          {f}
        </button>
      ))}
    </span>
  );
}
