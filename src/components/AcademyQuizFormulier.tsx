"use client";

import { useState, useTransition } from "react";
import { academyQuizAfronden } from "@/app/academy/actions";
import type { AcademyVraagPubliek } from "@/lib/types/database";

interface SpelerOptie { id: string; naam: string; rugnummer: number | null }

export function AcademyQuizFormulier({
  hoofdstukId,
  vragen,
  spelers,
}: {
  hoofdstukId: string;
  vragen: AcademyVraagPubliek[];
  spelers: SpelerOptie[];
}) {
  const [spelerId, setSpelerId] = useState("");
  const [antwoorden, setAntwoorden] = useState<Record<string, number>>({});
  const [fout, setFout] = useState<string | null>(null);
  const [resultaat, setResultaat] = useState<{ score: number; totaal: number } | null>(null);
  const [bezig, start] = useTransition();

  function versturen(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    if (!spelerId) {
      setFout("Kies eerst je naam bovenaan.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (Object.keys(antwoorden).length < vragen.length) {
      setFout("Beantwoord eerst alle vragen.");
      return;
    }
    start(async () => {
      const res = await academyQuizAfronden(hoofdstukId, spelerId, antwoorden);
      if (res.ok) {
        setResultaat({ score: res.score!, totaal: res.totaal! });
        window.scrollTo({ top: 0 });
      } else {
        setFout(res.fout ?? "Er ging iets mis.");
      }
    });
  }

  if (resultaat) {
    return (
      <div className="rounded-xl bg-green-50 p-6 text-center">
        <p className="text-3xl">🎯</p>
        <p className="mt-2 text-2xl font-bold text-green-800">{resultaat.score} / {resultaat.totaal}</p>
        <p className="mt-1 text-sm text-green-700">Bedankt voor het meedoen! Je kunt deze pagina nu sluiten.</p>
      </div>
    );
  }

  return (
    <form onSubmit={versturen} className="space-y-4">
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
              <option key={s.id} value={s.id}>{s.naam}</option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-neutral-400">
          Staat je naam er niet bij? Dan heb je deze quiz al gedaan, of meld het bij de trainer.
        </p>
      </div>

      {vragen.map((v, i) => (
        <div key={v.id} className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="mb-2 text-sm font-medium text-neutral-800">
            <span className="text-sparta">{i + 1}.</span> {v.vraag}
          </p>
          <div className={v.type === "stelling" ? "flex gap-2" : "grid gap-2 sm:grid-cols-2"}>
            {v.opties.map((optie, idx) => {
              const gekozen = antwoorden[v.id] === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAntwoorden((a) => ({ ...a, [v.id]: idx }))}
                  className={`rounded-lg px-3 py-2 text-left text-sm font-medium ${
                    v.type === "stelling" ? "flex-1 text-center" : ""
                  } ${gekozen ? "bg-sparta text-white" : "bg-neutral-100 text-neutral-700"}`}
                >
                  {v.type === "meerkeuze" && <span className="mr-1.5 font-bold">{String.fromCharCode(65 + idx)}.</span>}
                  {optie}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {fout && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{fout}</p>}

      <button
        type="submit"
        disabled={bezig}
        className="w-full rounded-lg bg-sparta px-4 py-3 text-base font-semibold text-white transition hover:bg-sparta-dark disabled:opacity-50"
      >
        {bezig ? "Versturen…" : "Versturen"}
      </button>
      <p className="pb-4 text-center text-xs text-neutral-400">Je kunt deze quiz maar één keer doen.</p>
    </form>
  );
}
