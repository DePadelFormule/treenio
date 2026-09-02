"use client";

// Een lesblok dat uit een spelsituatie komt: op het scherm de animatie
// afspelen, op papier alleen de tekening (de speler is print:hidden).

import { useState } from "react";
import { haalSpelsituatie, type SpelsituatieKort } from "@/app/staf/spelsituaties/actions";
import PlayViewer from "@/components/tactiek/PlayViewer";
import { naarPlayData } from "@/lib/tactiek/vanBordData";

export function SpelsituatieInLes({ id }: { id: string }) {
  const [situatie, setSituatie] = useState<SpelsituatieKort | null | "laden" | "weg">(null);

  async function open() {
    setSituatie("laden");
    const s = await haalSpelsituatie(id);
    setSituatie(s ?? "weg");
  }

  if (situatie === null) {
    return (
      <button type="button" onClick={open} className="mt-1 text-xs font-semibold text-sparta hover:underline print:hidden">
        ▶ Animatie afspelen
      </button>
    );
  }
  if (situatie === "laden") return <p className="mt-1 text-xs text-neutral-400 print:hidden">Laden…</p>;
  if (situatie === "weg") return <p className="mt-1 text-xs text-neutral-400 print:hidden">Deze spelsituatie bestaat niet meer.</p>;

  const play = naarPlayData(situatie.data, situatie.half_veld, situatie.titel, situatie.uitleg ?? "");
  return (
    <div className="mt-2 print:hidden">
      <PlayViewer play={play} veld={situatie.half_veld ? "half" : "heel"} />
      <button type="button" onClick={() => setSituatie(null)} className="mt-2 text-xs text-neutral-500 hover:text-neutral-900">
        Animatie sluiten
      </button>
    </div>
  );
}
