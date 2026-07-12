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

function achternaam(naam: string) {
  const delen = naam.trim().split(" ");
  return delen.length > 1 ? delen.slice(1).join(" ") : naam;
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
            {p.speler ? achternaam(p.speler) : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConclusieWeergave({ data, aantalTrainers }: { data: ConclusiePerSysteem; aantalTrainers: number }) {
  const [systeem, setSysteem] = useState<Systeem>("4-3-3");
  const slots = data[systeem];

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
              <th className="px-2 py-2">Keuze</th>
              <th className="px-2 py-2 text-right">Punten</th>
              <th className="px-2 py-2">Alternatieven</th>
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
                <td className="whitespace-nowrap px-2 py-1.5 font-medium">{p.speler ?? "—"}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-neutral-600">{p.punten || ""}</td>
                <td className="px-2 py-1.5 text-xs text-neutral-500">
                  {p.kandidaten.length > 0
                    ? p.kandidaten.map((k) => `${k.naam} (${k.punten})`).join(", ")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
