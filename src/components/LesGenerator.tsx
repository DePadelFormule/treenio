"use client";

import { useState, useTransition } from "react";
import { genereerLes, bewaarLes } from "@/app/staf/lesgenerator/actions";
import type { LesInvoer } from "@/app/staf/lesgenerator/actions";
import type { Les } from "@/lib/lesgenerator/schema";

export function LesGenerator() {
  const sport = "voetbal" as const;
  const [onderwerp, setOnderwerp] = useState("");
  const [duur, setDuur] = useState(90);
  const [spelers, setSpelers] = useState(14);
  const [fase, setFase] = useState(2);
  const [niveau, setNiveau] = useState("JO17");
  const [wensen, setWensen] = useState("");

  const [les, setLes] = useState<Les | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, start] = useTransition();

  function maak(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    const invoer: LesInvoer = {
      sport,
      onderwerp,
      duur_minuten: duur,
      aantal_spelers: spelers,
      fase,
      niveau,
      wensen,
    };
    start(async () => {
      const res = await genereerLes(invoer);
      if (res.ok) {
        setLes(res.les);
      } else {
        setLes(null);
        setFout(res.fout);
      }
    });
  }

  return (
    <div>
      {/* Formulier — verborgen bij afdrukken */}
      <form onSubmit={maak} className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 print:hidden">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-700">Onderwerp / thema</span>
          <input
            value={onderwerp}
            onChange={(e) => setOnderwerp(e.target.value)}
            required
            placeholder="bijv. druk zetten, uitverdedigen, 1v1 aanvallend"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
        </label>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">Duur (min)</span>
            <input type="number" min={20} max={150} value={duur} onChange={(e) => setDuur(Number(e.target.value))} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">Spelers</span>
            <input type="number" min={1} max={30} value={spelers} onChange={(e) => setSpelers(Number(e.target.value))} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">Fase</span>
            <select value={fase} onChange={(e) => setFase(Number(e.target.value))} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base">
              <option value={1}>1 — basistechniek</option>
              <option value={2}>2 — plaatsing</option>
              <option value={3}>3 — controle</option>
              <option value={4}>4 — effect/varianten</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">Niveau</span>
            <input value={niveau} onChange={(e) => setNiveau(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base" />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-700">Extra wensen <span className="text-neutral-400">(optioneel)</span></span>
          <textarea value={wensen} onChange={(e) => setWensen(e.target.value)} rows={2} placeholder="bijv. veel herhaling, klein veld, afronden op doel" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base" />
        </label>

        <button type="submit" disabled={bezig} className="rounded-lg bg-sparta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sparta-dark disabled:opacity-50">
          {bezig ? "Bezig met genereren…" : "Genereer les"}
        </button>

        {fout && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{fout}</p>}
        <p className="text-xs text-neutral-400">De AI schrijft de les op basis van jouw invoer. Het duurt meestal 10 tot 30 seconden.</p>
      </form>

      {les && (
        <>
          <BewaarPaneel les={les} />
          <Lesblad les={les} />
        </>
      )}
    </div>
  );
}

// Opslaan in het lessenarchief, optioneel gekoppeld aan een trainingsdatum.
function BewaarPaneel({ les }: { les: Les }) {
  const [datum, setDatum] = useState("");
  const [bezig, start] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; tekst: string } | null>(null);

  function opslaan() {
    setStatus(null);
    start(async () => {
      const res = await bewaarLes(les, datum || null);
      setStatus(
        res.ok
          ? { ok: true, tekst: "Les bewaard in het archief." }
          : { ok: false, tekst: res.fout ?? "Opslaan mislukt." },
      );
    });
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 print:hidden">
      <label className="text-sm text-neutral-600">
        Trainingsdatum <span className="text-neutral-400">(optioneel)</span>
        <input
          type="date"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className="ml-2 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </label>
      <button
        onClick={opslaan}
        disabled={bezig || status?.ok}
        className="rounded-lg bg-sparta px-4 py-2 text-sm font-semibold text-white hover:bg-sparta-dark disabled:opacity-50"
      >
        {bezig ? "Bewaren…" : status?.ok ? "✓ Bewaard" : "Les bewaren"}
      </button>
      {status && (
        <span className={`text-sm ${status.ok ? "text-sparta" : "text-red-600"}`}>{status.tekst}</span>
      )}
    </div>
  );
}

export function Lesblad({ les }: { les: Les }) {
  const somBlokken = les.blokken.reduce((t, b) => t + (b.duur_minuten || 0), 0);

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between print:hidden">
        <h2 className="text-lg font-bold text-neutral-800">Gegenereerd lesblad</h2>
        <button onClick={() => window.print()} className="rounded-lg border border-sparta px-3 py-2 text-sm font-semibold text-sparta hover:bg-sparta hover:text-white">
          🖨 Uitdraai maken
        </button>
      </div>

      <article className="rounded-xl border border-neutral-200 bg-white p-5 print:border-0 print:p-0">
        <header className="mb-4 border-b border-neutral-200 pb-3">
          <h1 className="text-xl font-bold text-sparta">{les.titel}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            <span className="capitalize">{les.sport}</span> · {les.onderwerp} · fase {les.fase}
            {les.niveau ? ` · ${les.niveau}` : ""} · {les.totale_duur_minuten} min · {les.aantal_spelers} spelers
          </p>
          {les.materiaal && <p className="mt-1 text-sm text-neutral-600"><span className="font-semibold">Materiaal:</span> {les.materiaal}</p>}
        </header>

        <ol className="space-y-4">
          {les.blokken.map((b, i) => (
            <li key={i} className="rounded-lg border border-neutral-200 p-3 print:break-inside-avoid">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold text-neutral-800">
                  <span className="text-sparta">{i + 1}.</span> {b.naam}
                  <span className="ml-2 text-xs font-normal uppercase tracking-wide text-neutral-400">{b.type}</span>
                </h3>
                <span className="shrink-0 rounded bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">{b.duur_minuten} min</span>
              </div>
              {b.doel && <p className="mt-1 text-sm text-neutral-600">{b.doel}</p>}

              {b.coachpunten?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Coachpunten</p>
                  <ul className="ml-4 list-disc text-sm text-neutral-700">
                    {b.coachpunten.map((c, j) => <li key={j}>{c}</li>)}
                  </ul>
                </div>
              )}

              {(b.progressie_makkelijker || b.progressie_moeilijker) && (
                <p className="mt-2 text-sm text-neutral-600">
                  {b.progressie_makkelijker && <><span className="font-semibold">Makkelijker:</span> {b.progressie_makkelijker}. </>}
                  {b.progressie_moeilijker && <><span className="font-semibold">Moeilijker:</span> {b.progressie_moeilijker}.</>}
                </p>
              )}

              {b.organisatie && <p className="mt-2 whitespace-pre-wrap rounded bg-green-50 px-2 py-1.5 text-sm text-green-900">{b.organisatie}</p>}
            </li>
          ))}
        </ol>

        {somBlokken !== les.totale_duur_minuten && (
          <p className="mt-2 text-xs text-amber-600 print:hidden">
            Let op: de bloktijden tellen op tot {somBlokken} min, terwijl de lesduur {les.totale_duur_minuten} min is.
          </p>
        )}

        <section className="mt-5 rounded-lg bg-neutral-50 p-3 print:break-inside-avoid">
          <h3 className="mb-2 font-semibold text-neutral-800">Leeskaart voor de speler</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Kaartje titel="Focuspunten" items={les.leeskaart.focuspunten} />
            <Kaartje titel="Veelgemaakte fouten" items={les.leeskaart.veelgemaakte_fouten} />
            <Kaartje titel="Huiswerk" items={les.leeskaart.huiswerk} />
          </div>
        </section>
      </article>
    </div>
  );
}

function Kaartje({ titel, items }: { titel: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{titel}</p>
      <ul className="ml-4 list-disc text-sm text-neutral-700">
        {items?.map((x, i) => <li key={i}>{x}</li>)}
      </ul>
    </div>
  );
}
