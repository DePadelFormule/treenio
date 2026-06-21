"use client";

import { useState, useTransition } from "react";
import { Stepper } from "./Stepper";
import {
  POSITIE_CODES,
  AFMELD_OPTIES,
  STARTTE_ALS_OPTIES,
} from "@/lib/constants";
import {
  upsertWedstrijdRegistratie,
  type WedstrijdRegPayload,
} from "@/app/staf/wedstrijd/[id]/registreren/actions";

interface Props {
  wedstrijdId: string;
  spelerId: string;
  naam: string;
  rugnummer: number | null;
  begin: Omit<WedstrijdRegPayload, "wedstrijd_id" | "speler_id">;
}

export function SpelerRegistratieKaart({
  wedstrijdId,
  spelerId,
  naam,
  rugnummer,
  begin,
}: Props) {
  const [state, setState] = useState(begin);
  const [bezig, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "fout">("idle");
  const [vies, setVies] = useState(false);

  function set<K extends keyof typeof state>(key: K, val: (typeof state)[K]) {
    setState((s) => ({ ...s, [key]: val }));
    setVies(true);
    setStatus("idle");
  }

  function opslaan() {
    startTransition(async () => {
      const res = await upsertWedstrijdRegistratie({
        wedstrijd_id: wedstrijdId,
        speler_id: spelerId,
        ...state,
      });
      if (res.ok) {
        setStatus("ok");
        setVies(false);
      } else {
        setStatus("fout");
      }
    });
  }

  const inSelectie = state.startte_als !== "niet_in_selectie";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sparta/10 font-bold text-sparta">
          {rugnummer ?? "–"}
        </div>
        <h3 className="font-semibold text-neutral-800">{naam}</h3>
      </div>

      {/* Status / positie / minuten */}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Startte als</span>
          <select
            value={state.startte_als}
            onChange={(e) => set("startte_als", e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
          >
            {STARTTE_ALS_OPTIES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Positie</span>
          <select
            value={state.positie ?? ""}
            onChange={(e) => set("positie", e.target.value || null)}
            disabled={!inSelectie}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm disabled:bg-neutral-100"
          >
            <option value="">—</option>
            {POSITIE_CODES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Speelminuten</span>
          <input
            type="number"
            min={0}
            max={130}
            value={state.speelminuten}
            onChange={(e) => set("speelminuten", Number(e.target.value))}
            disabled={!inSelectie}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm disabled:bg-neutral-100"
          />
        </label>
      </div>

      {inSelectie && (
        <>
          {/* Toggles */}
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Toggle label="Eruit gewisseld" actief={state.gewisseld_uit} onClick={() => set("gewisseld_uit", !state.gewisseld_uit)} />
            <Toggle label="Ingevallen" actief={state.ingevallen} onClick={() => set("ingevallen", !state.ingevallen)} />
            <Toggle label="90 min bank" actief={state.volledige_bank} onClick={() => set("volledige_bank", !state.volledige_bank)} />
            <Toggle label="Rode kaart" actief={state.rode_kaart} onClick={() => set("rode_kaart", !state.rode_kaart)} kleur="rood" />
            <Toggle label="⭐ Man of the Match" actief={state.man_of_the_match} onClick={() => set("man_of_the_match", !state.man_of_the_match)} kleur="goud" />
          </div>

          {/* Tellers */}
          <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <Stepper label="Goals" value={state.goals} onChange={(v) => set("goals", v)} />
            <Stepper label="Assists" value={state.assists} onChange={(v) => set("assists", v)} />
            <Stepper label="Balcontact vóór assist" value={state.balcontacten_voor_assist} onChange={(v) => set("balcontacten_voor_assist", v)} />
            <Stepper label="Duels gewonnen" value={state.duels_gewonnen} onChange={(v) => set("duels_gewonnen", v)} />
            <Stepper label="Duels verloren" value={state.duels_verloren} onChange={(v) => set("duels_verloren", v)} />
            <Stepper label="Balverlies" value={state.balverlies} onChange={(v) => set("balverlies", v)} />
            <Stepper label="Gele kaarten" value={state.gele_kaarten} onChange={(v) => set("gele_kaarten", v)} max={2} />
            <Stepper label="Overtredingen gemaakt" value={state.overtredingen_gemaakt} onChange={(v) => set("overtredingen_gemaakt", v)} />
            <Stepper label="Overtredingen tegen" value={state.overtredingen_tegen} onChange={(v) => set("overtredingen_tegen", v)} />
          </div>
        </>
      )}

      {/* Afmeld-discipline */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Afmeld-status</span>
          <select
            value={state.afmeld_status}
            onChange={(e) => set("afmeld_status", e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
          >
            {AFMELD_OPTIES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <Toggle label="Op tijd aanwezig" actief={state.op_tijd === true} onClick={() => set("op_tijd", state.op_tijd === true ? null : true)} />
        </div>
      </div>

      {/* Opslaan */}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={opslaan}
          disabled={bezig || !vies}
          className="rounded-lg bg-sparta px-4 py-2 text-sm font-semibold text-white transition hover:bg-sparta-dark disabled:opacity-40"
        >
          {bezig ? "Opslaan…" : "Opslaan"}
        </button>
        {status === "ok" && !vies && <span className="text-sm text-sparta">✓ Opgeslagen</span>}
        {status === "fout" && <span className="text-sm text-red-600">Opslaan mislukt</span>}
        {vies && status !== "fout" && <span className="text-sm text-amber-600">Niet opgeslagen wijzigingen</span>}
      </div>
    </div>
  );
}

function Toggle({
  label,
  actief,
  onClick,
  kleur = "groen",
}: {
  label: string;
  actief: boolean;
  onClick: () => void;
  kleur?: "groen" | "rood" | "goud";
}) {
  const aanKleur =
    kleur === "rood"
      ? "bg-red-600 text-white"
      : kleur === "goud"
        ? "bg-neutral-900 text-white"
        : "bg-sparta text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        actief ? aanKleur : "bg-neutral-200 text-neutral-600"
      }`}
    >
      {label}
    </button>
  );
}
