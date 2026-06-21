"use client";

import { useState, useTransition } from "react";
import { AFMELD_OPTIES } from "@/lib/constants";
import {
  upsertTrainingRegistratie,
  type TrainingRegPayload,
} from "@/app/staf/training/[id]/actions";

interface Props {
  trainingId: string;
  spelerId: string;
  naam: string;
  rugnummer: number | null;
  begin: Omit<TrainingRegPayload, "training_id" | "speler_id">;
}

export function TrainingPresentieRij({ trainingId, spelerId, naam, rugnummer, begin }: Props) {
  const [state, setState] = useState(begin);
  const [bezig, start] = useTransition();
  const [bewaard, setBewaard] = useState(false);

  function bewaar(next: typeof state) {
    setState(next);
    setBewaard(false);
    start(async () => {
      const res = await upsertTrainingRegistratie({
        training_id: trainingId,
        speler_id: spelerId,
        ...next,
      });
      if (res.ok) setBewaard(true);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3">
      <div className="flex min-w-[11rem] items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pitch/10 text-sm font-bold text-pitch">
          {rugnummer ?? "–"}
        </div>
        <span className="font-medium text-neutral-800">{naam}</span>
      </div>

      {/* Aanwezig / afwezig */}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => bewaar({ ...state, aanwezig: true, afmeld_status: "nvt" })}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            state.aanwezig ? "bg-pitch text-white" : "bg-neutral-200 text-neutral-600"
          }`}
        >
          Aanwezig
        </button>
        <button
          type="button"
          onClick={() => bewaar({ ...state, aanwezig: false })}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            !state.aanwezig ? "bg-neutral-700 text-white" : "bg-neutral-200 text-neutral-600"
          }`}
        >
          Afwezig
        </button>
      </div>

      {/* Afmeld-status (alleen relevant bij afwezig) */}
      {!state.aanwezig && (
        <select
          value={state.afmeld_status}
          onChange={(e) => bewaar({ ...state, afmeld_status: e.target.value })}
          className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
        >
          {AFMELD_OPTIES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      {/* Inzet 1-5 (alleen bij aanwezig) */}
      {state.aanwezig && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-neutral-400">Inzet</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => bewaar({ ...state, inzet: state.inzet === n ? null : n })}
              className={`h-7 w-7 rounded-full text-sm font-semibold ${
                state.inzet === n ? "bg-gold text-neutral-900" : "bg-neutral-200 text-neutral-600"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      <span className="ml-auto text-xs">
        {bezig ? <span className="text-neutral-400">…</span> : bewaard ? <span className="text-pitch">✓</span> : null}
      </span>
    </div>
  );
}
