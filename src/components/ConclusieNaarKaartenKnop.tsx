"use client";

import { useState, useTransition } from "react";
import { zetConclusieInSpelerskaarten } from "@/app/staf/posities/actions";

// Zet de uitkomst van de inventarisatie in één keer op de spelerskaarten
// (hoofdpositie + twee alternatieven per speler).
export function ConclusieNaarKaartenKnop() {
  const [bezig, start] = useTransition();
  const [bericht, setBericht] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function klik() {
    if (
      !confirm(
        "De drie sterkste posities per speler worden op de spelerskaarten gezet (hoofdpositie + 2 alternatieven). Bestaande positievelden worden overschreven. Doorgaan?",
      )
    )
      return;
    setBericht(null);
    start(async () => {
      const res = await zetConclusieInSpelerskaarten();
      setOk(res.ok);
      setBericht(res.bericht);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={klik}
        disabled={bezig}
        className="rounded-lg border border-sparta px-3 py-2 text-sm font-semibold text-sparta hover:bg-sparta hover:text-white disabled:opacity-50"
      >
        {bezig ? "Bezig…" : "Zet uitkomst op spelerskaarten"}
      </button>
      {bericht && (
        <span className={`text-sm ${ok ? "text-sparta" : "text-amber-600"}`}>{bericht}</span>
      )}
    </div>
  );
}
