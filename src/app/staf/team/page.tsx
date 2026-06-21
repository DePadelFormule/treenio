import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  Speler,
  WedstrijdTotalenView,
  TrainingOpkomstView,
} from "@/lib/types/database";

// Team-overzicht: alle spelers onder elkaar met de kerncijfers in één tabel.
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

  const lijst = (spelers ?? []) as Speler[];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar dashboard
      </Link>

      <h1 className="mt-4 mb-6 text-2xl font-bold text-sparta">Team-overzicht</h1>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">Naam</th>
              <th className="px-3 py-3">Positie</th>
              <th className="px-3 py-3 text-center">Opkomst</th>
              <th className="px-3 py-3 text-center">Te laat</th>
              <th className="px-3 py-3 text-center">Speelmin.</th>
              <th className="px-3 py-3 text-center">Goals</th>
              <th className="px-3 py-3 text-center">Assists</th>
              <th className="px-3 py-3 text-center">🟨</th>
              <th className="px-3 py-3 text-center">🟥</th>
            </tr>
          </thead>
          <tbody>
            {lijst.map((s) => {
              const t = totaalMap.get(s.id);
              const o = opkomstMap.get(s.id);
              return (
                <tr key={s.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-3 py-2.5 font-bold text-sparta">{s.rugnummer ?? "–"}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/staf/speler/${s.id}`} className="font-medium text-neutral-800 hover:text-sparta hover:underline">
                      {s.naam}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-600">{s.hoofdpositie ?? "—"}</td>
                  <td className="px-3 py-2.5 text-center">{o?.opkomst_pct != null ? `${o.opkomst_pct}%` : "—"}</td>
                  <td className={`px-3 py-2.5 text-center ${o && o.te_laat_gekomen > 0 ? "font-semibold text-sparta" : ""}`}>
                    {o?.te_laat_gekomen ?? 0}
                  </td>
                  <td className="px-3 py-2.5 text-center">{t?.totaal_minuten ?? 0}</td>
                  <td className="px-3 py-2.5 text-center font-semibold">{t?.goals ?? 0}</td>
                  <td className="px-3 py-2.5 text-center font-semibold">{t?.assists ?? 0}</td>
                  <td className="px-3 py-2.5 text-center">{t?.gele_kaarten ?? 0}</td>
                  <td className="px-3 py-2.5 text-center">{t?.rode_kaarten ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {lijst.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Nog geen spelers.
        </p>
      )}

      <p className="mt-3 text-xs text-neutral-400">
        Tik op een naam voor de volledige spelerskaart. Cijfers tellen automatisch
        op uit de wedstrijd- en trainingsregistraties.
      </p>
    </main>
  );
}
