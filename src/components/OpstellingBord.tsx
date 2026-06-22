"use client";

import { useMemo, useState, useTransition } from "react";
import { FORMATIES, FORMATIE_NAMEN } from "@/lib/formaties";
import { bewaarOpstelling } from "@/app/staf/wedstrijd/[id]/opstelling/actions";

interface SpelerKort {
  id: string;
  rugnummer: number | null;
  naam: string;
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
      </div>

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
                      {s.rugnummer ? `${s.rugnummer} · ` : ""}{s.naam}
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
        <div className="flex flex-wrap items-center gap-2">
          {bank.map((id) => {
            const sp = spelerById.get(id);
            if (!sp) return null;
            return (
              <span key={id} className="flex items-center gap-1 rounded-full bg-neutral-200 px-3 py-1 text-sm">
                {sp.rugnummer ? `${sp.rugnummer} · ` : ""}{voornaam(sp.naam)}
                <button type="button" onClick={() => haalUitBank(id)} className="ml-1 text-neutral-500 hover:text-sparta">×</button>
              </span>
            );
          })}
          {beschikbaar.length > 0 && (
            <select
              value=""
              onChange={(e) => voegBankToe(e.target.value)}
              className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
            >
              <option value="">+ speler op de bank…</option>
              {beschikbaar.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.rugnummer ? `${s.rugnummer} · ` : ""}{s.naam}
                </option>
              ))}
            </select>
          )}
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
        {status === "ok" && <span className="text-sm text-sparta">✓ Opgeslagen</span>}
        {status === "fout" && <span className="text-sm text-red-600">Opslaan mislukt</span>}
      </div>
    </div>
  );
}
