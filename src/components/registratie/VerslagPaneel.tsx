"use client";

import { useState, useTransition } from "react";
import {
  upsertVerslag,
  type VerslagPayload,
} from "@/app/staf/wedstrijd/[id]/registreren/actions";

type VerslagWaarden = Omit<VerslagPayload, "wedstrijd_id">;

interface Props {
  wedstrijdId: string;
  begin: VerslagWaarden;
}

export function VerslagPaneel({ wedstrijdId, begin }: Props) {
  const [state, setState] = useState<VerslagWaarden>(begin);
  const [bezig, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "fout">("idle");

  function set<K extends keyof VerslagWaarden>(key: K, val: VerslagWaarden[K]) {
    setState((s) => ({ ...s, [key]: val }));
    setStatus("idle");
  }

  function opslaan() {
    start(async () => {
      const res = await upsertVerslag({ wedstrijd_id: wedstrijdId, ...state });
      setStatus(res.ok ? "ok" : "fout");
    });
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-neutral-700">Wedstrijdverslag (na afloop)</h3>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Wat ging goed?</span>
          <textarea rows={2} value={state.ging_goed ?? ""} onChange={(e) => set("ging_goed", e.target.value || null)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Wat kan beter?</span>
          <textarea rows={2} value={state.kan_beter ?? ""} onChange={(e) => set("kan_beter", e.target.value || null)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Aandachtspunten voor de training</span>
          <textarea rows={2} value={state.voor_training ?? ""} onChange={(e) => set("voor_training", e.target.value || null)} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={opslaan} disabled={bezig} className="rounded-lg bg-sparta px-4 py-2 text-sm font-semibold text-white hover:bg-sparta-dark disabled:opacity-40">
          {bezig ? "Opslaan…" : "Verslag opslaan"}
        </button>
        {status === "ok" && <span className="text-sm text-sparta">✓ Opgeslagen</span>}
        {status === "fout" && <span className="text-sm text-red-600">Opslaan mislukt</span>}
      </div>
    </div>
  );
}
