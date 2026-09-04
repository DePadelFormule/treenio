"use client";

import { useState, useTransition } from "react";
import { toggleMateriaaldienstGedaan, wijzigMateriaaldienstSpeler } from "@/app/staf/materiaaldienst/actions";

export interface MateriaaldienstRij {
  id: string;
  label: string; // "di 1 sep"
  soort: string; // "Training" of "Wedstrijd · tegenstander"
  vandaag: boolean;
  verleden: boolean;
  speler1Id: string;
  speler2Id: string;
  speler1Halen: boolean;
  speler1Opruimen: boolean;
  speler2Halen: boolean;
  speler2Opruimen: boolean;
}

export interface SpelerOptie {
  id: string;
  naam: string;
}

function SpelerVeld({
  sessieId,
  welke,
  spelerId,
  halen,
  opruimen,
  opties,
}: {
  sessieId: string;
  welke: 1 | 2;
  spelerId: string;
  halen: boolean;
  opruimen: boolean;
  opties: SpelerOptie[];
}) {
  const [id, setId] = useState(spelerId);
  const [halenWaarde, setHalenWaarde] = useState(halen);
  const [opruimenWaarde, setOpruimenWaarde] = useState(opruimen);
  const [, start] = useTransition();

  function wisselSpeler(nieuweId: string) {
    const oudeId = id;
    setId(nieuweId);
    start(async () => {
      const res = await wijzigMateriaaldienstSpeler(sessieId, welke, nieuweId);
      if (!res.ok) setId(oudeId);
    });
  }

  function wisselTaak(taak: "halen" | "opruimen") {
    const nieuw = taak === "halen" ? !halenWaarde : !opruimenWaarde;
    if (taak === "halen") setHalenWaarde(nieuw);
    else setOpruimenWaarde(nieuw);
    start(async () => {
      const res = await toggleMateriaaldienstGedaan(sessieId, welke, taak, nieuw);
      if (!res.ok) {
        if (taak === "halen") setHalenWaarde(!nieuw);
        else setOpruimenWaarde(!nieuw);
      }
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2 py-1.5">
      <select
        value={id}
        onChange={(e) => wisselSpeler(e.target.value)}
        className="rounded-md border-none bg-transparent py-0.5 text-sm font-medium text-neutral-700 focus:outline-none focus:ring-1 focus:ring-sparta"
      >
        {opties.map((o) => (
          <option key={o.id} value={o.id}>
            {o.naam}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1 text-xs text-neutral-600">
        <input
          type="checkbox"
          checked={halenWaarde}
          onChange={() => wisselTaak("halen")}
          className="h-4 w-4 rounded border-neutral-300 text-sparta focus:ring-sparta"
        />
        Halen
      </label>
      <label className="flex items-center gap-1 text-xs text-neutral-600">
        <input
          type="checkbox"
          checked={opruimenWaarde}
          onChange={() => wisselTaak("opruimen")}
          className="h-4 w-4 rounded border-neutral-300 text-sparta focus:ring-sparta"
        />
        Opruimen
      </label>
    </div>
  );
}

export function MateriaaldienstLijst({ rows, spelers }: { rows: MateriaaldienstRij[]; spelers: SpelerOptie[] }) {
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
            <SpelerVeld
              sessieId={r.id}
              welke={1}
              spelerId={r.speler1Id}
              halen={r.speler1Halen}
              opruimen={r.speler1Opruimen}
              opties={spelers}
            />
            <SpelerVeld
              sessieId={r.id}
              welke={2}
              spelerId={r.speler2Id}
              halen={r.speler2Halen}
              opruimen={r.speler2Opruimen}
              opties={spelers}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
