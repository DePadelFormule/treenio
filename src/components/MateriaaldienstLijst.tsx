"use client";

import { useState, useTransition } from "react";
import { toggleMateriaaldienstGedaan } from "@/app/staf/materiaaldienst/actions";

export interface MateriaaldienstRij {
  id: string;
  label: string; // "di 1 sep"
  soort: string; // "Training" of "Wedstrijd · tegenstander"
  vandaag: boolean;
  verleden: boolean;
  speler1Naam: string;
  speler2Naam: string;
  speler1Gedaan: boolean;
  speler2Gedaan: boolean;
}

function Vinkje({
  naam,
  gedaan,
  onWissel,
}: {
  naam: string;
  gedaan: boolean;
  onWissel: (waarde: boolean) => Promise<{ ok: boolean }>;
}) {
  const [waarde, setWaarde] = useState(gedaan);
  const [, start] = useTransition();

  function klik() {
    const nieuw = !waarde;
    setWaarde(nieuw);
    start(async () => {
      const res = await onWissel(nieuw);
      if (!res.ok) setWaarde(!nieuw);
    });
  }

  return (
    <button
      type="button"
      onClick={klik}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
        waarde
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-neutral-200 bg-white text-neutral-600 hover:border-sparta"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          waarde ? "border-green-500 bg-green-500 text-white" : "border-neutral-300"
        }`}
      >
        {waarde && "✓"}
      </span>
      {naam}
    </button>
  );
}

export function MateriaaldienstLijst({ rows }: { rows: MateriaaldienstRij[] }) {
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li
          key={r.id}
          className={`rounded-xl border p-3 ${
            r.vandaag ? "border-sparta bg-sparta/5" : "border-neutral-200 bg-white"
          } ${r.verleden && !r.vandaag ? "opacity-70" : ""}`}
        >
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="font-semibold text-neutral-800">
              {r.label}
              {r.vandaag && <span className="ml-2 rounded-full bg-sparta/10 px-2 py-0.5 text-xs font-semibold text-sparta">vandaag</span>}
            </span>
            <span className="text-xs text-neutral-500">{r.soort}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Vinkje
              naam={r.speler1Naam}
              gedaan={r.speler1Gedaan}
              onWissel={(w) => toggleMateriaaldienstGedaan(r.id, 1, w)}
            />
            <Vinkje
              naam={r.speler2Naam}
              gedaan={r.speler2Gedaan}
              onWissel={(w) => toggleMateriaaldienstGedaan(r.id, 2, w)}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
