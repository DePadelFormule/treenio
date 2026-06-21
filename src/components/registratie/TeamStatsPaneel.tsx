"use client";

import { useState, useTransition } from "react";
import { Stepper } from "./Stepper";
import {
  upsertTeamStats,
  type TeamStatsPayload,
} from "@/app/staf/wedstrijd/[id]/registreren/actions";

type TeamWaarden = Omit<TeamStatsPayload, "wedstrijd_id">;

interface Props {
  wedstrijdId: string;
  begin: TeamWaarden;
}

export function TeamStatsPaneel({ wedstrijdId, begin }: Props) {
  const [state, setState] = useState<TeamWaarden>(begin);
  const [bezig, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "fout">("idle");

  function set<K extends keyof TeamWaarden>(key: K, val: TeamWaarden[K]) {
    setState((s) => ({ ...s, [key]: val }));
    setStatus("idle");
  }

  function opslaan() {
    startTransition(async () => {
      const res = await upsertTeamStats({ wedstrijd_id: wedstrijdId, ...state });
      setStatus(res.ok ? "ok" : "fout");
    });
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-neutral-700">Team-stats (deze wedstrijd)</h3>
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <Stepper label="Vrije trappen tegen" value={state.vrije_trappen_tegen} onChange={(v) => set("vrije_trappen_tegen", v)} />
        <Stepper label="Corners tegen" value={state.corners_tegen} onChange={(v) => set("corners_tegen", v)} />
        <Stepper label="Goals uit spel" value={state.goals_uit_spel} onChange={(v) => set("goals_uit_spel", v)} />
        <Stepper label="Goals uit standaard" value={state.goals_uit_standaard} onChange={(v) => set("goals_uit_standaard", v)} />
        <Stepper label="Tegengoals uit spel" value={state.tegengoals_uit_spel} onChange={(v) => set("tegengoals_uit_spel", v)} />
        <Stepper label="Tegengoals uit standaard" value={state.tegengoals_uit_standaard} onChange={(v) => set("tegengoals_uit_standaard", v)} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={opslaan}
          disabled={bezig}
          className="rounded-lg bg-sparta px-4 py-2 text-sm font-semibold text-white transition hover:bg-sparta-dark disabled:opacity-40"
        >
          {bezig ? "Opslaan…" : "Team-stats opslaan"}
        </button>
        {status === "ok" && <span className="text-sm text-sparta">✓ Opgeslagen</span>}
        {status === "fout" && <span className="text-sm text-red-600">Opslaan mislukt</span>}
      </div>
    </div>
  );
}
