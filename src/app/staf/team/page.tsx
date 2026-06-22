import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TeamTabel, type TeamRij } from "@/components/TeamTabel";
import type {
  Speler,
  WedstrijdTotalenView,
  TrainingOpkomstView,
} from "@/lib/types/database";

// Team-overzicht: alle spelers in één sorteerbare tabel.
export default async function TeamOverzichtPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const supabase = await createClient();
  const [{ data: spelers }, { data: totalen }, { data: opkomst }] = await Promise.all([
    supabase.from("spelers").select("*").order("rugnummer", { ascending: true, nullsFirst: false }),
    supabase.from("v_wedstrijd_totalen").select("*"),
    supabase.from("v_training_opkomst").select("*"),
  ]);

  const totaalMap = new Map<string, WedstrijdTotalenView>();
  for (const t of (totalen ?? []) as WedstrijdTotalenView[]) totaalMap.set(t.speler_id, t);

  const opkomstMap = new Map<string, TrainingOpkomstView>();
  for (const o of (opkomst ?? []) as TrainingOpkomstView[]) opkomstMap.set(o.speler_id, o);

  const rows: TeamRij[] = ((spelers ?? []) as Speler[]).map((s) => {
    const t = totaalMap.get(s.id);
    const o = opkomstMap.get(s.id);
    return {
      id: s.id,
      rugnummer: s.rugnummer,
      naam: s.naam,
      status: s.beschikbaarheid,
      positie: s.hoofdpositie,
      opkomst: o?.opkomst_pct ?? null,
      teLaat: o?.te_laat_gekomen ?? 0,
      minuten: t?.totaal_minuten ?? 0,
      goals: t?.goals ?? 0,
      assists: t?.assists ?? 0,
      geel: t?.gele_kaarten ?? 0,
      rood: t?.rode_kaarten ?? 0,
    };
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar dashboard
      </Link>

      <h1 className="mt-4 mb-2 text-2xl font-bold text-sparta">Team-overzicht</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Tik op een kolomkop om te sorteren (nog eens tikken draait de volgorde om).
      </p>

      {rows.length > 0 ? (
        <TeamTabel rows={rows} />
      ) : (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Nog geen spelers.
        </p>
      )}
    </main>
  );
}
