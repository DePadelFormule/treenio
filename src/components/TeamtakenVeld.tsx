"use client";

import { useState, useTransition } from "react";
import { bewaarTeamtaken } from "@/app/staf/wedstrijd/[id]/opstelling/actions";

// Teamtaken opslaan via een directe server-aanroep (useTransition), net als
// de andere tik-en-opslaan blokken in de app — geen native form-post, dus
// geen paginanavigatie/herlaad die de rest van de pagina kan blokkeren.
export function TeamtakenVeld({ wedstrijdId, begin }: { wedstrijdId: string; begin: string }) {
  const [waarde, setWaarde] = useState(begin);
  const [bezig, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "fout">("idle");

  function opslaan() {
    setStatus("idle");
    start(async () => {
      const res = await bewaarTeamtaken(wedstrijdId, waarde);
      setStatus(res.ok ? "ok" : "fout");
    });
  }

  return (
    <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-700">Teamtaken</h2>
      <p className="mb-2 mt-0.5 text-xs text-neutral-400">Maximaal drie, één per regel.</p>
      <textarea
        value={waarde}
        onChange={(e) => { setWaarde(e.target.value); setStatus("idle"); }}
        rows={3}
        placeholder={"1. …\n2. …\n3. …"}
        className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={opslaan}
          disabled={bezig}
          className="rounded-lg bg-sparta px-4 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark disabled:opacity-50"
        >
          {bezig ? "Opslaan…" : "Teamtaken opslaan"}
        </button>
        {status === "ok" && <span className="text-sm text-sparta">✓ Opgeslagen</span>}
        {status === "fout" && <span className="text-sm text-red-600">Opslaan mislukt</span>}
      </div>
    </div>
  );
}
