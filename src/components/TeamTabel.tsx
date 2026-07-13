"use client";

import { useState } from "react";
import Link from "next/link";

export interface TeamRij {
  id: string;
  rugnummer: number | null;
  naam: string;
  status: "fit" | "twijfel" | "geblesseerd";
  positie: string | null;
  opkomst: number | null;
  teLaat: number;
  minuten: number;
  goals: number;
  assists: number;
  geel: number;
  rood: number;
}

type Type = "num" | "str";

const KOLOMMEN: { key: keyof TeamRij; label: string; type: Type; center?: boolean }[] = [
  { key: "rugnummer", label: "#", type: "num" },
  { key: "naam", label: "Naam", type: "str" },
  { key: "positie", label: "Positie", type: "str" },
  { key: "opkomst", label: "Opkomst", type: "num", center: true },
  { key: "teLaat", label: "Te laat", type: "num", center: true },
  { key: "minuten", label: "Speelmin.", type: "num", center: true },
  { key: "goals", label: "Goals", type: "num", center: true },
  { key: "assists", label: "Assists", type: "num", center: true },
  { key: "geel", label: "🟨", type: "num", center: true },
  { key: "rood", label: "🟥", type: "num", center: true },
];

export function TeamTabel({ rows }: { rows: TeamRij[] }) {
  const [sortKey, setSortKey] = useState<keyof TeamRij>("rugnummer");
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  function klikKolom(key: keyof TeamRij, type: Type) {
    if (key === sortKey) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Cijfers: standaard hoog→laag (meeste goals bovenaan). Tekst: a→z.
      setDir(type === "num" ? "desc" : "asc");
    }
  }

  const gesorteerd = [...rows].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    let vgl: number;
    if (typeof va === "number" || typeof vb === "number") {
      vgl = (Number(va ?? -1)) - (Number(vb ?? -1));
    } else {
      vgl = String(va ?? "").localeCompare(String(vb ?? ""));
    }
    return dir === "asc" ? vgl : -vgl;
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
            {KOLOMMEN.map((k) => (
              <th
                key={k.key}
                onClick={() => klikKolom(k.key, k.type)}
                className={`cursor-pointer select-none px-2 py-2.5 hover:text-sparta ${k.center ? "text-center" : ""} ${
                  k.key === "rugnummer"
                    ? "sticky left-0 z-20 w-9 bg-white"
                    : k.key === "naam"
                      ? "sticky left-9 z-20 bg-white"
                      : ""
                }`}
              >
                {k.label}
                {sortKey === k.key && <span className="ml-1">{dir === "asc" ? "▲" : "▼"}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gesorteerd.map((r) => (
            <tr key={r.id} className="border-b border-neutral-100 last:border-0">
              <td className="sticky left-0 z-10 w-9 bg-white px-2 py-2.5 font-bold text-sparta">{r.rugnummer ?? "–"}</td>
              <td className="sticky left-9 z-10 whitespace-nowrap bg-white px-2 py-2.5">
                <span className="mr-1.5" title={r.status}>
                  {r.status === "fit" ? "🟢" : r.status === "twijfel" ? "🟡" : "🔴"}
                </span>
                <Link href={`/staf/speler/${r.id}`} className="font-medium text-neutral-800 hover:text-sparta hover:underline">
                  {r.naam}
                </Link>
              </td>
              <td className="px-2 py-2.5 text-neutral-600">{r.positie ?? "—"}</td>
              <td className="px-2 py-2.5 text-center">{r.opkomst != null ? `${r.opkomst}%` : "—"}</td>
              <td className={`px-2 py-2.5 text-center ${r.teLaat > 0 ? "font-semibold text-sparta" : ""}`}>{r.teLaat}</td>
              <td className="px-2 py-2.5 text-center">{r.minuten}</td>
              <td className="px-2 py-2.5 text-center font-semibold">{r.goals}</td>
              <td className="px-2 py-2.5 text-center font-semibold">{r.assists}</td>
              <td className="px-2 py-2.5 text-center">{r.geel}</td>
              <td className="px-2 py-2.5 text-center">{r.rood}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
