"use client";

import { useState, useTransition } from "react";
import { setWedstrijdAfmelding } from "@/app/staf/wedstrijd/[id]/opstelling/actions";

interface SpelerKort { id: string; naam: string; rugnummer: number | null }

interface Props {
  wedstrijdId: string;
  spelers: SpelerKort[]; // spelers buiten de selectie (niet in basis of bank)
  begin: Record<string, string>; // speler_id -> afmeld_status
}

const OPTIES = [
  { key: "nvt", kort: "—", label: "Nog onbekend" },
  { key: "op_tijd", kort: "Op tijd", label: "Op tijd afgemeld (≥24 uur vooraf)" },
  { key: "kort_dag", kort: "Kort dag", label: "Kort dag afgemeld (12–24 uur vooraf)" },
  { key: "te_laat", kort: "Te laat", label: "Te laat afgemeld (<12 uur vooraf)" },
  { key: "niet_afgemeld", kort: "No-show", label: "Niet afgemeld (niet komen opdagen)" },
] as const;

export function WedstrijdAfmeldingen({ wedstrijdId, spelers, begin }: Props) {
  const [status, setStatus] = useState<Record<string, string>>(begin);
  const [, start] = useTransition();

  if (spelers.length === 0) return null;

  function kies(spelerId: string, waarde: string) {
    setStatus((s) => ({ ...s, [spelerId]: waarde }));
    start(() => { void setWedstrijdAfmelding(wedstrijdId, spelerId, waarde); });
  }

  return (
    <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="font-semibold text-neutral-800">Afmeldingen &amp; afwezig</h2>
      <p className="mb-3 mt-0.5 text-xs text-neutral-400">
        Spelers die niet in de basis of op de bank staan. Leg vast hoe (op tijd) ze zich hebben
        afgemeld; dit telt mee in de cijfers op de spelerskaart.
      </p>
      <ul className="divide-y divide-neutral-100">
        {spelers.map((sp) => {
          const huidig = status[sp.id] ?? "nvt";
          return (
            <li key={sp.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="min-w-[10rem] text-sm">
                <span className="font-semibold text-neutral-400">{sp.rugnummer ?? "–"}</span>
                <span className="ml-2 font-medium text-neutral-800">{sp.naam}</span>
              </span>
              <span className="flex flex-wrap gap-1.5">
                {OPTIES.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    title={o.label}
                    onClick={() => kies(sp.id, o.key)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                      huidig === o.key
                        ? o.key === "niet_afgemeld"
                          ? "bg-red-600 text-white"
                          : o.key === "te_laat"
                            ? "bg-orange-500 text-white"
                            : o.key === "nvt"
                              ? "bg-neutral-500 text-white"
                              : "bg-sparta text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {o.kort}
                  </button>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
