"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { WachtwoordVeld } from "@/components/WachtwoordVeld";

export function WachtwoordWijzigen() {
  const [nieuw, setNieuw] = useState("");
  const [herhaal, setHerhaal] = useState("");
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<{ soort: "ok" | "fout"; tekst: string } | null>(null);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setMelding(null);

    if (nieuw.length < 6) {
      setMelding({ soort: "fout", tekst: "Kies een wachtwoord van minstens 6 tekens." });
      return;
    }
    if (nieuw !== herhaal) {
      setMelding({ soort: "fout", tekst: "De twee wachtwoorden zijn niet gelijk." });
      return;
    }

    setBezig(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: nieuw });
    setBezig(false);

    if (error) {
      setMelding({ soort: "fout", tekst: "Wijzigen mislukt: " + error.message });
      return;
    }
    setNieuw("");
    setHerhaal("");
    setMelding({ soort: "ok", tekst: "Je wachtwoord is gewijzigd." });
  }

  return (
    <form onSubmit={opslaan} className="max-w-sm space-y-4">
      <WachtwoordVeld id="nieuw" label="Nieuw wachtwoord" autoComplete="new-password" value={nieuw} onChange={setNieuw} />
      <WachtwoordVeld id="herhaal" label="Herhaal wachtwoord" autoComplete="new-password" value={herhaal} onChange={setHerhaal} />

      {melding && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            melding.soort === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {melding.tekst}
        </p>
      )}

      <button
        type="submit"
        disabled={bezig}
        className="rounded-lg bg-sparta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sparta-dark disabled:opacity-50"
      >
        {bezig ? "Bezig…" : "Wachtwoord wijzigen"}
      </button>
    </form>
  );
}
