"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bewaarHoofdstuk, verwijderHoofdstuk } from "@/app/staf/academy/actions";

export function AcademyHoofdstukKop({ id, beginTitel, beginVolgorde }: { id: string; beginTitel: string; beginVolgorde: number }) {
  const [titel, setTitel] = useState(beginTitel);
  const [volgorde, setVolgorde] = useState(beginVolgorde);
  const [bezig, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok">("idle");
  const router = useRouter();

  function opslaan() {
    setStatus("idle");
    start(async () => {
      const res = await bewaarHoofdstuk(id, titel, volgorde);
      if (res.ok) setStatus("ok");
    });
  }

  function verwijderen() {
    if (!confirm(`Hoofdstuk "${titel}" verwijderen? Alle secties en quizvragen erin gaan ook weg.`)) return;
    const fd = new FormData();
    fd.set("id", id);
    start(async () => { await verwijderHoofdstuk(fd); router.push("/staf/academy"); });
  }

  return (
    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <label className="flex-1 text-sm">
        <span className="mb-1 block text-xs text-neutral-500">Titel</span>
        <input
          value={titel} onChange={(e) => { setTitel(e.target.value); setStatus("idle"); }}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-lg font-bold"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs text-neutral-500">Volgorde</span>
        <input
          type="number" value={volgorde} onChange={(e) => { setVolgorde(Number(e.target.value)); setStatus("idle"); }}
          className="w-20 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>
      <button type="button" onClick={opslaan} disabled={bezig} className="rounded-lg bg-sparta px-4 py-2 text-sm font-semibold text-white hover:bg-sparta-dark disabled:opacity-50">
        Opslaan
      </button>
      {status === "ok" && <span className="text-sm text-sparta">✓ Opgeslagen</span>}
      <button type="button" onClick={verwijderen} className="ml-auto text-sm text-neutral-400 hover:text-red-600">
        Hoofdstuk verwijderen
      </button>
    </div>
  );
}
