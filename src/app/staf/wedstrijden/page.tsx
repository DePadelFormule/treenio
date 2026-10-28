import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { nieuweWedstrijd, verwijderWedstrijd } from "./actions";
import { PlakProgramma } from "@/components/PlakProgramma";
import { VerwijderKnop } from "@/components/VerwijderKnop";
import { WedstrijdTypeKiezer } from "@/components/WedstrijdTypeKiezer";
import { WedstrijdTijdInput } from "@/components/WedstrijdTijdInput";
import { WedstrijdFaseKiezer } from "@/components/WedstrijdFaseKiezer";
import type { Wedstrijd } from "@/lib/types/database";

export default async function WedstrijdenPage({
  searchParams,
}: {
  searchParams: Promise<{ fase?: string }>;
}) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { fase: faseParam } = await searchParams;

  const supabase = await createClient();
  const { data: alleWedstrijden } = await supabase
    .from("wedstrijden")
    .select("*")
    .order("datum", { ascending: true });

  const alle = (alleWedstrijden ?? []) as Wedstrijd[];
  const faseOpties = [...new Set(alle.map((w) => w.fase).filter((f): f is number => f != null))].sort((a, b) => a - b);
  const volgendeFase = (faseOpties.at(-1) ?? 0) + 1;

  const faseFilter = faseParam && /^\d+$/.test(faseParam) ? Number(faseParam) : null;
  const wedstrijden = faseFilter != null ? alle.filter((w) => w.fase === faseFilter) : alle;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar dashboard
      </Link>

      <div className="mt-4 mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sparta">Wedstrijden</h1>
        <Link href="/staf/opstelling-formulier" className="text-sm font-semibold text-sparta hover:underline">
          📝 Leeg opstellingsformulier
        </Link>
      </div>

      {/* Programma plakken vanaf voetbal.nl */}
      <div className="mb-6">
        <PlakProgramma volgendeFase={volgendeFase} />
      </div>

      {/* Snelle toevoeging */}
      <form action={nieuweWedstrijd} className="mb-6 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-[auto_1fr_auto_auto_auto_auto_auto]">
        <input type="date" name="datum" required className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        <input type="text" name="tegenstander" placeholder="Tegenstander" required className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        <input type="time" name="tijd" title="Aanvangstijd" className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        <input type="text" name="uitslag" placeholder="Uitslag (bijv. 3-1)" className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        <input type="number" name="fase" min={1} defaultValue={volgendeFase} title="Fase" className="w-20 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        <select name="type" defaultValue="competitie" className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="competitie">Competitie</option>
          <option value="beker">Beker</option>
          <option value="vriendschappelijk">Vriendschappelijk</option>
        </select>
        <button type="submit" className="rounded-lg bg-sparta px-4 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark">
          Toevoegen
        </button>
      </form>

      {/* Fase-filter */}
      {faseOpties.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Link
            href="/staf/wedstrijden"
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              faseFilter == null ? "bg-sparta text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Alle
          </Link>
          {faseOpties.map((f) => (
            <Link
              key={f}
              href={`/staf/wedstrijden?fase=${f}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                faseFilter === f ? "bg-sparta text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              Fase {f}
            </Link>
          ))}
        </div>
      )}

      <ul className="space-y-2">
        {wedstrijden.map((w) => (
          <li key={w.id} className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-neutral-800">{w.tegenstander}</p>
              <p className="mb-1.5 text-xs text-neutral-400">{w.datum}{w.uitslag ? ` · ${w.uitslag}` : ""}</p>
              <span className="flex flex-wrap items-center gap-2">
                <WedstrijdTijdInput id={w.id} begin={w.tijd ?? ""} />
                <WedstrijdTypeKiezer id={w.id} begin={w.type ?? "competitie"} />
                <WedstrijdFaseKiezer id={w.id} begin={w.fase ?? null} faseOpties={faseOpties} />
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/staf/wedstrijd/${w.id}/opstelling`}
                className="rounded-lg border border-sparta px-3 py-1.5 text-sm font-semibold text-sparta hover:bg-sparta hover:text-white"
              >
                Opstelling
              </Link>
              <Link
                href={`/staf/wedstrijd/${w.id}/verslag`}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-600 hover:border-sparta hover:text-sparta"
              >
                Verslag
              </Link>
              <Link
                href={`/staf/wedstrijd/${w.id}/live`}
                className="rounded-lg bg-sparta px-3 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark"
              >
                Live →
              </Link>
              <VerwijderKnop
                action={verwijderWedstrijd}
                id={w.id}
                bevestig={`Wedstrijd tegen ${w.tegenstander} verwijderen? Ook de opstelling en alle genoteerde events gaan weg.`}
              />
            </div>
          </li>
        ))}
      </ul>

      {wedstrijden.length === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          {faseFilter != null ? "Geen wedstrijden in deze fase." : "Nog geen wedstrijden. Voeg er hierboven één toe."}
        </p>
      )}
    </main>
  );
}
