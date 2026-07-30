"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function WachtwoordVergetenPage() {
  const [email, setEmail] = useState("");
  const [bezig, setBezig] = useState(false);
  const [verstuurd, setVerstuurd] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  // Kwam je hier terug via een mislukte herstellink (verlopen of al gebruikt),
  // leg dan uit wat er aan de hand is in plaats van een kale fout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("fout") === "link") {
      setFout("De herstellink is verlopen of al gebruikt. Vraag hieronder een nieuwe aan.");
    }
  }, []);

  async function versturen(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    setBezig(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/login/nieuw-wachtwoord`,
    });
    setBezig(false);
    if (error) {
      setFout("Er ging iets mis: " + error.message);
      return;
    }
    setVerstuurd(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sparta-black p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="h-2 bg-sparta" />
        <div className="p-8">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-sparta">Treenio</h1>
            <p className="mt-1 text-sm text-neutral-500">Wachtwoord vergeten</p>
          </div>

          {verstuurd ? (
            <div className="space-y-4">
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                Als er een account bij <span className="font-medium">{email}</span> hoort, is er een e-mail met
                herstel­link verstuurd. Check je inbox.
              </p>
              <p className="text-center text-sm">
                <Link href="/login" className="text-neutral-500 hover:text-sparta hover:underline">
                  ← Terug naar inloggen
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={versturen} className="space-y-4">
              <p className="text-sm text-neutral-500">
                Vul je e-mailadres in; je krijgt een link om een nieuw wachtwoord in te stellen.
              </p>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-sparta focus:ring-2 focus:ring-sparta/30"
                />
              </div>

              {fout && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{fout}</p>}

              <button
                type="submit"
                disabled={bezig}
                className="w-full rounded-lg bg-sparta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sparta-dark disabled:opacity-50"
              >
                {bezig ? "Bezig…" : "Herstellink versturen"}
              </button>
              <p className="text-center text-sm">
                <Link href="/login" className="text-neutral-500 hover:text-sparta hover:underline">
                  ← Terug naar inloggen
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
