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
  { key: "aanwezig", label: "Aanwezig", licht: "bg-green-100 text-green-800 border-green-300" },
  { key: "afwezig_met", label: "Afgemeld (met bericht)", licht: "bg-amber-100 text-amber-800 border-amber-300" },
  { key: "afwezig_zonder", label: "Niet afgemeld", licht: "bg-red-100 text-red-800 border-red-300" },
  { key: "blessure", label: "Blessure", licht: "bg-purple-100 text-purple-800 border-purple-300" },
  { key: "vakantie", label: "Vakantie", licht: "bg-sky-100 text-sky-800 border-sky-300" },
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
    return STATUSSEN.find((x) => x.key === s)?.licht ?? "bg-white text-neutral-400 border-neutral-300";
  }

  function kies(trainingId: string, spelerId: string, waarde: string) {
    const key = `${trainingId}:${spelerId}`;
    const nieuw = waarde || null;
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
      // Elke ingevulde status telt mee (ook vakantie = afwezig).
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
                    const s = status[`${t.id}:${sp.id}`] ?? "";
                    return (
                      <td key={t.id} className="px-1 py-1 text-center">
                        <select
                          value={s}
                          onChange={(e) => kies(t.id, sp.id, e.target.value)}
                          aria-label="status"
                          className={`w-full min-w-[7rem] rounded-md border px-1 py-1.5 text-xs font-medium ${kleurVan(s || undefined)}`}
                        >
                          <option value="">—</option>
                          {STATUSSEN.map((o) => (
                            <option key={o.key} value={o.key}>{o.label}</option>
                          ))}
                        </select>
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
