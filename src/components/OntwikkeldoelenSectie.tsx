"use client";

import { useState, useTransition } from "react";
import { nieuwOntwikkeldoel } from "@/app/staf/speler/[id]/actions";
import type { Ontwikkeldoel } from "@/lib/types/database";

interface VragenlijstSuggestie { label: string; tekst: string }

export function OntwikkeldoelenSectie({
  spelerId, beginDoelen, suggesties,
}: {
  spelerId: string;
  beginDoelen: Ontwikkeldoel[];
  suggesties: VragenlijstSuggestie[];
}) {
  const [doelen, setDoelen] = useState(beginDoelen);
  const [nieuw, setNieuw] = useState("");
  const [bezig, start] = useTransition();

  const bestaandeTeksten = new Set(doelen.map((d) => d.doel.trim().toLowerCase()));

  function toevoegen(tekst: string) {
    const schoon = tekst.trim();
    if (!schoon || bestaandeTeksten.has(schoon.toLowerCase())) return;
    start(async () => {
      const res = await nieuwOntwikkeldoel(spelerId, schoon);
      if (res.ok) {
        setDoelen((d) => [...d, res.doel]);
        setNieuw("");
      }
    });
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-sparta">Ontwikkeldoelen</h2>

      {doelen.length > 0 ? (
        <ul className="mb-2 space-y-2">
          {doelen.map((d) => (
            <li key={d.id} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
              <span className="font-medium">{d.doel}</span>
              <span className="ml-2 text-xs text-neutral-400">({d.status})</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-2 text-sm text-neutral-400">Nog geen doelen.</p>
      )}

      {suggesties.filter((s) => !bestaandeTeksten.has(s.tekst.trim().toLowerCase())).length > 0 && (
        <div className="mb-2 space-y-1.5">
          <p className="text-xs text-neutral-400">Overnemen uit de vragenlijst:</p>
          {suggesties
            .filter((s) => !bestaandeTeksten.has(s.tekst.trim().toLowerCase()))
            .map((s) => (
              <button
                key={s.label}
                type="button"
                disabled={bezig}
                onClick={() => toevoegen(s.tekst)}
                className="block w-full rounded-lg border border-dashed border-sparta/40 bg-sparta/5 px-3 py-2 text-left text-xs text-neutral-700 hover:bg-sparta/10 disabled:opacity-50"
              >
                <span className="font-semibold text-sparta">📋 {s.label}: </span>
                {s.tekst.length > 120 ? `${s.tekst.slice(0, 120)}…` : s.tekst}
              </button>
            ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={nieuw}
          onChange={(e) => setNieuw(e.target.value)}
          placeholder="Eigen ontwikkeldoel…"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          disabled={bezig || !nieuw.trim()}
          onClick={() => toevoegen(nieuw)}
          className="rounded-lg bg-sparta px-3 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark disabled:opacity-50"
        >
          +
        </button>
      </div>
    </section>
  );
}
