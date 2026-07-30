"use client";

import { useState } from "react";
import { FORMATIES, SYSTEMEN } from "@/lib/posities";
import type { Systeem } from "@/lib/types/database";

export interface SlotConclusie {
  nr: number;
  code: string;
  naam: string;
  x: number;
  y: number;
  speler: string | null;
  rugnummer: number | null;
  punten: number;
  kandidaten: { naam: string; punten: number }[]; // andere spelers op deze plek
}

export type ConclusiePerSysteem = Record<Systeem, SlotConclusie[]>;

// Stemmen per speler: hoe vaak elke positie is gekozen, ongeacht 1e/2e/3e keus.
export interface StemRij {
  speler: string;
  rugnummer: number | null;
  posities: { code: string; keer: number }[];
}
export type StemmenPerSysteem = Record<Systeem, StemRij[]>;

function voornaam(naam: string) {
  return naam.trim().split(" ")[0] || naam;
}

function Veld({ slots }: { slots: SlotConclusie[] }) {
  return (
    <div
      className="relative mx-auto mb-5 w-full max-w-sm overflow-hidden rounded-2xl border-2 border-white/40 bg-gradient-to-b from-green-700 to-green-800 print:border-neutral-400"
      style={{ aspectRatio: "3/4" }}
    >
      <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-white/30" />
      <div className="pointer-events-none absolute left-3 right-3 top-[42%] border-t-2 border-white/25" />
      <div className="pointer-events-none absolute left-1/2 top-[42%] h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25" />
      <div className="pointer-events-none absolute bottom-3 left-1/4 right-1/4 h-10 border-2 border-white/25" />
      {slots.map((p) => (
        <div key={p.code} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-sparta text-sm font-bold text-white shadow ring-2 ring-white/60">
            {p.nr}
          </div>
          <div className="mt-0.5 max-w-[5.5rem] truncate text-[0.62rem] font-semibold text-white drop-shadow">
            {p.speler ? voornaam(p.speler) : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConclusieWeergave({
  data,
  stemmen,
  aantalTrainers,
}: {
  data: ConclusiePerSysteem;
  stemmen: StemmenPerSysteem;
  aantalTrainers: number;
}) {
  const [systeem, setSysteem] = useState<Systeem>("4-3-3");
  const slots = data[systeem];
  const stemRijen = stemmen[systeem];

  return (
    <div>
      {/* Tabs + print — verborgen bij afdrukken */}
      <div className="mb-4 flex items-center gap-2 print:hidden">
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
        <button
          onClick={() => window.print()}
          className="ml-auto rounded-lg border border-sparta px-3 py-2 text-sm font-semibold text-sparta hover:bg-sparta hover:text-white"
        >
          🖨 Uitdraai maken
        </button>
      </div>

      {/* Afdruk-titel — alleen zichtbaar op papier */}
      <h2 className="mb-2 hidden text-lg font-bold text-sparta print:block">
        Ideaal elftal {systeem} · Nivo Sparta JO17-2
      </h2>

      <p className="mb-3 text-xs text-neutral-500">
        Samengesteld uit de voorkeuren van {aantalTrainers} {aantalTrainers === 1 ? "trainer" : "trainers"}
        {" "}(1e keus = 3 punten, 2e = 2, 3e = 1).
      </p>

      <Veld slots={slots} />

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-2">Positie</th>
              <th className="px-2 py-2">1e keuze</th>
              <th className="px-2 py-2">2e keuze</th>
              <th className="px-2 py-2">3e keuze</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((p) => (
              <tr key={p.code} className="border-b border-neutral-100 last:border-0 align-top">
                <td className="whitespace-nowrap px-3 py-1.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sparta text-[0.65rem] font-bold text-white">
                    {p.nr}
                  </span>
                  <span className="ml-1.5 font-semibold">{p.code}</span>
                  <span className="ml-1 text-xs text-neutral-400">{p.naam}</span>
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 font-medium">
                  {p.speler ?? "—"}
                  {p.speler && <span className="ml-1 text-xs font-normal text-neutral-400">{p.punten} pt</span>}
                </td>
                {[0, 1].map((i) => {
                  const k = p.kandidaten[i];
                  return (
                    <td key={i} className="whitespace-nowrap px-2 py-1.5 text-neutral-600">
                      {k ? (
                        <>
                          {k.naam}
                          <span className="ml-1 text-xs text-neutral-400">{k.punten} pt</span>
                        </>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-neutral-400">
        2e en 3e keuze: de beste overige kandidaten voor die positie op punten. Een speler kan bij
        meerdere posities als kandidaat staan; in het elftal zelf staat iedereen maar één keer.
      </p>

      {/* Stemmen per speler: ruwe telling, ongeacht 1e/2e/3e keus */}
      {stemRijen.length > 0 && (
        <section className="mt-6 print:break-inside-avoid">
          <h3 className="mb-1 font-semibold text-neutral-800">Stemmen per speler</h3>
          <p className="mb-2 text-xs text-neutral-500">
            Hoe vaak trainers een positie voor de speler kozen, ongeacht of het de 1e, 2e of 3e keus was.
          </p>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                  <th className="px-3 py-2">Speler</th>
                  <th className="px-2 py-2">Posities (aantal stemmen)</th>
                </tr>
              </thead>
              <tbody>
                {stemRijen.map((r) => (
                  <tr key={r.speler} className="border-b border-neutral-100 last:border-0 align-top">
                    <td className="whitespace-nowrap px-3 py-1.5">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 text-[0.65rem] font-bold text-neutral-500">
                        {r.rugnummer ?? "–"}
                      </span>
                      <span className="ml-1.5 font-medium">{r.speler}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex flex-wrap gap-1">
                        {r.posities.map((p) => (
                          <span
                            key={p.code}
                            className="inline-flex items-baseline gap-1 rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-700"
                          >
                            <span className="font-semibold">{p.code}</span>
                            <span className="text-xs text-neutral-500">{p.keer}×</span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
