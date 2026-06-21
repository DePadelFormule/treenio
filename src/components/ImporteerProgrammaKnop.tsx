"use client";

import { useState, useTransition } from "react";
import { importeerProgramma } from "@/app/staf/wedstrijden/actions";

export function ImporteerProgrammaKnop() {
  const [bezig, start] = useTransition();
  const [bericht, setBericht] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function klik() {
    setBericht(null);
    start(async () => {
      const res = await importeerProgramma();
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
        className="rounded-lg border border-sparta px-4 py-1.5 text-sm font-semibold text-sparta transition hover:bg-sparta hover:text-white disabled:opacity-40"
      >
        {bezig ? "Ophalen…" : "Programma ophalen (KNVB)"}
      </button>
      {bericht && (
        <span className={`text-sm ${ok ? "text-sparta" : "text-amber-600"}`}>{bericht}</span>
      )}
    </div>
  );
}
