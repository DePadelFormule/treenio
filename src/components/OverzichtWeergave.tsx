"use client";

import { useState } from "react";
import { SYSTEMEN } from "@/lib/posities";
import type { Systeem } from "@/lib/types/database";

export interface TrainerKeuze {
  trainerNaam: string;
  codes: [string | null, string | null, string | null]; // 1e, 2e, 3e
}

export interface OverzichtRij {
  spelerNaam: string;
  rugnummer: number | null;
  // per systeem de lijst met keuzes van de trainers (alleen trainers die iets kozen)
  perSysteem: Record<Systeem, TrainerKeuze[]>;
}

export function OverzichtWeergave({ rijen }: { rijen: OverzichtRij[] }) {
  const [systeem, setSysteem] = useState<Systeem>("4-3-3");

  return (
    <div>
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
      </div>

      <div className="space-y-2">
        {rijen.map((r) => {
          const keuzes = r.perSysteem[systeem];
          return (
            <div key={r.spelerNaam} className="rounded-xl border border-neutral-200 bg-white p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">
                  {r.rugnummer ?? "–"}
                </span>
                <span className="font-semibold text-neutral-800">{r.spelerNaam}</span>
              </div>

              {keuzes.length === 0 ? (
                <p className="text-sm text-neutral-400">Nog geen keuzes voor dit systeem.</p>
              ) : (
                <ul className="space-y-1">
                  {keuzes.map((k) => (
                    <li key={k.trainerNaam} className="flex items-baseline gap-2 text-sm">
                      <span className="w-28 shrink-0 font-medium text-neutral-600">{k.trainerNaam}</span>
                      <span className="text-neutral-800">
                        {k.codes.map((c, i) => (
                          <span key={i}>
                            {i > 0 && <span className="text-neutral-300"> · </span>}
                            <span className={c ? "" : "text-neutral-300"}>{c ?? "—"}</span>
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
