"use client";

import { useMemo, useState, useTransition } from "react";
import { setPresentie, genereerMaand, zetIedereenAanwezig, toggleMateriaal } from "@/app/staf/trainingen/actions";

interface SpelerKort { id: string; naam: string; rugnummer: number | null; }
interface TrainingKort { id: string; datum: string; }

interface Props {
  spelers: SpelerKort[];
  trainingen: TrainingKort[];
  begin: Record<string, string>; // "trainingId:spelerId" -> status
  beginMateriaal?: Record<string, boolean>; // "trainingId:spelerId" -> ontbreekt
  startMaand: string; // YYYY-MM
  /** Vandaag als YYYY-MM-DD, voor de standaardkeuze bij "Iedereen aanwezig". */
  vandaag: string;
  onVerwijder: (formData: FormData) => void | Promise<void>;
}

const STATUSSEN = [
  { key: "aanwezig", kort: "A", label: "Aanwezig", licht: "bg-green-100 text-green-800 border-green-300", vol: "bg-green-600 text-white" },
  { key: "te_laat", kort: "T", label: "Te laat", licht: "bg-orange-100 text-orange-800 border-orange-300", vol: "bg-orange-500 text-white" },
  { key: "te_laat_met", kort: "TR", label: "Te laat (met reden)", licht: "bg-teal-100 text-teal-800 border-teal-300", vol: "bg-teal-600 text-white" },
  { key: "afwezig_met", kort: "M", label: "Afgemeld (met bericht)", licht: "bg-amber-100 text-amber-800 border-amber-300", vol: "bg-amber-500 text-white" },
  { key: "afwezig_zonder", kort: "Z", label: "Niet afgemeld", licht: "bg-red-100 text-red-800 border-red-300", vol: "bg-red-600 text-white" },
  { key: "blessure", kort: "B", label: "Blessure", licht: "bg-purple-100 text-purple-800 border-purple-300", vol: "bg-purple-600 text-white" },
  { key: "vakantie", kort: "V", label: "Vakantie", licht: "bg-sky-100 text-sky-800 border-sky-300", vol: "bg-sky-600 text-white" },
] as const;

// Seizoen 26-27 start in augustus; eerdere maanden tonen we niet.
const MIN_MAAND = "2026-08";
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

export function PresentieRooster({ spelers, trainingen, begin, beginMateriaal, startMaand, vandaag, onVerwijder }: Props) {
  const [maand, setMaand] = useState(startMaand < MIN_MAAND ? MIN_MAAND : startMaand);
  const [status, setStatus] = useState<Record<string, string>>(begin);
  const [materiaal, setMateriaal] = useState<Record<string, boolean>>(beginMateriaal ?? {});
  const [open, setOpen] = useState<{ t: string; s: string } | null>(null);
  const [allenOpen, setAllenOpen] = useState(false);
  const [allenVanaf, setAllenVanaf] = useState("");
  const [allenBezig, setAllenBezig] = useState(false);
  const [allenMelding, setAllenMelding] = useState<string | null>(null);
  const [, start] = useTransition();

  /** Zet alle lege vakjes vanaf de gekozen training op aanwezig. */
  async function iedereenAanwezig() {
    if (!allenVanaf) return;
    setAllenBezig(true);
    const res = await zetIedereenAanwezig(maand, allenVanaf);
    setAllenBezig(false);
    if (!res.ok) { setAllenMelding("Dat is niet gelukt."); return; }
    setStatus((s) => {
      const c = { ...s };
      for (const g of res.gezet) c[`${g.training_id}:${g.speler_id}`] = "aanwezig";
      return c;
    });
    setAllenOpen(false);
    setAllenMelding(res.gezet.length === 0 ? "Alles was al ingevuld." : `${res.gezet.length} vakjes op aanwezig gezet.`);
    setTimeout(() => setAllenMelding(null), 4000);
  }

  function gaMaand(delta: number) {
    const nieuw = schuifMaand(maand, delta);
    if (nieuw < MIN_MAAND) return;
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
    return STATUSSEN.find((x) => x.key === s)?.licht ?? "border-neutral-300 bg-neutral-50 text-neutral-300";
  }
  function kortVan(s: string | undefined) {
    return STATUSSEN.find((x) => x.key === s)?.kort ?? "·";
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

  function wisselMateriaal(trainingId: string, spelerId: string) {
    const key = `${trainingId}:${spelerId}`;
    const nieuw = !materiaal[key];
    setMateriaal((m) => ({ ...m, [key]: nieuw }));
    start(() => { void toggleMateriaal(trainingId, spelerId, nieuw); });
  }

  function maandPct(spelerId: string) {
    let geregistreerd = 0, aanwezig = 0;
    for (const t of trainingenMaand) {
      const s = status[`${t.id}:${spelerId}`];
      // Elke ingevulde status telt mee (ook vakantie = afwezig).
      // Te laat (met of zonder reden) telt als aanwezig: de speler was er.
      if (s) { geregistreerd++; if (s === "aanwezig" || s === "te_laat" || s === "te_laat_met") aanwezig++; }
    }
    if (geregistreerd === 0) return null;
    return Math.round((100 * aanwezig) / geregistreerd);
  }

  return (
    <div>
      {/* Maand-navigatie */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={() => gaMaand(-1)} disabled={maand <= MIN_MAAND} className="rounded-lg bg-neutral-200 px-3 py-1.5 text-sm font-semibold disabled:opacity-30">◀</button>
        <span className="min-w-[9rem] text-center text-lg font-bold text-sparta">{maandLabel(maand)}</span>
        <button onClick={() => gaMaand(1)} className="rounded-lg bg-neutral-200 px-3 py-1.5 text-sm font-semibold">▶</button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {trainingenMaand.length > 0 && (
            <button
              type="button"
              onClick={() => {
                // Standaard: de eerste training vanaf vandaag, anders de laatste van de maand.
                const eerste = trainingenMaand.find((t) => t.datum >= vandaag) ?? trainingenMaand[trainingenMaand.length - 1];
                setAllenVanaf(eerste.datum);
                setAllenMelding(null);
                setAllenOpen(true);
              }}
              className="rounded-lg border border-green-600 px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-600 hover:text-white"
            >
              ✓ Iedereen aanwezig
            </button>
          )}
          <form action={genereerMaand}>
            <input type="hidden" name="maand" value={maand} />
            <button type="submit" className="rounded-lg border border-sparta px-3 py-1.5 text-sm font-semibold text-sparta hover:bg-sparta hover:text-white">
              + Genereer di/do trainingen
            </button>
          </form>
        </div>
      </div>
      {allenMelding && <p className="mb-3 text-sm text-green-700">{allenMelding}</p>}

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
                  <th key={t.id} className="px-1 py-2 text-center text-[0.7rem] font-medium text-neutral-500 whitespace-nowrap">
                    <div>{dagLabel(t.datum)}</div>
                    <form action={onVerwijder} onSubmit={(e) => { if (!confirm(`Training van ${dagLabel(t.datum)} verwijderen?`)) e.preventDefault(); }}>
                      <input type="hidden" name="id" value={t.id} />
                      <button type="submit" className="p-1 text-neutral-300 hover:text-red-600" aria-label="training verwijderen">✕</button>
                    </form>
                  </th>
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
                    const s = status[`${t.id}:${sp.id}`] || undefined;
                    return (
                      <td key={t.id} className="px-0.5 py-1 text-center">
                        <button
                          onClick={() => setOpen({ t: t.id, s: sp.id })}
                          className={`relative h-9 w-9 rounded-md border text-sm font-bold ${kleurVan(s)}`}
                          aria-label="status kiezen"
                        >
                          {kortVan(s)}
                          {materiaal[`${t.id}:${sp.id}`] && (
                            <span
                              className="absolute -right-1 -top-1 h-3 w-3 rounded-full border border-white bg-red-500"
                              title="Materiaal niet in orde"
                            />
                          )}
                        </button>
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

      {/* Legenda */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-500">
        {STATUSSEN.map((o) => (
          <span key={o.key} className={`rounded px-2 py-0.5 ${o.licht} border`}>{o.kort} = {o.label}</span>
        ))}
      </div>

      <p className="mt-2 text-xs text-neutral-400">
        Tik een vakje → kies onderin de status. De %-kolom is de opkomst in deze maand.
        <span className="ml-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500 align-middle" /> = materiaal (scheenbeschermers/bidon) niet in orde.
      </p>

      {/* Iedereen aanwezig vanaf een training */}
      {allenOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setAllenOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-neutral-200 bg-white p-4 shadow-2xl">
            <div className="mx-auto max-w-md">
              <p className="mb-1 text-sm font-semibold text-neutral-700">Iedereen aanwezig zetten</p>
              <p className="mb-3 text-xs text-neutral-500">
                Alle spelers krijgen “aanwezig” voor deze training en alle latere trainingen in {maandLabel(maand)}.
                Vakjes die al ingevuld zijn blijven staan; daarna hoef je alleen de afmeldingen nog aan te tikken.
              </p>
              <label className="mb-3 block text-sm">
                <span className="mb-1 block text-xs font-semibold text-neutral-500">Vanaf training</span>
                <select value={allenVanaf} onChange={(e) => setAllenVanaf(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm">
                  {trainingenMaand.map((t) => (
                    <option key={t.id} value={t.datum}>{dagLabel(t.datum)}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setAllenOpen(false)} disabled={allenBezig} className="rounded-lg bg-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700">Annuleren</button>
                <button onClick={iedereenAanwezig} disabled={allenBezig || !allenVanaf} className="rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
                  {allenBezig ? "Bezig…" : "Zet op aanwezig"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Keuzemenu onderin */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-neutral-200 bg-white p-4 shadow-2xl">
            <div className="mx-auto max-w-md">
              <p className="mb-3 text-sm font-semibold text-neutral-700">
                {spelers.find((x) => x.id === open.s)?.naam}
                <span className="ml-2 text-neutral-400">
                  · {(() => { const tr = trainingenMaand.find((x) => x.id === open.t); return tr ? dagLabel(tr.datum) : ""; })()}
                </span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {STATUSSEN.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => { kies(open.t, open.s, o.key); setOpen(null); }}
                    className={`rounded-lg px-4 py-3 text-sm font-semibold ${o.vol}`}
                  >
                    {o.label}
                  </button>
                ))}
                <button
                  onClick={() => { kies(open.t, open.s, ""); setOpen(null); }}
                  className="rounded-lg bg-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700"
                >
                  Wissen
                </button>
              </div>
              <label className="mt-3 flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={materiaal[`${open.t}:${open.s}`] ?? false}
                  onChange={() => wisselMateriaal(open.t, open.s)}
                  className="h-4 w-4"
                />
                Scheenbeschermers/bidon niet in orde
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
