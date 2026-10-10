"use client";

import { useState } from "react";
import Link from "next/link";

export interface FaseRij {
  id: string;
  naam: string;
  rugnummer: number | null;
  opkomst: number | null;
  opkomstGec: number | null;
  teLaat: number;
  materiaalMis: number;
  wedstrijden: number;
  basis: number;
  ingevallen: number;
  gewisseldUit: number;
  bank90: number;
  minuten: number;
  goals: number;
  assists: number;
  geel: number;
  rood: number;
  topPositie: string | null;
  topAantal: number;
  doelenOpen: number;
  doelenBezig: number;
  doelenBehaald: number;
  // Verschil t.o.v. de vergelijkingsfase; undefined = geen vergelijking gekozen.
  dOpkomst?: number | null;
  dOpkomstGec?: number | null;
  dTeLaat?: number | null;
  dMinuten?: number | null;
  dGoals?: number | null;
  dAssists?: number | null;
}

type Type = "num" | "str";
type Kolom = keyof FaseRij;

const KOLOMMEN: { key: Kolom; label: string; type: Type; delta?: keyof FaseRij }[] = [
  { key: "rugnummer", label: "#", type: "num" },
  { key: "naam", label: "Naam", type: "str" },
  { key: "opkomst", label: "Opkomst", type: "num", delta: "dOpkomst" },
  { key: "opkomstGec", label: "Opk. gec.", type: "num", delta: "dOpkomstGec" },
  { key: "teLaat", label: "Te laat", type: "num", delta: "dTeLaat" },
  { key: "materiaalMis", label: "Mat. mis", type: "num" },
  { key: "wedstrijden", label: "Wedstr.", type: "num" },
  { key: "basis", label: "Basis", type: "num" },
  { key: "ingevallen", label: "Inval", type: "num" },
  { key: "gewisseldUit", label: "Gewiss.", type: "num" },
  { key: "bank90", label: "Bank (90)", type: "num" },
  { key: "minuten", label: "Minuten", type: "num", delta: "dMinuten" },
  { key: "goals", label: "Goals", type: "num", delta: "dGoals" },
  { key: "assists", label: "Assists", type: "num", delta: "dAssists" },
  { key: "geel", label: "🟨", type: "num" },
  { key: "rood", label: "🟥", type: "num" },
];

function deltaBadge(d: number | null | undefined, eenheid = "") {
  if (d === undefined || d === null || d === 0) return null;
  const positief = d > 0;
  return (
    <span className={`ml-1 text-xs font-semibold ${positief ? "text-green-600" : "text-red-600"}`}>
      ({positief ? "+" : ""}{d}{eenheid})
    </span>
  );
}

export function FaseoverzichtTabel({ rows }: { rows: FaseRij[] }) {
  const [sortKey, setSortKey] = useState<Kolom>("rugnummer");
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  function klikKolom(key: Kolom, type: Type) {
    if (key === sortKey) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Cijfers: hoog→laag eerst (bijv. meeste keren te laat bovenaan).
      setDir(type === "num" ? "desc" : "asc");
    }
  }

  const gesorteerd = [...rows].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    let vgl: number;
    if (typeof va === "number" || typeof vb === "number") {
      vgl = Number(va ?? -1) - Number(vb ?? -1);
    } else {
      vgl = String(va ?? "").localeCompare(String(vb ?? ""));
    }
    return dir === "asc" ? vgl : -vgl;
  });

  const thCls = "px-2 py-2 text-left font-semibold text-neutral-600 whitespace-nowrap cursor-pointer select-none hover:text-sparta";
  const tdCls = "px-2 py-2 whitespace-nowrap";

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            {KOLOMMEN.map((k) => (
              <th key={k.key} onClick={() => klikKolom(k.key, k.type)} className={thCls}>
                {k.label}
                {sortKey === k.key && <span className="ml-1">{dir === "asc" ? "▲" : "▼"}</span>}
              </th>
            ))}
            <th className="px-2 py-2 text-left font-semibold text-neutral-600 whitespace-nowrap">Vaste positie</th>
            <th className="px-2 py-2 text-left font-semibold text-neutral-600 whitespace-nowrap">Doelen (open/bezig/behaald)</th>
          </tr>
        </thead>
        <tbody>
          {gesorteerd.map((r) => (
            <tr key={r.id} className="border-b border-neutral-100 last:border-0">
              <td className={tdCls}>{r.rugnummer ?? "–"}</td>
              <td className={tdCls}>
                <Link href={`/staf/speler/${r.id}`} className="font-medium text-neutral-800 hover:text-sparta hover:underline">
                  {r.naam}
                </Link>
              </td>
              <td className={tdCls}>{r.opkomst != null ? `${r.opkomst}%` : "—"}{deltaBadge(r.dOpkomst, "%")}</td>
              <td className={`${tdCls} text-neutral-500`}>{r.opkomstGec != null ? `${r.opkomstGec}%` : "—"}{deltaBadge(r.dOpkomstGec, "%")}</td>
              <td className={`${tdCls} ${r.teLaat > 0 ? "font-semibold text-sparta" : ""}`}>{r.teLaat}{deltaBadge(r.dTeLaat)}</td>
              <td className={tdCls}>{r.materiaalMis}</td>
              <td className={tdCls}>{r.wedstrijden}</td>
              <td className={tdCls}>{r.basis}</td>
              <td className={tdCls}>{r.ingevallen}</td>
              <td className={tdCls}>{r.gewisseldUit}</td>
              <td className={tdCls}>{r.bank90}</td>
              <td className={tdCls}>{r.minuten}{deltaBadge(r.dMinuten)}</td>
              <td className={`${tdCls} font-semibold`}>{r.goals}{deltaBadge(r.dGoals)}</td>
              <td className={`${tdCls} font-semibold`}>{r.assists}{deltaBadge(r.dAssists)}</td>
              <td className={tdCls}>{r.geel}</td>
              <td className={tdCls}>{r.rood}</td>
              <td className={tdCls}>{r.topPositie ? `${r.topPositie} (${r.topAantal}x)` : "—"}</td>
              <td className={`${tdCls} text-neutral-500`}>{r.doelenOpen}/{r.doelenBezig}/{r.doelenBehaald}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
