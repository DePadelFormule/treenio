import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OpstellingBord } from "@/components/OpstellingBord";
import { WedstrijdAfmeldingen } from "@/components/WedstrijdAfmeldingen";
import { voegGastToe } from "./actions";
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

  const [{ data: spelers }, { data: opstelling }, { data: registraties }] = await Promise.all([
    supabase.from("spelers").select("*").order("rugnummer", { ascending: true, nullsFirst: false }),
    supabase.from("wedstrijd_opstelling").select("*").eq("wedstrijd_id", id).maybeSingle(),
    supabase.from("wedstrijd_registraties").select("speler_id, afmeld_status").eq("wedstrijd_id", id),
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
    naam: s.gast ? `${s.naam} (gast)` : s.naam,
    status: s.beschikbaarheid,
  }));

  const nietFit = alleSpelers.filter((s) => s.beschikbaarheid !== "fit");

  // Spelers buiten de selectie (niet in het veld, niet op de bank) — voor het
  // afmeldingen-blok. Bijgewerkt zodra de opstelling opnieuw is opgeslagen.
  const inSelectie = new Set([...Object.values(begin.veld).filter(Boolean), ...begin.bank]);
  const buitenSelectie = alleSpelers
    .filter((s) => !inSelectie.has(s.id))
    .map((s) => ({ id: s.id, naam: s.naam, rugnummer: s.rugnummer }));
  const afmeldBegin: Record<string, string> = {};
  for (const r of (registraties ?? []) as { speler_id: string; afmeld_status: string }[]) {
    if (r.afmeld_status && r.afmeld_status !== "nvt") afmeldBegin[r.speler_id] = r.afmeld_status;
  }

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

      {/* Gastspeler toevoegen */}
      <form action={voegGastToe} className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <input type="hidden" name="wedstrijd_id" value={id} />
        <label className="flex-1 text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Gastspeler (bijv. uit een ander team)</span>
          <input type="text" name="naam" required placeholder="Naam" className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Rugnr</span>
          <input type="text" name="rugnummer" inputMode="numeric" placeholder="—" className="w-16 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <button type="submit" className="rounded-lg bg-sparta px-4 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark">
          + Gast toevoegen
        </button>
        <p className="w-full text-xs text-neutral-400">
          Een gast is daarna te kiezen in de opstelling en de live-registratie, maar telt niet mee
          in de trainingen-presentie en de vragenlijst.
        </p>
      </form>

      <WedstrijdAfmeldingen wedstrijdId={id} spelers={buitenSelectie} begin={afmeldBegin} />

      <p className="mt-6 text-xs text-neutral-400">
        Tik op een positie om een speler te kiezen. Kies onderaan spelers voor de bank.
      </p>
    </main>
  );
}
