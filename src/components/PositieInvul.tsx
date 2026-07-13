"use client";

import { useMemo, useState, useTransition } from "react";
import { setVoorkeur } from "@/app/staf/posities/actions";
import { FORMATIES, SYSTEMEN, codesVan } from "@/lib/posities";
import type { Systeem } from "@/lib/types/database";

interface SpelerKort { id: string; naam: string; rugnummer: number | null; }
// key: "spelerId:systeem" → { positie_1, positie_2, positie_3 }
type Keuzes = Record<string, { positie_1: string | null; positie_2: string | null; positie_3: string | null }>;

interface Props {
  spelers: SpelerKort[];
  begin: Keuzes;
}

function VeldDiagram({ systeem }: { systeem: Systeem }) {
  return (
    <div
      className="relative mx-auto mb-5 w-full max-w-sm overflow-hidden rounded-2xl border-2 border-white/40 bg-gradient-to-b from-green-700 to-green-800"
      style={{ aspectRatio: "3/4" }}
    >
      <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-white/30" />
      <div className="pointer-events-none absolute left-3 right-3 top-[42%] border-t-2 border-white/25" />
      <div className="pointer-events-none absolute left-1/2 top-[42%] h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25" />
      <div className="pointer-events-none absolute bottom-3 left-1/4 right-1/4 h-10 border-2 border-white/25" />
      {FORMATIES[systeem].map((p) => (
        <div key={p.code} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sparta text-sm font-bold text-white shadow ring-2 ring-white/60">
            {p.nr}
          </div>
          <div className="mt-0.5 text-center text-[0.6rem] font-semibold text-white">{p.code}</div>
        </div>
      ))}
    </div>
  );
}

export function PositieInvul({ spelers, begin }: Props) {
  const [systeem, setSysteem] = useState<Systeem>("4-3-3");
  const [keuzes, setKeuzes] = useState<Keuzes>(begin);
  const [bewaard, setBewaard] = useState(false);
  const [, start] = useTransition();

  const codes = useMemo(() => codesVan(systeem), [systeem]);

  function huidig(spelerId: string) {
    return keuzes[`${spelerId}:${systeem}`] ?? { positie_1: null, positie_2: null, positie_3: null };
  }

  function kies(spelerId: string, veld: "positie_1" | "positie_2" | "positie_3", waarde: string) {
    const key = `${spelerId}:${systeem}`;
    const nieuw = { ...huidig(spelerId), [veld]: waarde || null };
    setKeuzes((k) => ({ ...k, [key]: nieuw }));
    start(async () => {
      const res = await setVoorkeur(spelerId, systeem, nieuw);
      if (res.ok) {
        setBewaard(true);
        setTimeout(() => setBewaard(false), 1200);
      }
    });
  }

  return (
    <div>
      {/* Tabs */}
      <div className="mb-4 flex items-center gap-2">
        {SYSTEMEN.map((s) => (
          <button
            key={s}
            onClick={() => setSysteem(s)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              s === systeem ? "bg-sparta text-white" : "bg-neutral-200 text-neutral-700"
            }`}
          >
            {s}
          </button>
        ))}
        <span className={`ml-auto text-xs font-medium text-green-600 transition-opacity ${bewaard ? "opacity-100" : "opacity-0"}`}>
          ✓ bewaard
        </span>
      </div>

      <VeldDiagram systeem={systeem} />

      {/* Kaartjes per speler — leest prettig op mobiel */}
      <div className="space-y-2">
        {spelers.map((sp) => {
          const h = huidig(sp.id);
          return (
            <div key={sp.id} className="rounded-xl border border-neutral-200 bg-white p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">
                  {sp.rugnummer ?? "–"}
                </span>
                <span className="font-semibold text-neutral-800">{sp.naam}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["positie_1", "positie_2", "positie_3"] as const).map((veld, i) => (
                  <label key={veld} className="block">
                    <span className="mb-1 block text-[0.7rem] font-medium uppercase tracking-wide text-neutral-400">
                      {["1e keus", "2e keus", "3e keus"][i]}
                    </span>
                    <select
                      value={h[veld] ?? ""}
                      onChange={(e) => kies(sp.id, veld, e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 px-2 py-2 text-base"
                    >
                      <option value="">—</option>
                      {codes.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <h2 className="mb-2 mt-6 text-sm font-semibold text-neutral-700">Legenda</h2>
      <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
        {FORMATIES[systeem].map((p) => (
          <div key={p.code} className="rounded-lg border border-neutral-200 bg-white px-2 py-1">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sparta text-[0.65rem] font-bold text-white">
              {p.nr}
            </span>
            <span className="ml-1 font-semibold">{p.code}</span> — {p.naam}
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-neutral-400">
        Je keuzes worden automatisch bewaard. Alleen jij ziet jouw invulling.
      </p>
    </div>
  );
}
