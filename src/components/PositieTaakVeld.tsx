"use client";

import { useState, useTransition } from "react";
import { bewaarPositieTaken } from "@/app/staf/positietaken/actions";

// Taken voor één positie bewerken, direct opslaan (tik-en-opslaan patroon).
export function PositieTaakVeld({
  positieCode,
  positieLabel,
  situatie,
  begin,
}: {
  positieCode: string;
  positieLabel: string;
  situatie: string;
  begin: string;
}) {
  const [waarde, setWaarde] = useState(begin);
  const [bezig, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "fout">("idle");

  function opslaan() {
    setStatus("idle");
    start(async () => {
      const res = await bewaarPositieTaken(positieCode, situatie, waarde);
      setStatus(res.ok ? "ok" : "fout");
    });
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-sparta">{positieLabel}</h3>
      <p className="mb-2 mt-0.5 text-xs text-neutral-400">Één taak per regel.</p>
      <textarea
        value={waarde}
        onChange={(e) => { setWaarde(e.target.value); setStatus("idle"); }}
        rows={4}
        placeholder={"bijv.\nAfstand houden tot directe tegenstander\nKopbal- en passlijn dichthouden"}
        className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={opslaan}
          disabled={bezig}
          className="rounded-lg bg-sparta px-3 py-1.5 text-xs font-semibold text-white hover:bg-sparta-dark disabled:opacity-50"
        >
          {bezig ? "Opslaan…" : "Opslaan"}
        </button>
        {status === "ok" && <span className="text-xs text-sparta">✓ Opgeslagen</span>}
        {status === "fout" && <span className="text-xs text-red-600">Opslaan mislukt</span>}
      </div>
    </div>
  );
}
