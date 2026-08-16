"use client";

import { useState, useTransition } from "react";
import { verstuurVragenlijst } from "@/app/vragenlijst/actions";
import { VRAGENLIJST, VRAGENLIJST_BLOKKEN, POSITIE_OPTIES } from "@/lib/vragenlijst";
import type { Vraag } from "@/lib/vragenlijst";

interface SpelerOptie { id: string; naam: string; rugnummer: number | null }

export function VragenlijstFormulier({ spelers }: { spelers: SpelerOptie[] }) {
  const [spelerId, setSpelerId] = useState("");
  const [antwoorden, setAntwoorden] = useState<Record<string, string>>({});
  const [fout, setFout] = useState<string | null>(null);
  const [klaar, setKlaar] = useState(false);
  const [bezig, start] = useTransition();

  const zet = (id: string, waarde: string) => setAntwoorden((a) => ({ ...a, [id]: waarde }));

  function versturen(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    if (!spelerId) {
      setFout("Kies eerst je naam bovenaan.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    start(async () => {
      const res = await verstuurVragenlijst(spelerId, antwoorden);
      if (res.ok) {
        setKlaar(true);
        window.scrollTo({ top: 0 });
      } else {
        setFout(res.fout ?? "Er ging iets mis.");
      }
    });
  }

  if (klaar) {
    return (
      <div className="rounded-xl bg-green-50 p-6 text-center">
        <p className="text-3xl">✅</p>
        <p className="mt-2 font-semibold text-green-800">Bedankt, je antwoorden zijn verstuurd!</p>
        <p className="mt-1 text-sm text-green-700">Je kunt deze pagina nu sluiten. Succes dit seizoen! ⚽</p>
      </div>
    );
  }

  return (
    <form onSubmit={versturen} className="space-y-6">
      {/* Naam kiezen */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-neutral-800">Wie ben je?</span>
          <select
            value={spelerId}
            onChange={(e) => setSpelerId(e.target.value)}
            required
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          >
            <option value="">— kies je naam —</option>
            {spelers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.naam}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-neutral-400">
          Staat je naam er niet bij? Dan heb je de lijst al ingevuld, of meld het bij de trainer.
        </p>
      </div>

      {/* Vragen per blok */}
      {VRAGENLIJST_BLOKKEN.map((blok) => (
        <section key={blok} className="rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 font-bold text-sparta">{blok}</h2>
          <div className="space-y-4">
            {VRAGENLIJST.filter((v) => v.blok === blok).map((v) => (
              <VraagVeld key={v.id} vraag={v} waarde={antwoorden[v.id] ?? ""} onChange={(w) => zet(v.id, w)} />
            ))}
          </div>
        </section>
      ))}

      {fout && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{fout}</p>}

      <button
        type="submit"
        disabled={bezig}
        className="w-full rounded-lg bg-sparta px-4 py-3 text-base font-semibold text-white transition hover:bg-sparta-dark disabled:opacity-50"
      >
        {bezig ? "Versturen…" : "Versturen"}
      </button>
      <p className="pb-4 text-center text-xs text-neutral-400">
        Na het versturen kun je je antwoorden niet meer aanpassen.
      </p>
    </form>
  );
}

function VraagVeld({ vraag, waarde, onChange }: { vraag: Vraag; waarde: string; onChange: (w: string) => void }) {
  const label = (
    <span className="mb-1 block text-sm font-medium text-neutral-700">
      {vraag.tekst}
      {vraag.optioneel && <span className="ml-1 text-xs font-normal text-neutral-400">(niet verplicht)</span>}
    </span>
  );

  if (vraag.type === "keuze") {
    return (
      <div>
        {label}
        <div className="flex flex-wrap gap-2">
          {vraag.opties?.map((optie) => (
            <button
              key={optie}
              type="button"
              onClick={() => onChange(optie)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                waarde === optie ? "bg-sparta text-white" : "bg-neutral-100 text-neutral-700"
              }`}
            >
              {optie}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (vraag.type === "positie") {
    return (
      <label className="block">
        {label}
        <select
          value={waarde}
          onChange={(e) => onChange(e.target.value)}
          required={!vraag.optioneel}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base sm:w-64"
        >
          <option value="">—</option>
          {POSITIE_OPTIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
    );
  }

  if (vraag.type === "kort") {
    return (
      <label className="block">
        {label}
        <input
          type="text"
          value={waarde}
          onChange={(e) => onChange(e.target.value)}
          required={!vraag.optioneel}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
        />
      </label>
    );
  }

  return (
    <label className="block">
      {label}
      {vraag.hint && <span className="mb-1 block text-xs text-neutral-400">{vraag.hint}</span>}
      <textarea
        value={waarde}
        onChange={(e) => onChange(e.target.value)}
        required={!vraag.optioneel}
        rows={3}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
      />
    </label>
  );
}
