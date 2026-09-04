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
  speler1Naam: string;
  speler2Id: string;
  speler2Naam: string;
  speler1Gedaan: boolean;
  speler2Gedaan: boolean;
}

export interface SpelerOptie {
  id: string;
  naam: string;
}

function SpelerVeld({
  sessieId,
  welke,
  spelerId,
  spelerNaam,
  gedaan,
  opties,
}: {
  sessieId: string;
  welke: 1 | 2;
  spelerId: string;
  spelerNaam: string;
  gedaan: boolean;
  opties: SpelerOptie[];
}) {
  const [id, setId] = useState(spelerId);
  const [naam, setNaam] = useState(spelerNaam);
  const [waarde, setWaarde] = useState(gedaan);
  const [bewerken, setBewerken] = useState(false);
  const [, start] = useTransition();

  function vinkAan() {
    const nieuw = !waarde;
    setWaarde(nieuw);
    start(async () => {
      const res = await toggleMateriaaldienstGedaan(sessieId, welke, nieuw);
      if (!res.ok) setWaarde(!nieuw);
    });
  }

  function wisselSpeler(nieuweId: string) {
    const oudeId = id;
    const oudeNaam = naam;
    setId(nieuweId);
    setNaam(opties.find((o) => o.id === nieuweId)?.naam ?? "?");
    setBewerken(false);
    start(async () => {
      const res = await wijzigMateriaaldienstSpeler(sessieId, welke, nieuweId);
      if (!res.ok) {
        setId(oudeId);
        setNaam(oudeNaam);
      }
    });
  }

  if (bewerken) {
    return (
      <select
        autoFocus
        value={id}
        onChange={(e) => wisselSpeler(e.target.value)}
        onBlur={() => setBewerken(false)}
        className="rounded-lg border border-sparta px-2 py-2 text-sm"
      >
        {opties.map((o) => (
          <option key={o.id} value={o.id}>
            {o.naam}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span
      className={`flex items-center gap-1 rounded-lg border px-1 py-1 text-sm font-medium transition ${
        waarde ? "border-green-200 bg-green-50 text-green-700" : "border-neutral-200 bg-white text-neutral-600"
      }`}
    >
      <button type="button" onClick={vinkAan} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-black/5">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
            waarde ? "border-green-500 bg-green-500 text-white" : "border-neutral-300"
          }`}
        >
          {waarde && "✓"}
        </span>
        {naam}
      </button>
      <button
        type="button"
        onClick={() => setBewerken(true)}
        title="Andere speler laten overnemen"
        className="rounded-md px-1.5 py-1 text-xs text-neutral-400 hover:bg-black/5 hover:text-sparta"
      >
        ✎
      </button>
    </span>
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
            <SpelerVeld sessieId={r.id} welke={1} spelerId={r.speler1Id} spelerNaam={r.speler1Naam} gedaan={r.speler1Gedaan} opties={spelers} />
            <SpelerVeld sessieId={r.id} welke={2} spelerId={r.speler2Id} spelerNaam={r.speler2Naam} gedaan={r.speler2Gedaan} opties={spelers} />
          </div>
        </li>
      ))}
    </ul>
  );
}
