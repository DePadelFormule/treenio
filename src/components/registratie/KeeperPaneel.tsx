"use client";

import { useState, useTransition } from "react";
import { Stepper } from "./Stepper";
import {
  upsertKeeperRegistratie,
  type KeeperRegPayload,
} from "@/app/staf/wedstrijd/[id]/registreren/actions";

type KeeperWaarden = Omit<KeeperRegPayload, "wedstrijd_id" | "speler_id">;

const LEEG: KeeperWaarden = {
  hoge_ballen_gepakt: 0,
  reddingen: 0,
  een_op_een_reddingen: 0,
  reddingen_buiten_16: 0,
  tegengoals: 0,
  clean_sheet: false,
  uittrappen_lang: 0,
  opbouw_van_achteruit: 0,
};

interface Props {
  wedstrijdId: string;
  spelers: { id: string; naam: string }[];
  bestaand: Record<string, KeeperWaarden>; // speler_id → waarden
}

export function KeeperPaneel({ wedstrijdId, spelers, bestaand }: Props) {
  const [spelerId, setSpelerId] = useState<string>("");
  const [state, setState] = useState<KeeperWaarden>(LEEG);
  const [bezig, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "fout">("idle");

  function kiesSpeler(id: string) {
    setSpelerId(id);
    setState(bestaand[id] ?? LEEG);
    setStatus("idle");
  }

  function set<K extends keyof KeeperWaarden>(key: K, val: KeeperWaarden[K]) {
    setState((s) => ({ ...s, [key]: val }));
    setStatus("idle");
  }

  function opslaan() {
    if (!spelerId) return;
    startTransition(async () => {
      const res = await upsertKeeperRegistratie({
        wedstrijd_id: wedstrijdId,
        speler_id: spelerId,
        ...state,
      });
      setStatus(res.ok ? "ok" : "fout");
    });
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-neutral-700">Keeper 🧤</h3>

      <label className="text-sm">
        <span className="mb-1 block text-xs text-neutral-500">Welke speler keepte?</span>
        <select
          value={spelerId}
          onChange={(e) => kiesSpeler(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm sm:max-w-xs"
        >
          <option value="">— kies speler —</option>
          {spelers.map((s) => (
            <option key={s.id} value={s.id}>{s.naam}</option>
          ))}
        </select>
      </label>

      {spelerId && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => set("clean_sheet", !state.clean_sheet)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                state.clean_sheet ? "bg-sparta text-white" : "bg-neutral-200 text-neutral-600"
              }`}
            >
              Clean sheet
            </button>
          </div>

          <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <Stepper label="Hoge ballen gepakt" value={state.hoge_ballen_gepakt} onChange={(v) => set("hoge_ballen_gepakt", v)} />
            <Stepper label="Reddingen" value={state.reddingen} onChange={(v) => set("reddingen", v)} />
            <Stepper label="1-op-1 reddingen" value={state.een_op_een_reddingen} onChange={(v) => set("een_op_een_reddingen", v)} />
            <Stepper label="Saves buiten 16m" value={state.reddingen_buiten_16} onChange={(v) => set("reddingen_buiten_16", v)} />
            <Stepper label="Tegengoals" value={state.tegengoals} onChange={(v) => set("tegengoals", v)} />
            <Stepper label="Lang uitgetrapt" value={state.uittrappen_lang} onChange={(v) => set("uittrappen_lang", v)} />
            <Stepper label="Opbouw van achteruit" value={state.opbouw_van_achteruit} onChange={(v) => set("opbouw_van_achteruit", v)} />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={opslaan}
              disabled={bezig}
              className="rounded-lg bg-sparta px-4 py-2 text-sm font-semibold text-white transition hover:bg-sparta-dark disabled:opacity-40"
            >
              {bezig ? "Opslaan…" : "Keeper opslaan"}
            </button>
            {status === "ok" && <span className="text-sm text-sparta">✓ Opgeslagen</span>}
            {status === "fout" && <span className="text-sm text-red-600">Opslaan mislukt</span>}
          </div>
        </>
      )}
    </div>
  );
}
