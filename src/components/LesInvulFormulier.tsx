"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { bewaarHandmatigeLes, type HandLesBlok } from "@/app/staf/lesgenerator/actions";
import { TekenVeld } from "@/components/TekenVeld";
import { PrintKnop } from "@/components/PrintKnop";

// Digitale versie van het papieren lesvoorbereidingsformulier: vijf blokken
// met een tekenveld, doel, vorm, minuten en uitleg. Opslaan zet de les in het
// archief.

const LEEG_BLOK: HandLesBlok = {
  doel: "", vorm: "", minuten: 0, uitleg: "", tekening: undefined,
  coaching_verdedigers: "", coaching_aanvallers: "", variaties: "",
};

export function LesInvulFormulier() {
  const [datum, setDatum] = useState("");
  const [thema, setThema] = useState("");
  const [doelstelling, setDoelstelling] = useState("");
  const [spelers, setSpelers] = useState(14);
  const [duur, setDuur] = useState(90);
  const [blokken, setBlokken] = useState<HandLesBlok[]>(
    Array.from({ length: 5 }, () => ({ ...LEEG_BLOK })),
  );
  const [status, setStatus] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [bezig, start] = useTransition();

  function zetBlok(i: number, deel: Partial<HandLesBlok>) {
    setStatus(null);
    setBlokken((b) => b.map((blok, j) => (j === i ? { ...blok, ...deel } : blok)));
  }

  function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    start(async () => {
      const res = await bewaarHandmatigeLes({
        datum: datum || null,
        thema,
        doelstelling,
        spelers,
        duur,
        blokken,
      });
      setStatus(
        res.ok
          ? { ok: true, tekst: "Les opgeslagen in het archief." }
          : { ok: false, tekst: res.fout ?? "Opslaan mislukt." },
      );
    });
  }

  const ingevuldeBlokken = blokken.filter(
    (b) => b.doel || b.vorm || b.uitleg || b.tekening || b.coaching_verdedigers || b.coaching_aanvallers || b.variaties,
  );

  return (
    <>
    <form onSubmit={opslaan} className="print:hidden">
      <div className="mb-4 flex justify-end">
        <PrintKnop label="🖨️ Printen / PDF" />
      </div>
      {/* Kop */}
      <div className="mb-4 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-neutral-700">Thema</span>
          <input value={thema} onChange={(e) => { setThema(e.target.value); setStatus(null); }} required
            placeholder="bijv. omschakelen na balverlies"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-neutral-700">Doelstelling</span>
          <input value={doelstelling} onChange={(e) => setDoelstelling(e.target.value)}
            placeholder="wat moet er aan het eind van de training beter zijn?"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">Datum (voor het archief)</span>
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">Spelers</span>
            <input type="number" min={1} max={40} value={spelers} onChange={(e) => setSpelers(Number(e.target.value))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">Duur (min)</span>
            <input type="number" min={20} max={240} value={duur} onChange={(e) => setDuur(Number(e.target.value))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base" />
          </label>
        </div>
        <p className="text-xs text-neutral-400 sm:col-span-2">
          Half veld · warming-up is standaard (niet noteren). Vul alleen de blokken die je gebruikt.
        </p>
      </div>

      {/* Blokken */}
      {blokken.map((blok, i) => (
        <div key={i} className="mb-3 rounded-xl border border-neutral-200 bg-white p-4">
          <div className="mb-2 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-500">Doel</span>
              <input value={blok.doel} onChange={(e) => zetBlok(i, { doel: e.target.value })}
                placeholder="bijv. sneller omschakelen"
                className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-500">Vorm</span>
              <input value={blok.vorm} onChange={(e) => zetBlok(i, { vorm: e.target.value })}
                placeholder="bijv. 4v4 + keepers"
                className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-500">Min</span>
              <input type="number" min={0} max={120} value={blok.minuten || ""} placeholder="—"
                onChange={(e) => zetBlok(i, { minuten: Number(e.target.value) })}
                className="w-20 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-500">Teken de oefening</span>
              <TekenVeld waarde={blok.tekening} onChange={(dataUrl) => zetBlok(i, { tekening: dataUrl })} />
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-500">Uitleg &amp; organisatie</span>
              <textarea rows={9} value={blok.uitleg} onChange={(e) => zetBlok(i, { uitleg: e.target.value })}
                placeholder="Opstelling, afmetingen, regels, coachmomenten…"
                className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
            </label>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-500">Coaching verdedigers</span>
              <textarea rows={3} value={blok.coaching_verdedigers}
                onChange={(e) => zetBlok(i, { coaching_verdedigers: e.target.value })}
                placeholder="Coachpunten voor de verdedigende spelers…"
                className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-500">Coaching aanvallers</span>
              <textarea rows={3} value={blok.coaching_aanvallers}
                onChange={(e) => zetBlok(i, { coaching_aanvallers: e.target.value })}
                placeholder="Coachpunten voor de aanvallende spelers…"
                className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
            </label>
          </div>

          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-500">Variaties</span>
            <textarea rows={2} value={blok.variaties} onChange={(e) => zetBlok(i, { variaties: e.target.value })}
              placeholder="Makkelijker/moeilijker maken, andere uitvoering…"
              className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
          </label>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={bezig}
          className="rounded-lg bg-sparta px-5 py-2 text-sm font-semibold text-white hover:bg-sparta-dark disabled:opacity-50">
          {bezig ? "Opslaan…" : "Opslaan in archief"}
        </button>
        {status && (
          <span className={`text-sm ${status.ok ? "text-green-700" : "text-red-600"}`}>
            {status.tekst}
            {status.ok && (
              <>
                {" "}
                <Link href="/staf/lessen" className="font-semibold text-sparta hover:underline">
                  Naar het archief →
                </Link>
              </>
            )}
          </span>
        )}
      </div>
    </form>

    {/* Printweergave: alleen zichtbaar bij afdrukken/PDF, met de actuele
        (nog niet per se opgeslagen) inhoud van het formulier. */}
    <div className="hidden print:block">
      <header className="mb-3 border-b-2 border-sparta pb-2">
        <h1 className="text-lg font-bold text-sparta">Lesvoorbereiding · Nivo Sparta JO17-2</h1>
        <p className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-neutral-700">
          <span>Datum: {datum || "—"}</span>
          <span>Thema: {thema || "—"}</span>
          <span>Spelers: {spelers || "—"}</span>
          <span>Duur: {duur || "—"} min</span>
        </p>
        {doelstelling && <p className="mt-1 text-[13px] text-neutral-700">Doelstelling: {doelstelling}</p>}
        <p className="mt-1 text-[11px] text-neutral-400">Half veld · warming-up is standaard (niet genoteerd)</p>
      </header>

      {ingevuldeBlokken.length === 0 && (
        <p className="text-sm text-neutral-400">Nog geen blokken ingevuld.</p>
      )}

      {ingevuldeBlokken.map((blok, i) => (
        <section key={i} className="mb-3 break-inside-avoid">
          <h2 className="mb-1.5 flex flex-wrap items-center gap-x-4 rounded bg-neutral-100 px-2 py-1 text-[13px] font-bold text-neutral-800">
            <span>Doel: {blok.doel || "—"}</span>
            <span>Vorm: {blok.vorm || "—"}</span>
            <span className="ml-auto text-[11px] font-semibold text-neutral-400">{blok.minuten || "—"} min</span>
          </h2>
          <div className="flex gap-4">
            {blok.tekening && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={blok.tekening} alt={`Tekening bij blok ${i + 1}`} className="w-[40%] shrink-0 rounded border border-neutral-300" />
            )}
            {blok.uitleg && (
              <p className="flex-1 whitespace-pre-wrap text-[12px] leading-snug text-neutral-800">{blok.uitleg}</p>
            )}
          </div>
          {(blok.coaching_verdedigers || blok.coaching_aanvallers) && (
            <div className="mt-1.5 grid grid-cols-2 gap-x-4">
              {blok.coaching_verdedigers && (
                <p className="text-[12px] text-neutral-800">
                  <span className="font-bold">Coaching verdedigers: </span>{blok.coaching_verdedigers}
                </p>
              )}
              {blok.coaching_aanvallers && (
                <p className="text-[12px] text-neutral-800">
                  <span className="font-bold">Coaching aanvallers: </span>{blok.coaching_aanvallers}
                </p>
              )}
            </div>
          )}
          {blok.variaties && (
            <p className="mt-1.5 text-[12px] text-neutral-800"><span className="font-bold">Variaties: </span>{blok.variaties}</p>
          )}
        </section>
      ))}

      <p className="mt-4 text-[10px] text-neutral-400">Treenio · digitaal lesformulier</p>
    </div>
    </>
  );
}
