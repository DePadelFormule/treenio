"use client";

// Kiezer voor het lesformulier: kies een opgeslagen spelsituatie en een stap;
// die stap wordt als tekening (PNG) in het lesblok gezet, met een verwijzing
// naar de situatie zodat het archief de animatie kan afspelen.

import { useEffect, useState } from "react";
import { lijstSpelsituaties, type SpelsituatieKort } from "@/app/staf/spelsituaties/actions";
import { PlayPreview, frameNaarDataUrl } from "@/components/tactiek/PlayViewer";
import { naarPlayData } from "@/lib/tactiek/vanBordData";
import type { PlayData } from "@/lib/tactiek/types";

export interface SpelsituatieKeuze {
  spelsituatie_id: string;
  frameIndex: number;
  tekening: string;
}

export function SpelsituatieKiezer({ onKies, onSluit }: {
  onKies: (keuze: SpelsituatieKeuze) => void;
  onSluit: () => void;
}) {
  const [lijst, setLijst] = useState<SpelsituatieKort[] | null>(null);
  const [gekozen, setGekozen] = useState<{ s: SpelsituatieKort; play: PlayData } | null>(null);

  useEffect(() => {
    let actief = true;
    lijstSpelsituaties().then((l) => { if (actief) setLijst(l); });
    return () => { actief = false; };
  }, []);

  function kiesSituatie(s: SpelsituatieKort) {
    setGekozen({ s, play: naarPlayData(s.data, s.half_veld, s.titel, s.uitleg ?? "") });
  }

  function kiesStap(frameIndex: number) {
    if (!gekozen) return;
    const veld = gekozen.s.half_veld ? "half" : "heel";
    onKies({ spelsituatie_id: gekozen.s.id, frameIndex, tekening: frameNaarDataUrl(gekozen.play, veld, frameIndex) });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onSluit}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-sparta">
            {gekozen ? gekozen.s.titel : "Kies een spelsituatie"}
          </h3>
          <button type="button" onClick={onSluit} className="text-sm text-neutral-500 hover:text-neutral-900">Sluiten</button>
        </div>

        {!gekozen ? (
          lijst === null ? (
            <p className="py-8 text-center text-sm text-neutral-400">Laden…</p>
          ) : lijst.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">Nog geen spelsituaties. Maak er eerst een bij Spelsituaties.</p>
          ) : (
            <ul className="space-y-2">
              {lijst.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => kiesSituatie(s)}
                    className="flex w-full items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 text-left hover:border-sparta hover:bg-red-50"
                  >
                    <span>
                      <span className="block font-medium text-neutral-800">{s.titel}</span>
                      <span className="block text-xs text-neutral-400">{s.half_veld ? "half veld" : "heel veld"}{s.uitleg ? ` · ${s.uitleg}` : ""}</span>
                    </span>
                    <span className="text-sm font-semibold text-sparta">Kies →</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <>
            <p className="mb-3 text-sm text-neutral-500">
              Kies de stap die je als tekening in het blok wilt. In het archief is de hele animatie af te spelen.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gekozen.play.frames.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => kiesStap(i)}
                  className="rounded-xl border border-neutral-200 p-2 text-left hover:border-sparta hover:bg-red-50"
                >
                  <PlayPreview play={gekozen.play} veld={gekozen.s.half_veld ? "half" : "heel"} frameIndex={i} />
                  <span className="mt-1 block text-xs font-semibold text-neutral-700">
                    Stap {i + 1}{f.text?.trim() ? `: ${f.text.trim()}` : ""}
                  </span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setGekozen(null)} className="mt-4 text-sm text-neutral-500 hover:text-neutral-900">
              ← Andere situatie
            </button>
          </>
        )}
      </div>
    </div>
  );
}
