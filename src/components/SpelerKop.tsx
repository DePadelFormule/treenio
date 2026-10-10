"use client";

import { useState, useTransition } from "react";
import { updateSpelerGegevens } from "@/app/staf/speler/[id]/actions";

interface Props {
  spelerId: string;
  beginNaam: string;
  beginRugnummer: number | null;
  beginGeboortedatum: string | null;
}

export function SpelerKop({ spelerId, beginNaam, beginRugnummer, beginGeboortedatum }: Props) {
  const [naam, setNaam] = useState(beginNaam);
  const [rugnummer, setRugnummer] = useState(beginRugnummer);
  const [geboortedatum, setGeboortedatum] = useState(beginGeboortedatum);
  const [bewerken, setBewerken] = useState(false);
  const [veldNaam, setVeldNaam] = useState(naam);
  const [veldRugnummer, setVeldRugnummer] = useState(rugnummer != null ? String(rugnummer) : "");
  const [veldGeboortedatum, setVeldGeboortedatum] = useState(geboortedatum ?? "");
  const [fout, setFout] = useState<string | null>(null);
  const [, start] = useTransition();

  function beginBewerken() {
    setVeldNaam(naam);
    setVeldRugnummer(rugnummer != null ? String(rugnummer) : "");
    setVeldGeboortedatum(geboortedatum ?? "");
    setFout(null);
    setBewerken(true);
  }

  function opslaan() {
    setFout(null);
    const nieuweNaam = veldNaam.trim();
    const nieuwRugnummer = veldRugnummer.trim() === "" ? null : Number(veldRugnummer);
    const nieuweGeboortedatum = veldGeboortedatum || null;
    start(async () => {
      const res = await updateSpelerGegevens(spelerId, { naam: nieuweNaam, rugnummer: nieuwRugnummer, geboortedatum: nieuweGeboortedatum });
      if (res.ok) {
        setNaam(nieuweNaam);
        setRugnummer(nieuwRugnummer);
        setGeboortedatum(nieuweGeboortedatum);
        setBewerken(false);
      } else {
        setFout(res.fout ?? "Opslaan mislukt.");
      }
    });
  }

  if (bewerken) {
    return (
      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-sparta bg-sparta/5 p-4">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Naam</span>
          <input
            value={veldNaam}
            onChange={(e) => setVeldNaam(e.target.value)}
            className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Rugnummer</span>
          <input
            value={veldRugnummer}
            inputMode="numeric"
            onChange={(e) => setVeldRugnummer(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
            placeholder="–"
            className="w-20 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Geboortedatum</span>
          <input
            type="date"
            value={veldGeboortedatum}
            onChange={(e) => setVeldGeboortedatum(e.target.value)}
            className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </label>
        <button type="button" onClick={opslaan} className="rounded-lg bg-sparta px-4 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark">
          Opslaan
        </button>
        <button type="button" onClick={() => setBewerken(false)} className="rounded-lg px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-800">
          Annuleer
        </button>
        {fout && <span className="w-full text-sm text-red-600">{fout}</span>}
      </div>
    );
  }

  return (
    <header className="mt-4 flex items-center gap-4">
      <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-sparta/10 text-xl font-bold text-sparta">
        {rugnummer ?? "–"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-2xl font-bold text-neutral-800">{naam}</h1>
          <button type="button" onClick={beginBewerken} className="text-xs text-neutral-400 hover:text-sparta">
            bewerken
          </button>
        </div>
      </div>
    </header>
  );
}
