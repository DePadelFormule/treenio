"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bewaarLesWijziging } from "@/app/staf/lesgenerator/actions";
import type { Les, LesBlok } from "@/lib/lesgenerator/schema";

// Regels <-> array, voor de tekstveldjes die één item per regel bewaren.
function regels(tekst: string): string[] {
  return tekst.split("\n").map((r) => r.trim()).filter(Boolean);
}
function naarRegels(items: string[]): string {
  return items.join("\n");
}

const LEEG_BLOK: LesBlok = {
  naam: "", type: "oefenvorm", duur_minuten: 0, doel: "", organisatie: "",
  coachpunten: [], progressie_makkelijker: "", progressie_moeilijker: "",
};

const inputCls = "w-full rounded-lg border border-neutral-300 px-3 py-2 text-base";
const labelCls = "mb-1 block text-sm font-medium text-neutral-700";

interface Props {
  lesId: string;
  begin: Les;
  beginDatum: string | null;
}

export function LesBewerkFormulier({ lesId, begin, beginDatum }: Props) {
  const router = useRouter();
  const [titel, setTitel] = useState(begin.titel);
  const [onderwerp, setOnderwerp] = useState(begin.onderwerp);
  const [niveau, setNiveau] = useState(begin.niveau);
  const [aantalSpelers, setAantalSpelers] = useState(begin.aantal_spelers);
  const [duur, setDuur] = useState(begin.totale_duur_minuten);
  const [materiaal, setMateriaal] = useState(begin.materiaal);
  const [datum, setDatum] = useState(beginDatum ?? "");
  const [focuspunten, setFocuspunten] = useState(naarRegels(begin.leeskaart.focuspunten));
  const [fouten, setFouten] = useState(naarRegels(begin.leeskaart.veelgemaakte_fouten));
  const [huiswerk, setHuiswerk] = useState(naarRegels(begin.leeskaart.huiswerk));
  const [blokken, setBlokken] = useState<LesBlok[]>(begin.blokken.length > 0 ? begin.blokken : [{ ...LEEG_BLOK }]);
  const [status, setStatus] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [bezig, start] = useTransition();

  function zetBlok(i: number, deel: Partial<LesBlok>) {
    setStatus(null);
    setBlokken((b) => b.map((blok, j) => (j === i ? { ...blok, ...deel } : blok)));
  }
  function voegBlokToe() {
    setBlokken((b) => [...b, { ...LEEG_BLOK }]);
  }
  function verwijderBlok(i: number) {
    setBlokken((b) => b.filter((_, j) => j !== i));
  }

  function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    start(async () => {
      const res = await bewaarLesWijziging(lesId, {
        titel,
        sport: begin.sport,
        onderwerp,
        fase: begin.fase,
        niveau,
        totale_duur_minuten: duur,
        aantal_spelers: aantalSpelers,
        materiaal,
        blokken,
        leeskaart: {
          focuspunten: regels(focuspunten),
          veelgemaakte_fouten: regels(fouten),
          huiswerk: regels(huiswerk),
        },
        datum: datum || null,
      });
      if (res.ok) {
        router.push(`/staf/lessen/${lesId}`);
      } else {
        setStatus({ ok: false, tekst: res.fout ?? "Opslaan mislukt." });
      }
    });
  }

  return (
    <form onSubmit={opslaan}>
      {/* Kop */}
      <div className="mb-4 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={labelCls}>Titel</span>
          <input value={titel} onChange={(e) => { setTitel(e.target.value); setStatus(null); }} required className={inputCls} />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelCls}>Onderwerp</span>
          <input value={onderwerp} onChange={(e) => setOnderwerp(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">Datum (voor het archief)</span>
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">Niveau</span>
          <input value={niveau} onChange={(e) => setNiveau(e.target.value)} className={inputCls} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">Spelers</span>
            <input type="number" min={0} max={40} value={aantalSpelers} onChange={(e) => setAantalSpelers(Number(e.target.value))} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">Duur (min)</span>
            <input type="number" min={0} max={240} value={duur} onChange={(e) => setDuur(Number(e.target.value))} className={inputCls} />
          </label>
        </div>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">Materiaal</span>
          <input value={materiaal} onChange={(e) => setMateriaal(e.target.value)} className={inputCls} />
        </label>
      </div>

      {/* Blokken */}
      <div className="space-y-3">
        {blokken.map((b, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-700">Blok {i + 1}</span>
              <button type="button" onClick={() => verwijderBlok(i)} className="text-xs text-neutral-400 hover:text-red-600">
                Verwijder blok
              </button>
            </div>
            {(b.tekening || b.spelsituatie_id) && (
              <p className="mb-2 text-xs text-neutral-400">
                🖼️ Dit blok heeft een tekening — die blijft ongewijzigd staan (hier niet te bewerken).
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Naam / vorm</span>
                <input value={b.naam} onChange={(e) => zetBlok(i, { naam: e.target.value })} className={inputCls} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelCls}>Type</span>
                  <input value={b.type} onChange={(e) => zetBlok(i, { type: e.target.value })} className={inputCls} />
                </label>
                <label className="block">
                  <span className={labelCls}>Minuten</span>
                  <input type="number" min={0} max={120} value={b.duur_minuten} onChange={(e) => zetBlok(i, { duur_minuten: Number(e.target.value) })} className={inputCls} />
                </label>
              </div>
            </div>
            <label className="mt-3 block">
              <span className={labelCls}>Doel</span>
              <textarea value={b.doel} onChange={(e) => zetBlok(i, { doel: e.target.value })} rows={2} className={inputCls} />
            </label>
            <label className="mt-3 block">
              <span className={labelCls}>Organisatie / uitleg</span>
              <textarea value={b.organisatie} onChange={(e) => zetBlok(i, { organisatie: e.target.value })} rows={4} className={inputCls} />
            </label>
            <label className="mt-3 block">
              <span className={labelCls}>Coachpunten (één per regel)</span>
              <textarea value={naarRegels(b.coachpunten)} onChange={(e) => zetBlok(i, { coachpunten: regels(e.target.value) })} rows={3} className={inputCls} />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Progressie makkelijker</span>
                <textarea value={b.progressie_makkelijker} onChange={(e) => zetBlok(i, { progressie_makkelijker: e.target.value })} rows={2} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Progressie moeilijker</span>
                <textarea value={b.progressie_moeilijker} onChange={(e) => zetBlok(i, { progressie_moeilijker: e.target.value })} rows={2} className={inputCls} />
              </label>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Coaching verdedigers</span>
                <textarea value={b.coaching_verdedigers ?? ""} onChange={(e) => zetBlok(i, { coaching_verdedigers: e.target.value })} rows={2} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Coaching aanvallers</span>
                <textarea value={b.coaching_aanvallers ?? ""} onChange={(e) => zetBlok(i, { coaching_aanvallers: e.target.value })} rows={2} className={inputCls} />
              </label>
            </div>
            <label className="mt-3 block">
              <span className={labelCls}>Variaties</span>
              <textarea value={b.variaties ?? ""} onChange={(e) => zetBlok(i, { variaties: e.target.value })} rows={2} className={inputCls} />
            </label>
          </div>
        ))}
      </div>

      <button type="button" onClick={voegBlokToe} className="mt-3 rounded-lg border border-dashed border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-500 hover:border-sparta hover:text-sparta">
        + Blok toevoegen
      </button>

      {/* Leeskaart */}
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Leeskaart</h2>
        <label className="block">
          <span className={labelCls}>Focuspunten (één per regel)</span>
          <textarea value={focuspunten} onChange={(e) => setFocuspunten(e.target.value)} rows={3} className={inputCls} />
        </label>
        <label className="mt-3 block">
          <span className={labelCls}>Veelgemaakte fouten (één per regel)</span>
          <textarea value={fouten} onChange={(e) => setFouten(e.target.value)} rows={3} className={inputCls} />
        </label>
        <label className="mt-3 block">
          <span className={labelCls}>Huiswerk (één per regel)</span>
          <textarea value={huiswerk} onChange={(e) => setHuiswerk(e.target.value)} rows={3} className={inputCls} />
        </label>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button type="submit" disabled={bezig} className="rounded-lg bg-sparta px-5 py-2 text-sm font-semibold text-white hover:bg-sparta-dark disabled:opacity-40">
          {bezig ? "Opslaan…" : "Wijzigingen opslaan"}
        </button>
        {status && !status.ok && <span className="text-sm text-red-600">{status.tekst}</span>}
      </div>
    </form>
  );
}
