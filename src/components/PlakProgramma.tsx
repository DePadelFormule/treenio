"use client";

import { useState, useTransition } from "react";
import { plakProgramma } from "@/app/staf/wedstrijden/actions";

// Tekstvak waar de trainer het programma van voetbal.nl in plakt; de server
// haalt er de wedstrijden uit en voegt ze in één keer toe.
export function PlakProgramma() {
  const [tekst, setTekst] = useState("");
  const [bezig, start] = useTransition();
  const [bericht, setBericht] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function verwerk() {
    if (!tekst.trim()) return;
    setBericht(null);
    start(async () => {
      const res = await plakProgramma(tekst);
      setOk(res.ok);
      setBericht(res.bericht);
      if (res.ok) setTekst("");
    });
  }

  return (
    <details className="rounded-xl border border-neutral-200 bg-white p-4">
      <summary className="cursor-pointer select-none text-sm font-semibold text-sparta">
        Programma of uitslagen plakken (voetbal.nl)
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-neutral-500">
          Open het programma óf de uitslagen van JO17-2 in de voetbal.nl-app of op de site,
          selecteer en kopieer de lijst, en plak hem hieronder. Datums, tegenstanders en uitslagen
          worden automatisch herkend. Bestaande wedstrijden worden niet gedupliceerd; plak je
          uitslagen, dan worden die bij de juiste wedstrijden ingevuld.
        </p>
        <textarea
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          rows={8}
          placeholder={
            "zaterdag 5 september 2026\n09:00 Nivo Sparta JO17-2 - Almkerk JO17-1\n\nzaterdag 12 september 2026\n10:30 Sleeuwijk JO17-1 - Nivo Sparta JO17-2"
          }
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={verwerk}
            disabled={bezig || !tekst.trim()}
            className="rounded-lg bg-sparta px-4 py-2 text-sm font-semibold text-white transition hover:bg-sparta-dark disabled:opacity-40"
          >
            {bezig ? "Verwerken…" : "Wedstrijden toevoegen"}
          </button>
          {bericht && (
            <span className={`text-sm ${ok ? "text-sparta" : "text-amber-600"}`}>{bericht}</span>
          )}
        </div>
      </div>
    </details>
  );
}
