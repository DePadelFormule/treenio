"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { nieuweVraag, bewaarVraag, verwijderVraag } from "@/app/staf/academy/actions";
import type { AcademyQuizvraag, AcademyVraagType } from "@/lib/types/database";

const STELLING_OPTIES = ["Waar", "Niet waar"];

function OptiesVeld({
  type, opties, setOpties, juistIndex, setJuistIndex,
}: {
  type: AcademyVraagType;
  opties: string[];
  setOpties: (o: string[]) => void;
  juistIndex: number;
  setJuistIndex: (i: number) => void;
}) {
  if (type === "stelling") {
    // Vaste opties; alleen het juiste antwoord is te kiezen.
    return (
      <div className="flex gap-2">
        {STELLING_OPTIES.map((o, i) => (
          <button key={o} type="button" onClick={() => { setOpties(STELLING_OPTIES); setJuistIndex(i); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${juistIndex === i ? "bg-sparta text-white" : "bg-neutral-100 text-neutral-700"}`}>
            {o}
          </button>
        ))}
      </div>
    );
  }

  function zetOptie(i: number, waarde: string) {
    const next = [...opties];
    next[i] = waarde;
    setOpties(next);
  }
  function verwijderOptie(i: number) {
    const next = opties.filter((_, j) => j !== i);
    setOpties(next);
    if (juistIndex >= next.length) setJuistIndex(0);
    else if (juistIndex > i) setJuistIndex(juistIndex - 1);
  }

  return (
    <div className="space-y-1.5">
      {opties.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <button type="button" onClick={() => setJuistIndex(i)} title="Dit is het juiste antwoord"
            className={`h-6 w-6 shrink-0 rounded-full border-2 text-xs font-bold ${juistIndex === i ? "border-sparta bg-sparta text-white" : "border-neutral-300 text-neutral-400"}`}>
            {String.fromCharCode(65 + i)}
          </button>
          <input value={o} onChange={(e) => zetOptie(i, e.target.value)} placeholder={`Optie ${String.fromCharCode(65 + i)}`}
            className="flex-1 rounded-lg border border-neutral-300 px-2 py-1 text-sm" />
          {opties.length > 2 && (
            <button type="button" onClick={() => verwijderOptie(i)} className="text-neutral-400 hover:text-red-600" title="Verwijder optie">×</button>
          )}
        </div>
      ))}
      {opties.length < 6 && (
        <button type="button" onClick={() => setOpties([...opties, ""])} className="text-xs font-semibold text-sparta hover:underline">
          + optie toevoegen
        </button>
      )}
      <p className="text-xs text-neutral-400">Tik op de letter om aan te geven welk antwoord juist is.</p>
    </div>
  );
}

function VraagRij({ vraag, hoofdstukId }: { vraag: AcademyQuizvraag; hoofdstukId: string }) {
  const [type, setType] = useState<AcademyVraagType>(vraag.type);
  const [tekst, setTekst] = useState(vraag.vraag);
  const [opties, setOpties] = useState<string[]>(vraag.opties.length ? vraag.opties : ["", ""]);
  const [juistIndex, setJuistIndex] = useState(vraag.juist_index);
  const [bezig, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "fout">("idle");
  const [foutTekst, setFoutTekst] = useState<string | null>(null);
  const router = useRouter();

  function wisselType(nieuw: AcademyVraagType) {
    setType(nieuw);
    setStatus("idle");
    if (nieuw === "stelling") { setOpties(STELLING_OPTIES); setJuistIndex(0); }
    else if (opties === STELLING_OPTIES || opties.length < 2) setOpties(["", ""]);
  }

  function opslaan() {
    setStatus("idle");
    start(async () => {
      const res = await bewaarVraag(vraag.id, hoofdstukId, type, tekst, opties, juistIndex);
      setStatus(res.ok ? "ok" : "fout");
      setFoutTekst(res.fout ?? null);
    });
  }

  function verwijderen() {
    if (!confirm("Deze quizvraag verwijderen?")) return;
    start(async () => { await verwijderVraag(vraag.id, hoofdstukId); router.refresh(); });
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => wisselType("meerkeuze")} className={`rounded-lg px-3 py-1 text-xs font-semibold ${type === "meerkeuze" ? "bg-sparta text-white" : "bg-neutral-100 text-neutral-700"}`}>Meerkeuze</button>
        <button type="button" onClick={() => wisselType("stelling")} className={`rounded-lg px-3 py-1 text-xs font-semibold ${type === "stelling" ? "bg-sparta text-white" : "bg-neutral-100 text-neutral-700"}`}>Stelling (waar/niet waar)</button>
      </div>
      <textarea value={tekst} onChange={(e) => { setTekst(e.target.value); setStatus("idle"); }} rows={2}
        placeholder={type === "stelling" ? "De stelling…" : "De omschrijving / vraag…"}
        className="mb-2 w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
      <OptiesVeld type={type} opties={opties} setOpties={(o) => { setOpties(o); setStatus("idle"); }} juistIndex={juistIndex} setJuistIndex={(i) => { setJuistIndex(i); setStatus("idle"); }} />
      <div className="mt-2 flex items-center gap-3">
        <button type="button" onClick={opslaan} disabled={bezig} className="rounded-lg bg-sparta px-4 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark disabled:opacity-50">
          Opslaan
        </button>
        {status === "ok" && <span className="text-sm text-sparta">✓ Opgeslagen</span>}
        {status === "fout" && <span className="text-sm text-red-600">{foutTekst ?? "Opslaan mislukt"}</span>}
        <button type="button" onClick={verwijderen} className="ml-auto text-sm text-neutral-400 hover:text-red-600">
          Verwijderen
        </button>
      </div>
    </div>
  );
}

export function AcademyVragenBeheer({ hoofdstukId, vragen }: { hoofdstukId: string; vragen: AcademyQuizvraag[] }) {
  const [type, setType] = useState<AcademyVraagType>("meerkeuze");
  const [tekst, setTekst] = useState("");
  const [opties, setOpties] = useState<string[]>(["", ""]);
  const [juistIndex, setJuistIndex] = useState(0);
  const [bezig, start] = useTransition();
  const [foutTekst, setFoutTekst] = useState<string | null>(null);
  const router = useRouter();

  function wisselType(nieuw: AcademyVraagType) {
    setType(nieuw);
    if (nieuw === "stelling") { setOpties(STELLING_OPTIES); setJuistIndex(0); }
    else { setOpties(["", ""]); setJuistIndex(0); }
  }

  function toevoegen() {
    setFoutTekst(null);
    start(async () => {
      const res = await nieuweVraag(hoofdstukId, type, tekst, opties, juistIndex);
      if (res.ok) {
        setTekst("");
        setOpties(type === "stelling" ? STELLING_OPTIES : ["", ""]);
        setJuistIndex(0);
        router.refresh();
      } else {
        setFoutTekst(res.fout ?? "Toevoegen mislukt.");
      }
    });
  }

  return (
    <div className="space-y-3">
      {vragen.length === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-400">
          Nog geen quizvragen — dit hoofdstuk krijgt pas een "Doe de quiz"-knop zodra er vragen zijn.
        </p>
      )}
      {vragen.map((v) => (
        <VraagRij key={v.id} vraag={v} hoofdstukId={hoofdstukId} />
      ))}

      <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-4">
        <p className="mb-2 text-sm font-semibold text-neutral-700">+ Vraag toevoegen</p>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => wisselType("meerkeuze")} className={`rounded-lg px-3 py-1 text-xs font-semibold ${type === "meerkeuze" ? "bg-sparta text-white" : "bg-neutral-100 text-neutral-700"}`}>Meerkeuze</button>
          <button type="button" onClick={() => wisselType("stelling")} className={`rounded-lg px-3 py-1 text-xs font-semibold ${type === "stelling" ? "bg-sparta text-white" : "bg-neutral-100 text-neutral-700"}`}>Stelling (waar/niet waar)</button>
        </div>
        <textarea value={tekst} onChange={(e) => setTekst(e.target.value)} rows={2}
          placeholder={type === "stelling" ? "De stelling…" : "De omschrijving / vraag…"}
          className="mb-2 w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        <OptiesVeld type={type} opties={opties} setOpties={setOpties} juistIndex={juistIndex} setJuistIndex={setJuistIndex} />
        {foutTekst && <p className="mt-2 text-sm text-red-600">{foutTekst}</p>}
        <button type="button" onClick={toevoegen} disabled={bezig || !tekst.trim()} className="mt-2 rounded-lg bg-sparta px-4 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark disabled:opacity-50">
          Vraag toevoegen
        </button>
      </div>
    </div>
  );
}
