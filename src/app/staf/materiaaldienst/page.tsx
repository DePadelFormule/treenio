import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MateriaaldienstLijst } from "@/components/MateriaaldienstLijst";
import { bouwRooster, maandagVan, sorteerSpelers, TAKEN, WEDSTRIJD_NOTITIE, type WeekRij } from "@/lib/materiaaldienst";
import type { Speler } from "@/lib/types/database";

export default async function MateriaaldienstPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const supabase = await createClient();
  const [{ data: spelers }, { data: rijen }] = await Promise.all([
    supabase.from("spelers").select("id, naam, gast").order("naam"),
    supabase.from("materiaaldienst_weken").select("week_start, speler_a, speler_b, vakantie, gedaan, handmatig"),
  ]);

  const selectie = sorteerSpelers(
    ((spelers ?? []) as Pick<Speler, "id" | "naam" | "gast">[]).filter((s) => !s.gast).map((s) => ({ id: s.id, naam: s.naam })),
  );
  const weken = bouwRooster(selectie, (rijen ?? []) as WeekRij[]);
  const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  const huidigeWeek = maandagVan(vandaag);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar dashboard
      </Link>

      <h1 className="mt-4 mb-1 text-2xl font-bold text-sparta">Materiaaldienst</h1>
      <p className="mb-4 text-sm text-neutral-500">
        Elke week zijn twee spelers verantwoordelijk voor de materialen, alfabetisch en doorlopend. Vink een week af als het gedaan is; een vakantieweek slaat het rooster over.
      </p>

      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Wat hoort erbij</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
          {TAKEN.map((t) => <li key={t}>{t}</li>)}
        </ul>
        <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600">{WEDSTRIJD_NOTITIE}</p>
      </div>

      <MateriaaldienstLijst weken={weken} spelers={selectie} huidigeWeek={huidigeWeek} />
    </main>
  );
}
