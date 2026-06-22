import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OpstellingBord } from "@/components/OpstellingBord";
import type { Speler, Wedstrijd, WedstrijdOpstelling } from "@/lib/types/database";

export default async function OpstellingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { id } = await params;
  const supabase = await createClient();

  const { data: wedstrijd } = await supabase
    .from("wedstrijden").select("*").eq("id", id).maybeSingle();
  if (!wedstrijd) notFound();
  const w = wedstrijd as Wedstrijd;

  const [{ data: spelers }, { data: opstelling }] = await Promise.all([
    supabase.from("spelers").select("*").order("rugnummer", { ascending: true, nullsFirst: false }),
    supabase.from("wedstrijd_opstelling").select("*").eq("wedstrijd_id", id).maybeSingle(),
  ]);

  const o = opstelling as WedstrijdOpstelling | null;
  const begin = {
    formatie: o?.formatie ?? "4-3-3",
    veld: o?.veld ?? {},
    bank: o?.bank ?? [],
  };

  const alleSpelers = (spelers ?? []) as Speler[];
  const spelerLijst = alleSpelers.map((s) => ({
    id: s.id,
    rugnummer: s.rugnummer,
    naam: s.naam,
    status: s.beschikbaarheid,
  }));

  const nietFit = alleSpelers.filter((s) => s.beschikbaarheid !== "fit");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/staf/wedstrijden" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar wedstrijden
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-sparta">Opstelling</h1>
        <p className="text-sm text-neutral-500">
          {w.datum} · {w.tegenstander}
        </p>
      </header>

      {nietFit.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
          <span className="font-semibold text-amber-800">Let op — niet fit: </span>
          {nietFit.map((s, i) => (
            <span key={s.id} className="text-amber-800">
              {i > 0 ? ", " : ""}{s.naam} {s.beschikbaarheid === "geblesseerd" ? "🔴" : "🟡"}
            </span>
          ))}
        </div>
      )}

      <OpstellingBord wedstrijdId={id} spelers={spelerLijst} begin={begin} />

      <p className="mt-6 text-xs text-neutral-400">
        Tik op een positie om een speler te kiezen. Kies onderaan spelers voor de bank.
      </p>
    </main>
  );
}
