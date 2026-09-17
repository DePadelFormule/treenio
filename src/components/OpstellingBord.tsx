"use client";

import { useMemo, useState, useTransition } from "react";
import { FORMATIES, FORMATIE_NAMEN } from "@/lib/formaties";
import { bewaarOpstelling, stelOpstellingVoor } from "@/app/staf/wedstrijd/[id]/opstelling/actions";

interface SpelerKort {
  id: string;
  rugnummer: number | null;
  naam: string;
  status?: "fit" | "twijfel" | "geblesseerd";
}

function statusMarker(status?: string) {
  if (status === "geblesseerd") return " 🔴";
  if (status === "twijfel") return " 🟡";
  return "";
}

interface Props {
  wedstrijdId: string;
  spelers: SpelerKort[];
  begin: { formatie: string; veld: Record<string, string>; bank: string[] };
}

function voornaam(naam: string) {
  return naam.split(" ")[0];
}

export function OpstellingBord({ wedstrijdId, spelers, begin }: Props) {
  const [formatie, setFormatie] = useState(begin.formatie in FORMATIES ? begin.formatie : "4-3-3");
  const [veld, setVeld] = useState<Record<string, string>>(begin.veld ?? {});
  const [bank, setBank] = useState<string[]>(begin.bank ?? []);
  const [bezig, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "fout">("idle");
  const [voorstelBezig, setVoorstelBezig] = useState(false);
  const [voorstelMelding, setVoorstelMelding] = useState<string | null>(null);

  const spelerById = useMemo(() => {
    const m = new Map<string, SpelerKort>();
    for (const s of spelers) m.set(s.id, s);
    return m;
  }, [spelers]);

  const slots = FORMATIES[formatie];

  function zetSlot(slotKey: string, spelerId: string) {
    setStatus("idle");
    setVeld((prev) => {
      const next: Record<string, string> = {};
      // verwijder deze speler uit andere slots
      for (const [k, v] of Object.entries(prev)) {
        if (v && v !== spelerId) next[k] = v;
      }
      if (spelerId) next[slotKey] = spelerId;
      return next;
    });
    if (spelerId) setBank((b) => b.filter((id) => id !== spelerId));
  }

  function voegBankToe(spelerId: string) {
    if (!spelerId) return;
    setStatus("idle");
    // haal uit het veld als hij daar stond
    setVeld((prev) => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) if (v !== spelerId) next[k] = v;
      return next;
    });
    setBank((b) => (b.includes(spelerId) ? b : [...b, spelerId]));
  }

  function haalUitBank(spelerId: string) {
    setStatus("idle");
    setBank((b) => b.filter((id) => id !== spelerId));
  }

  function verplaatsInBank(index: number, richting: -1 | 1) {
    setBank((b) => {
      const doel = index + richting;
      if (doel < 0 || doel >= b.length) return b;
      const next = [...b];
      [next[index], next[doel]] = [next[doel], next[index]];
      return next;
    });
  }

  async function voorstelOpstelling() {
    const heeftAlIets = Object.values(veld).some(Boolean) || bank.length > 0;
    if (heeftAlIets && !confirm("Dit vervangt de huidige opstelling en bank door een voorstel op basis van opkomst en speelminuten. Doorgaan?")) {
      return;
    }
    setVoorstelBezig(true);
    setVoorstelMelding(null);
    setStatus("idle");
    const res = await stelOpstellingVoor(wedstrijdId, formatie);
    setVoorstelBezig(false);
    if (!res.ok || !res.veld || !res.bank) {
      setVoorstelMelding("Voorstel maken is niet gelukt.");
      return;
    }
    setVeld(res.veld);
    setBank(res.bank);
    setVoorstelMelding("Voorstel ingevuld op basis van opkomst (week/maand/all-time) en speelminuten — controleer en pas aan waar nodig, en sla daarna op.");
  }

  const opgesteld = new Set(Object.values(veld).filter(Boolean));
  const beschikbaar = spelers.filter((s) => !opgesteld.has(s.id) && !bank.includes(s.id));

  function opslaan() {
    start(async () => {
      const res = await bewaarOpstelling({ wedstrijd_id: wedstrijdId, formatie, veld, bank });
      setStatus(res.ok ? "ok" : "fout");
    });
  }

  return (
    <div>
      {/* Formatie kiezen */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-neutral-500">Formatie:</span>
        {FORMATIE_NAMEN.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => { setFormatie(f); setStatus("idle"); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              formatie === f ? "bg-sparta text-white" : "bg-neutral-200 text-neutral-700"
            }`}
          >
            {f}
          </button>
        ))}
        <button
          type="button"
          onClick={voorstelOpstelling}
          disabled={voorstelBezig}
          className="ml-auto rounded-lg border border-sparta px-3 py-1.5 text-sm font-semibold text-sparta hover:bg-sparta/5 disabled:opacity-40"
        >
          {voorstelBezig ? "Bezig…" : "Stel voorstel op"}
        </button>
      </div>
      {voorstelMelding && (
        <p className="mb-3 text-xs text-neutral-500">{voorstelMelding}</p>
      )}

      {/* Het veld */}
      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border-2 border-white/40 bg-gradient-to-b from-green-700 to-green-800 shadow-inner" style={{ aspectRatio: "2 / 3" }}>
        {/* lijnen */}
        <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-white/30" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />
        <div className="pointer-events-none absolute left-3 right-3 top-1/2 border-t-2 border-white/30" />

        {slots.map((slot) => {
          const spelerId = veld[slot.key] ?? "";
          const sp = spelerId ? spelerById.get(spelerId) : undefined;
          return (
            <div
              key={slot.key}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            >
              <div className="relative flex w-16 flex-col items-center">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold shadow ${
                  sp ? "bg-white text-sparta" : "bg-white/30 text-white"
                }`}>
                  {sp ? (sp.rugnummer ?? "•") : slot.label}
                </div>
                <span className="mt-0.5 max-w-[4.5rem] truncate text-center text-[0.65rem] font-medium text-white">
                  {sp ? voornaam(sp.naam) : ""}
                </span>
                {/* onzichtbare select bovenop voor het kiezen */}
                <select
                  value={spelerId}
                  onChange={(e) => zetSlot(slot.key, e.target.value)}
                  className="absolute inset-0 h-11 w-11 cursor-pointer opacity-0"
                  aria-label={`Positie ${slot.label}`}
                >
                  <option value="">— leeg —</option>
                  {spelers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.rugnummer ? `${s.rugnummer} · ` : ""}{s.naam}{statusMarker(s.status)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bank */}
      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Bank / wissels</h3>
        <p className="mb-2 text-xs text-neutral-400">
          Volgorde = wisselvolgorde: wissel 1 heeft het meeste recht om in te vallen. Zet met de
          pijltjes om.
        </p>
        <div className="space-y-1.5">
          {bank.length === 0 && <span className="text-sm text-neutral-400">Niemand op de bank.</span>}
          {bank.map((id, i) => {
            const sp = spelerById.get(id);
            if (!sp) return null;
            return (
              <div key={id} className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm">
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-sparta/10 px-1.5 text-xs font-bold text-sparta">
                  {i + 1}
                </span>
                <span className="flex-1 font-medium text-neutral-800">
                  {sp.rugnummer ? `${sp.rugnummer} · ` : ""}{voornaam(sp.naam)}
                </span>
                <button type="button" onClick={() => verplaatsInBank(i, -1)} disabled={i === 0} className="text-neutral-400 hover:text-sparta disabled:opacity-30" title="Naar boven">↑</button>
                <button type="button" onClick={() => verplaatsInBank(i, 1)} disabled={i === bank.length - 1} className="text-neutral-400 hover:text-sparta disabled:opacity-30" title="Naar beneden">↓</button>
                <button type="button" onClick={() => haalUitBank(id)} className="text-neutral-400 hover:text-red-600" title="Naar afwezig">×</button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Afwezig / niet in selectie */}
      <div className="mt-4">
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Afwezig / niet in selectie</h3>
        <div className="flex flex-wrap items-center gap-2">
          {beschikbaar.length === 0 && <span className="text-sm text-neutral-400">Iedereen is opgesteld of staat op de bank.</span>}
          {beschikbaar.map((s) => (
            <span key={s.id} className="flex items-center gap-1 rounded-full bg-neutral-200 px-3 py-1 text-sm text-neutral-600">
              {s.rugnummer ? `${s.rugnummer} · ` : ""}{voornaam(s.naam)}{statusMarker(s.status)}
              <button type="button" onClick={() => voegBankToe(s.id)} className="ml-1 font-semibold text-neutral-500 hover:text-sparta" title="Naar bank">→ bank</button>
            </span>
          ))}
        </div>
      </div>

      {/* Opslaan */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={opslaan}
          disabled={bezig}
          className="rounded-lg bg-sparta px-5 py-2 text-sm font-semibold text-white hover:bg-sparta-dark disabled:opacity-40"
        >
          {bezig ? "Opslaan…" : "Opstelling opslaan"}
        </button>
        {status === "ok" && <span className="text-sm text-sparta">✓ Opgeslagen — basis/wissel doorgezet</span>}
        {status === "fout" && <span className="text-sm text-red-600">Opslaan mislukt</span>}
      </div>
    </div>
  );
}
