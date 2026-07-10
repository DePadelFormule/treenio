"use client";

import { useMemo, useState, useTransition } from "react";
import { setPresentie, genereerMaand } from "@/app/staf/trainingen/actions";

interface SpelerKort { id: string; naam: string; rugnummer: number | null; }
interface TrainingKort { id: string; datum: string; }

interface Props {
  spelers: SpelerKort[];
  trainingen: TrainingKort[];
  begin: Record<string, string>; // "trainingId:spelerId" -> status
  startMaand: string; // YYYY-MM
}

const STATUSSEN = [
  { key: "aanwezig", kort: "A", label: "Aanwezig", kleur: "bg-green-600 text-white" },
  { key: "afwezig_met", kort: "M", label: "Afgemeld (met bericht)", kleur: "bg-amber-500 text-white" },
  { key: "afwezig_zonder", kort: "Z", label: "Niet afgemeld", kleur: "bg-red-600 text-white" },
  { key: "blessure", kort: "B", label: "Blessure", kleur: "bg-purple-600 text-white" },
] as const;

const MAANDEN = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];
const DAGEN = ["zo","ma","di","wo","do","vr","za"];

function schuifMaand(ym: string, delta: number) {
  const [j, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(j, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function maandLabel(ym: string) {
  const [j, m] = ym.split("-").map(Number);
  return `${MAANDEN[m - 1]} ${j}`;
}
function dagLabel(datum: string) {
  const d = new Date(datum + "T00:00:00Z");
  return `${DAGEN[d.getUTCDay()]} ${d.getUTCDate()}-${d.getUTCMonth() + 1}`;
}

export function PresentieRooster({ spelers, trainingen, begin, startMaand }: Props) {
  const [maand, setMaand] = useState(startMaand);
  const [actief, setActief] = useState<string>("aanwezig");
  const [status, setStatus] = useState<Record<string, string>>(begin);
  const [, start] = useTransition();

  function gaMaand(delta: number) {
    const nieuw = schuifMaand(maand, delta);
    setMaand(nieuw);
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("maand", nieuw);
      window.history.replaceState(null, "", u.toString());
    } catch {}
  }

  const trainingenMaand = useMemo(
    () => trainingen.filter((t) => t.datum.startsWith(maand)).sort((a, b) => a.datum.localeCompare(b.datum)),
    [trainingen, maand],
  );

  function kleurVan(s: string | undefined) {
    return STATUSSEN.find((x) => x.key === s)?.kleur ?? "";
  }
  function kortVan(s: string | undefined) {
    return STATUSSEN.find((x) => x.key === s)?.kort ?? "";
  }

  function tik(trainingId: string, spelerId: string) {
    const key = `${trainingId}:${spelerId}`;
    const nieuw = status[key] === actief ? null : actief;
    setStatus((s) => {
      const c = { ...s };
      if (nieuw) c[key] = nieuw; else delete c[key];
      return c;
    });
    start(() => { void setPresentie(trainingId, spelerId, nieuw); });
  }

  function maandPct(spelerId: string) {
    let geregistreerd = 0, aanwezig = 0;
    for (const t of trainingenMaand) {
      const s = status[`${t.id}:${spelerId}`];
      if (s) { geregistreerd++; if (s === "aanwezig") aanwezig++; }
    }
    if (geregistreerd === 0) return null;
    return Math.round((100 * aanwezig) / geregistreerd);
  }

  return (
    <div>
      {/* Maand-navigatie */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={() => gaMaand(-1)} className="rounded-lg bg-neutral-200 px-3 py-1.5 text-sm font-semibold">◀</button>
        <span className="min-w-[9rem] text-center text-lg font-bold text-sparta">{maandLabel(maand)}</span>
        <button onClick={() => gaMaand(1)} className="rounded-lg bg-neutral-200 px-3 py-1.5 text-sm font-semibold">▶</button>
        <form action={genereerMaand} className="ml-auto">
          <input type="hidden" name="maand" value={maand} />
          <button type="submit" className="rounded-lg border border-sparta px-3 py-1.5 text-sm font-semibold text-sparta hover:bg-sparta hover:text-white">
            + Genereer di/do trainingen
          </button>
        </form>
      </div>

      {/* Verf-modus: kies een status */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-neutral-100 p-2">
        <span className="text-xs font-semibold text-neutral-500">Kies status, tik dan de vakjes:</span>
        {STATUSSEN.map((s) => (
          <button
            key={s.key}
            onClick={() => setActief(s.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${actief === s.key ? s.kleur : "bg-white text-neutral-600 border border-neutral-300"}`}
          >
            {s.kort} · {s.label}
          </button>
        ))}
      </div>

      {trainingenMaand.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Nog geen trainingen in {maandLabel(maand)}. Klik op “Genereer di/do trainingen”.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-xs font-semibold text-neutral-500">Speler</th>
                {trainingenMaand.map((t) => (
                  <th key={t.id} className="px-1 py-2 text-center text-[0.7rem] font-medium text-neutral-500 whitespace-nowrap">{dagLabel(t.datum)}</th>
                ))}
                <th className="px-2 py-2 text-center text-[0.7rem] font-semibold text-sparta">%</th>
              </tr>
            </thead>
            <tbody>
              {spelers.map((sp) => (
                <tr key={sp.id} className="border-b border-neutral-100 last:border-0">
                  <td className="sticky left-0 z-10 bg-white px-3 py-1.5 whitespace-nowrap">
                    <span className="font-semibold text-neutral-400">{sp.rugnummer ?? "–"}</span>
                    <span className="ml-2 font-medium text-neutral-800">{sp.naam}</span>
                  </td>
                  {trainingenMaand.map((t) => {
                    const s = status[`${t.id}:${sp.id}`];
                    return (
                      <td key={t.id} className="px-1 py-1 text-center">
                        <button
                          onClick={() => tik(t.id, sp.id)}
                          className={`h-8 w-8 rounded-md text-xs font-bold ${s ? kleurVan(s) : "border border-neutral-300 bg-neutral-50 text-transparent"}`}
                          aria-label="status"
                        >{kortVan(s) || "·"}</button>
                      </td>
                    );
                  })}
                  <td className="px-2 py-1 text-center font-semibold tabular-nums">
                    {maandPct(sp.id) != null ? `${maandPct(sp.id)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-2 text-xs text-neutral-400">
        Tik een vakje om de gekozen status te zetten; tik nog eens om te wissen. De %-kolom is de opkomst in deze maand.
      </p>
    </div>
  );
}
