import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { nieuweWedstrijd, verwijderWedstrijd } from "./actions";
import { ImporteerProgrammaKnop } from "@/components/ImporteerProgrammaKnop";
import { PlakProgramma } from "@/components/PlakProgramma";
import { VerwijderKnop } from "@/components/VerwijderKnop";
import type { Wedstrijd } from "@/lib/types/database";

export default async function WedstrijdenPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const supabase = await createClient();
  const { data: wedstrijden } = await supabase
    .from("wedstrijden")
    .select("*")
    .order("datum", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar dashboard
      </Link>

      <h1 className="mt-4 mb-4 text-2xl font-bold text-sparta">Wedstrijden</h1>

      {/* Programma plakken vanaf voetbal.nl — werkt zonder KNVB-koppeling */}
      <div className="mb-4">
        <PlakProgramma />
      </div>

      {/* Programma uit voetbal.nl (KNVB Dataservice) */}
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4">
        <ImporteerProgrammaKnop />
        <p className="mt-2 text-xs text-neutral-400">
          Haalt het wedstrijdprogramma automatisch op uit de KNVB Dataservice.
          Vereist een Club.Dataservice-key van de club; zolang die er niet is,
          gebruik je hierboven &quot;Programma plakken&quot;.
        </p>
      </div>

      {/* Snelle toevoeging */}
      <form action={nieuweWedstrijd} className="mb-8 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-[auto_1fr_auto_auto]">
        <input type="date" name="datum" required className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        <input type="text" name="tegenstander" placeholder="Tegenstander" required className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        <input type="text" name="uitslag" placeholder="Uitslag (bijv. 3-1)" className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        <button type="submit" className="rounded-lg bg-sparta px-4 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark">
          Toevoegen
        </button>
      </form>

      <ul className="space-y-2">
        {((wedstrijden ?? []) as Wedstrijd[]).map((w) => (
          <li key={w.id} className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-neutral-800">{w.tegenstander}</p>
              <p className="text-xs text-neutral-400">{w.datum}{w.uitslag ? ` · ${w.uitslag}` : ""}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/staf/wedstrijd/${w.id}/opstelling`}
                className="rounded-lg border border-sparta px-3 py-1.5 text-sm font-semibold text-sparta hover:bg-sparta hover:text-white"
              >
                Opstelling
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

      {(!wedstrijden || wedstrijden.length === 0) && (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Nog geen wedstrijden. Voeg er hierboven één toe.
        </p>
      )}
    </main>
  );
}
