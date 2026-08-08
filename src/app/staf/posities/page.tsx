import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PositieInvul } from "@/components/PositieInvul";
import type { PositieVoorkeur, Speler } from "@/lib/types/database";

export default async function PositiesPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf" || !gebruiker.staf) redirect("/");
  // De inventarisatie is afgerond; alleen de hoofdtrainer kan er nog bij.
  if (!gebruiker.staf.mag_conclusie) redirect("/staf");

  const supabase = await createClient();
  const [{ data: spelers }, { data: voorkeuren }] = await Promise.all([
    supabase.from("spelers").select("id, naam, rugnummer").order("rugnummer", { ascending: true, nullsFirst: false }),
    // RLS beperkt dit al tot de eigen rijen (behalve wie mag_conclusie heeft),
    // maar we filteren voor de zekerheid ook expliciet op de eigen staf_id.
    supabase.from("positie_voorkeuren").select("*").eq("staf_id", gebruiker.staf.id),
  ]);

  const begin: Record<string, { positie_1: string | null; positie_2: string | null; positie_3: string | null }> = {};
  for (const v of (voorkeuren ?? []) as PositieVoorkeur[]) {
    begin[`${v.speler_id}:${v.systeem}`] = {
      positie_1: v.positie_1,
      positie_2: v.positie_2,
      positie_3: v.positie_3,
    };
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar dashboard
      </Link>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-sparta">Positie-inventarisatie</h1>
          <p className="text-sm text-neutral-500">
            Vul per speler je 1e, 2e en 3e positie in — voor elk systeem.
          </p>
        </div>
        {gebruiker.staf.mag_conclusie && (
          <div className="flex shrink-0 flex-col gap-2">
            <Link
              href="/staf/posities/overzicht"
              className="rounded-lg border border-sparta px-3 py-2 text-center text-sm font-semibold text-sparta hover:bg-sparta hover:text-white"
            >
              Uitkomst per speler →
            </Link>
            <Link
              href="/staf/posities/conclusie"
              className="rounded-lg bg-sparta px-3 py-2 text-center text-sm font-semibold text-white hover:bg-sparta-dark"
            >
              Conclusie →
            </Link>
          </div>
        )}
      </div>

      <div className="mt-5">
        <PositieInvul
          spelers={((spelers ?? []) as Pick<Speler, "id" | "naam" | "rugnummer">[]).map((s) => ({
            id: s.id,
            naam: s.naam,
            rugnummer: s.rugnummer,
          }))}
          begin={begin}
        />
      </div>
    </main>
  );
}
