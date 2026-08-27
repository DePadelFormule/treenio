"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { nieuweSectie, bewaarSectie, verwijderSectie } from "@/app/staf/academy/actions";
import { AcademyTekst } from "@/components/AcademyTekst";
import type { AcademySectie } from "@/lib/types/database";

function SectieRij({ sectie, hoofdstukId }: { sectie: AcademySectie; hoofdstukId: string }) {
  const [titel, setTitel] = useState(sectie.titel ?? "");
  const [tekst, setTekst] = useState(sectie.tekst);
  const [volgorde, setVolgorde] = useState(sectie.volgorde);
  const [voorbeeld, setVoorbeeld] = useState(false);
  const [bezig, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok">("idle");
  const router = useRouter();

  function opslaan() {
    setStatus("idle");
    start(async () => {
      const res = await bewaarSectie(sectie.id, hoofdstukId, titel, tekst, volgorde);
      if (res.ok) setStatus("ok");
    });
  }

  function verwijderen() {
    if (!confirm("Deze sectie verwijderen?")) return;
    start(async () => { await verwijderSectie(sectie.id, hoofdstukId); router.refresh(); });
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-end gap-3">
        <label className="flex-1 text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Sectietitel (optioneel)</span>
          <input value={titel} onChange={(e) => { setTitel(e.target.value); setStatus("idle"); }} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Volgorde</span>
          <input type="number" value={volgorde} onChange={(e) => { setVolgorde(Number(e.target.value)); setStatus("idle"); }} className="w-16 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">
          Tekst — lege regel = nieuwe alinea, <span className="font-mono">**vet**</span>, regels met <span className="font-mono">- </span> worden een lijstje
        </span>
        <textarea rows={6} value={tekst} onChange={(e) => { setTekst(e.target.value); setStatus("idle"); }} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
      </label>
      {voorbeeld && (
        <div className="mt-2 rounded-lg bg-neutral-50 p-3">
          <AcademyTekst tekst={tekst} />
        </div>
      )}
      <div className="mt-2 flex items-center gap-3">
        <button type="button" onClick={opslaan} disabled={bezig} className="rounded-lg bg-sparta px-4 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark disabled:opacity-50">
          Opslaan
        </button>
        <button type="button" onClick={() => setVoorbeeld((v) => !v)} className="text-sm text-neutral-500 hover:text-sparta">
          {voorbeeld ? "Voorbeeld verbergen" : "Voorbeeld tonen"}
        </button>
        {status === "ok" && <span className="text-sm text-sparta">✓ Opgeslagen</span>}
        <button type="button" onClick={verwijderen} className="ml-auto text-sm text-neutral-400 hover:text-red-600">
          Verwijderen
        </button>
      </div>
    </div>
  );
}

export function AcademySectiesBeheer({ hoofdstukId, secties }: { hoofdstukId: string; secties: AcademySectie[] }) {
  const [nieuwTitel, setNieuwTitel] = useState("");
  const [nieuwTekst, setNieuwTekst] = useState("");
  const [bezig, start] = useTransition();
  const router = useRouter();

  function toevoegen() {
    if (!nieuwTekst.trim()) return;
    start(async () => {
      await nieuweSectie(hoofdstukId, nieuwTitel, nieuwTekst);
      setNieuwTitel("");
      setNieuwTekst("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {secties.map((s) => (
        <SectieRij key={s.id} sectie={s} hoofdstukId={hoofdstukId} />
      ))}

      <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-4">
        <p className="mb-2 text-sm font-semibold text-neutral-700">+ Sectie toevoegen</p>
        <input
          value={nieuwTitel} onChange={(e) => setNieuwTitel(e.target.value)} placeholder="Titel (optioneel)"
          className="mb-2 w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <textarea
          value={nieuwTekst} onChange={(e) => setNieuwTekst(e.target.value)} rows={4} placeholder="Tekst van deze sectie…"
          className="mb-2 w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <button type="button" onClick={toevoegen} disabled={bezig || !nieuwTekst.trim()} className="rounded-lg bg-sparta px-4 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark disabled:opacity-50">
          Sectie toevoegen
        </button>
      </div>
    </div>
  );
}
