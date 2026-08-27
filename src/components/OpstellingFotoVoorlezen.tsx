"use client";

import { useRef, useState, useTransition } from "react";
import { leesOpstellingFoto, type OpstellingFotoResultaat } from "@/app/staf/wedstrijd/[id]/opstelling/actions";

// Foto van het papieren opstellingsformulier → AI vult opstelling, wissels en
// teamtaken. De foto wordt niet bewaard.
export function OpstellingFotoVoorlezen({ wedstrijdId }: { wedstrijdId: string }) {
  const [resultaat, setResultaat] = useState<OpstellingFotoResultaat | null>(null);
  const [bezig, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function verstuur(formData: FormData) {
    setResultaat(null);
    start(async () => {
      const r = await leesOpstellingFoto(formData);
      setResultaat(r);
      if (r.ok) {
        formRef.current?.reset();
        // Het bord hierboven leest zijn beginstand op de server; verversen
        // zodat de ingelezen opstelling meteen zichtbaar is.
        window.location.reload();
      }
    });
  }

  return (
    <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 print:hidden">
      <h2 className="text-sm font-semibold text-neutral-700">📷 Papieren formulier voorlezen</h2>
      <p className="mb-3 mt-0.5 text-xs text-neutral-400">
        Opstellingsformulier met pen ingevuld? Maak er een foto van; de AI zet de opstelling,
        wissels en teamtaken in de app. Werkt alleen zolang het bord hierboven nog leeg is —
        een foto overschrijft nooit een bestaande opstelling. De foto wordt niet bewaard.
      </p>
      <form ref={formRef} action={verstuur} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="wedstrijd_id" value={wedstrijdId} />
        <input
          type="file"
          name="foto"
          accept="image/*"
          required
          className="text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-neutral-700"
        />
        <button
          type="submit"
          disabled={bezig}
          className="rounded-lg bg-sparta px-4 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark disabled:opacity-50"
        >
          {bezig ? "Bezig met lezen…" : "Opstelling overnemen"}
        </button>
      </form>
      {resultaat && (
        <p className={`mt-3 text-sm ${resultaat.ok ? "text-green-700" : "text-red-600"}`}>
          {resultaat.bericht}
        </p>
      )}
    </div>
  );
}
