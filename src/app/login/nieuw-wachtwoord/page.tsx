"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { WachtwoordVeld } from "@/components/WachtwoordVeld";

export default function NieuwWachtwoordPage() {
  const [klaarVoorInvoer, setKlaarVoorInvoer] = useState(false);
  const [nieuw, setNieuw] = useState("");
  const [herhaal, setHerhaal] = useState("");
  const [bezig, setBezig] = useState(false);
  const [gelukt, setGelukt] = useState(false);
  const [melding, setMelding] = useState<{ soort: "ok" | "fout"; tekst: string } | null>(null);

  // De herstellink zet een tijdelijke sessie. Zodra die er is, mag je een
  // nieuw wachtwoord kiezen.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setKlaarVoorInvoer(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setKlaarVoorInvoer(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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
    setGelukt(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sparta-black p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="h-2 bg-sparta" />
        <div className="p-8">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-sparta">Treenio</h1>
            <p className="mt-1 text-sm text-neutral-500">Nieuw wachtwoord instellen</p>
          </div>

          {gelukt ? (
            <div className="space-y-4">
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                Je wachtwoord is gewijzigd. Je kunt nu inloggen.
              </p>
              <Link
                href="/login"
                className="block w-full rounded-lg bg-sparta px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-sparta-dark"
              >
                Naar inloggen
              </Link>
            </div>
          ) : !klaarVoorInvoer ? (
            <div className="space-y-4">
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Open deze pagina via de herstellink uit je e-mail. Zonder geldige link kun je hier geen
                wachtwoord instellen.
              </p>
              <p className="text-center text-sm">
                <Link href="/login/wachtwoord-vergeten" className="text-neutral-500 hover:text-sparta hover:underline">
                  Opnieuw een herstellink aanvragen
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={opslaan} className="space-y-4">
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
                className="w-full rounded-lg bg-sparta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sparta-dark disabled:opacity-50"
              >
                {bezig ? "Bezig…" : "Wachtwoord opslaan"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
