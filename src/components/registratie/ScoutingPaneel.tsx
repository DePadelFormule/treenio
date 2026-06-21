"use client";

import { useState, useTransition } from "react";
import {
  upsertScouting,
  type ScoutingPayload,
} from "@/app/staf/wedstrijd/[id]/registreren/actions";

type ScoutingWaarden = Omit<ScoutingPayload, "wedstrijd_id">;

interface Props {
  wedstrijdId: string;
  begin: ScoutingWaarden;
}

export function ScoutingPaneel({ wedstrijdId, begin }: Props) {
  const [state, setState] = useState<ScoutingWaarden>(begin);
  const [bezig, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "fout">("idle");

  function set<K extends keyof ScoutingWaarden>(key: K, val: ScoutingWaarden[K]) {
    setState((s) => ({ ...s, [key]: val }));
    setStatus("idle");
  }

  function opslaan() {
    start(async () => {
      const res = await upsertScouting({ wedstrijd_id: wedstrijdId, ...state });
      setStatus(res.ok ? "ok" : "fout");
    });
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-neutral-700">Tegenstander-scouting</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Systeem tegenstander</span>
          <input
            type="text"
            placeholder="bijv. 4-3-3"
            value={state.systeem_tegenstander ?? ""}
            onChange={(e) => set("systeem_tegenstander", e.target.value || null)}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Druk zonder bal</span>
          <select
            value={state.drukzetten ?? ""}
            onChange={(e) => set("drukzetten", e.target.value || null)}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
          >
            <option value="">—</option>
            <option value="hoog">Zet hoog druk</option>
            <option value="inzakken">Zakt in</option>
            <option value="wisselend">Wisselend</option>
          </select>
        </label>

        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-xs text-neutral-500">Zwakke schakel in de opbouw</span>
          <input
            type="text"
            value={state.zwakke_schakel ?? ""}
            onChange={(e) => set("zwakke_schakel", e.target.value || null)}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </label>

        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-xs text-neutral-500">Uitblinkers / gevaarlijke spelers</span>
          <input
            type="text"
            value={state.uitblinkers ?? ""}
            onChange={(e) => set("uitblinkers", e.target.value || null)}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </label>

        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-xs text-neutral-500">Ons eigen plan / opmerking</span>
          <textarea
            rows={2}
            value={state.eigen_opmerking ?? ""}
            onChange={(e) => set("eigen_opmerking", e.target.value || null)}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={opslaan}
          disabled={bezig}
          className="rounded-lg bg-pitch px-4 py-2 text-sm font-semibold text-white transition hover:bg-pitch-dark disabled:opacity-40"
        >
          {bezig ? "Opslaan…" : "Scouting opslaan"}
        </button>
        {status === "ok" && <span className="text-sm text-pitch">✓ Opgeslagen</span>}
        {status === "fout" && <span className="text-sm text-red-600">Opslaan mislukt</span>}
      </div>
    </div>
  );
}
