import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SYSTEMEN } from "@/lib/posities";
import { OverzichtWeergave } from "@/components/OverzichtWeergave";
import type { OverzichtRij, TrainerKeuze } from "@/components/OverzichtWeergave";
import type { PositieVoorkeur, Speler, Staf, Systeem } from "@/lib/types/database";

export default async function OverzichtPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf" || !gebruiker.staf) redirect("/");
  if (!gebruiker.staf.mag_conclusie) redirect("/staf/posities");

  const supabase = await createClient();
  const [{ data: spelers }, { data: staf }, { data: voorkeuren }] = await Promise.all([
    supabase.from("spelers").select("id, naam, rugnummer").order("rugnummer", { ascending: true, nullsFirst: false }),
    supabase.from("staf").select("id, naam"),
    supabase.from("positie_voorkeuren").select("*"),
  ]);

  const naamVanTrainer = new Map<string, string>();
  for (const s of (staf ?? []) as Pick<Staf, "id" | "naam">[]) naamVanTrainer.set(s.id, s.naam);

  // Index: speler_id → systeem → staf_id → codes
  const idx = new Map<string, Map<Systeem, Map<string, [string | null, string | null, string | null]>>>();
  for (const v of (voorkeuren ?? []) as PositieVoorkeur[]) {
    if (!idx.has(v.speler_id)) idx.set(v.speler_id, new Map());
    const perSys = idx.get(v.speler_id)!;
    if (!perSys.has(v.systeem)) perSys.set(v.systeem, new Map());
    perSys.get(v.systeem)!.set(v.staf_id, [v.positie_1, v.positie_2, v.positie_3]);
  }

  const rijen: OverzichtRij[] = ((spelers ?? []) as Pick<Speler, "id" | "naam" | "rugnummer">[]).map((sp) => {
    const perSysteem = {} as Record<Systeem, TrainerKeuze[]>;
    for (const sys of SYSTEMEN) {
      const perTrainer = idx.get(sp.id)?.get(sys);
      const lijst: TrainerKeuze[] = [];
      if (perTrainer) {
        for (const [stafId, codes] of perTrainer) {
          lijst.push({ trainerNaam: naamVanTrainer.get(stafId) ?? "Onbekend", codes });
        }
        lijst.sort((a, b) => a.trainerNaam.localeCompare(b.trainerNaam));
      }
      perSysteem[sys] = lijst;
    }
    return { spelerNaam: sp.naam, rugnummer: sp.rugnummer, perSysteem };
  });

  const heeftKeuzes = (voorkeuren ?? []).length > 0;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/staf/posities" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar invullen
      </Link>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-sparta">Keuzes per trainer</h1>
          <p className="text-sm text-neutral-500">
            Per speler zie je wat elke trainer koos (1e · 2e · 3e). Wissel bovenaan van systeem.
          </p>
        </div>
        <Link
          href="/staf/posities/conclusie"
          className="shrink-0 rounded-lg bg-sparta px-3 py-2 text-sm font-semibold text-white hover:bg-sparta-dark"
        >
          Conclusie →
        </Link>
      </div>

      <div className="mt-5">
        {heeftKeuzes ? (
          <OverzichtWeergave rijen={rijen} />
        ) : (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
            Nog geen enkele trainer heeft posities ingevuld.
          </p>
        )}
      </div>
    </main>
  );
}
