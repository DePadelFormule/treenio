"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { bewaarPositieTaken } from "@/app/staf/positietaken/actions";

// Zelfde als PositieTaakVeld, maar als printbaar kaartje gestyled: op scherm
// bewerkbaar en opslaanbaar, bij printen vallen knoppen/rand weg en blijft
// alleen de tekst over.
export function PositieKaartVeld({
  positieCode,
  positieLabel,
  situatie,
  begin,
}: {
  positieCode: string;
  positieLabel: string;
  situatie: string;
  begin: string;
}) {
  const [waarde, setWaarde] = useState(begin);
  const [bezig, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "fout">("idle");
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Past de hoogte aan op de echt gerenderde inhoud (incl. woordafbreking),
  // zodat je nooit in het vak zelf moet scrollen om alles te zien.
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [waarde]);

  function opslaan() {
    setStatus("idle");
    start(async () => {
      const res = await bewaarPositieTaken(positieCode, situatie, waarde);
      setStatus(res.ok ? "ok" : "fout");
    });
  }

  return (
    <div className="rounded-lg border-2 border-neutral-300 p-3 print:break-inside-avoid print:border print:border-neutral-400">
      <h2 className="mb-1.5 text-base font-bold text-sparta">{positieLabel}</h2>
      <textarea
        ref={taRef}
        value={waarde}
        onChange={(e) => { setWaarde(e.target.value); setStatus("idle"); }}
        rows={1}
        placeholder="Nog geen taken ingevuld."
        className="w-full resize-none overflow-hidden rounded-lg border border-neutral-300 px-2 py-1.5 text-sm text-neutral-800 print:border-0 print:p-0 print:text-black"
      />
      <div className="mt-2 flex items-center gap-3 print:hidden">
        <button
          type="button"
          onClick={opslaan}
          disabled={bezig}
          className="rounded-lg bg-sparta px-3 py-1.5 text-xs font-semibold text-white hover:bg-sparta-dark disabled:opacity-50"
        >
          {bezig ? "Opslaan…" : "Opslaan"}
        </button>
        {status === "ok" && <span className="text-xs text-sparta">✓ Opgeslagen</span>}
        {status === "fout" && <span className="text-xs text-red-600">Opslaan mislukt</span>}
      </div>
    </div>
  );
}
