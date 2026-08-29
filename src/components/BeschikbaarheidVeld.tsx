"use client";

import { useState, useTransition } from "react";
import { updateBeschikbaarheid } from "@/app/staf/speler/[id]/actions";
import type { Beschikbaarheid } from "@/lib/types/database";

export function BeschikbaarheidVeld({
  spelerId, beginStatus, beginNotitie,
}: {
  spelerId: string;
  beginStatus: Beschikbaarheid;
  beginNotitie: string;
}) {
  const [status, setStatus] = useState<Beschikbaarheid>(beginStatus);
  const [notitie, setNotitie] = useState(beginNotitie);
  const [bezig, start] = useTransition();
  const [resultaat, setResultaat] = useState<"idle" | "ok" | "fout">("idle");

  function opslaan() {
    setResultaat("idle");
    start(async () => {
      const res = await updateBeschikbaarheid(spelerId, status, notitie);
      setResultaat(res.ok ? "ok" : "fout");
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <label className="text-sm">
        <span className="mb-1 block text-xs text-neutral-500">Status</span>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as Beschikbaarheid); setResultaat("idle"); }}
          className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="fit">🟢 Fit</option>
          <option value="twijfel">🟡 Twijfel</option>
          <option value="geblesseerd">🔴 Geblesseerd</option>
        </select>
      </label>
      <label className="flex-1 text-sm">
        <span className="mb-1 block text-xs text-neutral-500">Blessure-notitie</span>
        <input
          type="text"
          value={notitie}
          onChange={(e) => { setNotitie(e.target.value); setResultaat("idle"); }}
          placeholder="bijv. enkel, terug over 2 weken"
          className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </label>
      <button
        type="button"
        onClick={opslaan}
        disabled={bezig}
        className="rounded-lg bg-sparta px-4 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark disabled:opacity-50"
      >
        {bezig ? "Opslaan…" : "Status opslaan"}
      </button>
      {resultaat === "ok" && <span className="text-sm text-sparta">✓ Opgeslagen</span>}
      {resultaat === "fout" && <span className="text-sm text-red-600">Opslaan mislukt</span>}
    </div>
  );
}
