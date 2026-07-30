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

interface Props {
  rijen: OverzichtRij[];
  ingevuld: string[]; // namen van trainers die (iets) hebben ingevuld
  nietIngevuld: string[]; // namen van trainers zonder enige invulling
}

// Telt de keuzes van alle trainers voor één speler op (1e = 3, 2e = 2, 3e = 1)
// en bepaalt hoe eensgezind de trainers zijn over de 1e keus.
function vatSamen(keuzes: TrainerKeuze[]) {
  const agg = new Map<string, { punten: number; eerste: number }>();
  let metEerste = 0;
  for (const k of keuzes) {
    if (k.codes[0]) metEerste++;
    k.codes.forEach((code, i) => {
      if (!code) return;
      const e = agg.get(code) ?? { punten: 0, eerste: 0 };
      e.punten += 3 - i;
      if (i === 0) e.eerste++;
      agg.set(code, e);
    });
  }
  const lijst = [...agg.entries()]
    .map(([code, v]) => ({ code, ...v }))
    .sort((a, b) => b.punten - a.punten || b.eerste - a.eerste || a.code.localeCompare(b.code));

  // Badge op basis van de 1e keuzes: unaniem → groen, meerderheid → geel, anders verdeeld.
  let badge: { tekst: string; stijl: string } | null = null;
  if (metEerste >= 2) {
    const top = lijst.reduce((a, b) => (b.eerste > a.eerste ? b : a), lijst[0]);
    if (top.eerste === metEerste) {
      badge = { tekst: `Unaniem: ${top.code}`, stijl: "bg-green-100 text-green-800" };
    } else if (top.eerste * 2 > metEerste) {
      badge = { tekst: `${top.eerste} van ${metEerste}: ${top.code}`, stijl: "bg-amber-100 text-amber-800" };
    } else {
      badge = { tekst: "Verdeeld", stijl: "bg-neutral-200 text-neutral-600" };
    }
  }

  return { lijst, badge };
}

export function OverzichtWeergave({ rijen, ingevuld, nietIngevuld }: Props) {
  const [systeem, setSysteem] = useState<Systeem>("4-3-3");

  return (
    <div>
      {/* Wie heeft er al ingevuld? */}
      <div className="mb-4 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm">
        <span className="font-semibold text-neutral-700">
          {ingevuld.length} van {ingevuld.length + nietIngevuld.length} trainers ingevuld
        </span>
        <span className="text-neutral-500"> · {ingevuld.join(", ")}</span>
        {nietIngevuld.length > 0 && (
          <span className="text-neutral-400"> · nog niet: {nietIngevuld.join(", ")}</span>
        )}
      </div>

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
          const { lijst, badge } = vatSamen(keuzes);
          return (
            <div key={r.spelerNaam} className="rounded-xl border border-neutral-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">
                  {r.rugnummer ?? "–"}
                </span>
                <span className="font-semibold text-neutral-800">{r.spelerNaam}</span>
                {badge && (
                  <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.stijl}`}>
                    {badge.tekst}
                  </span>
                )}
              </div>

              {keuzes.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-400">Nog geen keuzes voor dit systeem.</p>
              ) : (
                <>
                  {/* Opgetelde uitkomst: sterkste positie eerst */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {lijst.slice(0, 4).map((p, i) => (
                      <span
                        key={p.code}
                        className={`inline-flex items-baseline gap-1 rounded-lg px-2 py-1 text-sm ${
                          i === 0
                            ? "bg-sparta font-bold text-white"
                            : "bg-neutral-100 font-medium text-neutral-700"
                        }`}
                      >
                        {p.code}
                        <span className={`text-xs font-normal ${i === 0 ? "text-white/80" : "text-neutral-400"}`}>
                          {p.punten} pt
                        </span>
                      </span>
                    ))}
                  </div>

                  {/* Detail per trainer — inklapbaar zodat het overzicht rustig blijft */}
                  <details className="mt-2">
                    <summary className="cursor-pointer select-none text-xs font-medium text-neutral-400 hover:text-sparta">
                      Per trainer ({keuzes.length})
                    </summary>
                    <ul className="mt-1.5 space-y-1">
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
                  </details>
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-neutral-400">
        Punten: 1e keus = 3, 2e = 2, 3e = 1, opgeteld over alle trainers. De donkere chip is de
        sterkste positie. De badge kijkt alleen naar de 1e keuzes.
      </p>
    </div>
  );
}
