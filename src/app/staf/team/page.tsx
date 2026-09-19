import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TeamTabel, type TeamRij } from "@/components/TeamTabel";
import type {
  Speler,
  WedstrijdTotalenView,
  TrainingOpkomstView,
  TrainingOpkomstGecorrigeerdView,
} from "@/lib/types/database";

// Team: alle spelers, als sorteerbare tabel of als spelerskaarten — dezelfde
// onderliggende cijfers, twee weergaven achter één schakelaar.
export default async function TeamOverzichtPage({
  searchParams,
}: {
  searchParams: Promise<{ weergave?: string }>;
}) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { weergave: weergaveParam } = await searchParams;
  const weergave = weergaveParam === "kaarten" ? "kaarten" : "tabel";

  const supabase = await createClient();
  const [{ data: spelers }, { data: totalen }, { data: opkomst }, { data: opkomstGecorrigeerd }] = await Promise.all([
    supabase.from("spelers").select("*").order("rugnummer", { ascending: true, nullsFirst: false }),
    supabase.from("v_wedstrijd_totalen").select("*"),
    supabase.from("v_training_opkomst").select("*"),
    supabase.from("v_training_opkomst_gecorrigeerd").select("*"),
  ]);

  const totaalMap = new Map<string, WedstrijdTotalenView>();
  for (const t of (totalen ?? []) as WedstrijdTotalenView[]) totaalMap.set(t.speler_id, t);

  const opkomstMap = new Map<string, TrainingOpkomstView>();
  for (const o of (opkomst ?? []) as TrainingOpkomstView[]) opkomstMap.set(o.speler_id, o);

  const opkomstGecorrigeerdMap = new Map<string, TrainingOpkomstGecorrigeerdView>();
  for (const o of (opkomstGecorrigeerd ?? []) as TrainingOpkomstGecorrigeerdView[]) opkomstGecorrigeerdMap.set(o.speler_id, o);

  const rows: TeamRij[] = ((spelers ?? []) as Speler[]).map((s) => {
    const t = totaalMap.get(s.id);
    const o = opkomstMap.get(s.id);
    const og = opkomstGecorrigeerdMap.get(s.id);
    return {
      id: s.id,
      rugnummer: s.rugnummer,
      naam: s.naam,
      status: s.beschikbaarheid,
      positie: s.hoofdpositie,
      opkomst: o?.opkomst_pct ?? null,
      opkomstGecorrigeerd: og?.opkomst_pct_gecorrigeerd ?? null,
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

      <div className="mt-4 mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sparta">Team</h1>
        <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 text-sm">
          <Link
            href="/staf/team?weergave=tabel"
            className={`rounded-md px-3 py-1 font-medium ${weergave === "tabel" ? "bg-white text-sparta shadow-sm" : "text-neutral-500"}`}
          >
            Tabel
          </Link>
          <Link
            href="/staf/team?weergave=kaarten"
            className={`rounded-md px-3 py-1 font-medium ${weergave === "kaarten" ? "bg-white text-sparta shadow-sm" : "text-neutral-500"}`}
          >
            Kaarten
          </Link>
        </div>
      </div>

      {weergave === "tabel" ? (
        <>
          <p className="mb-6 text-sm text-neutral-500">
            Tik op een kolomkop om te sorteren (nog eens tikken draait de volgorde om). Tik op een
            rugnummer om het aan te passen.
          </p>
          {rows.length > 0 ? (
            <TeamTabel rows={rows} />
          ) : (
            <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
              Nog geen spelers.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="mb-6 text-sm text-neutral-500">Tik op een speler voor de volledige kaart.</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {((spelers ?? []) as Speler[]).map((s) => {
              const t = totaalMap.get(s.id);
              return (
                <li key={s.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sparta/10 font-bold text-sparta">
                    {s.rugnummer ?? "–"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/staf/speler/${s.id}`} className="font-medium text-neutral-800 hover:text-sparta hover:underline">
                      {s.naam}
                    </Link>
                    <p className="text-xs text-neutral-400">
                      {s.hoofdpositie ?? "positie onbekend"}
                      {[s.alt_positie_1, s.alt_positie_2].filter(Boolean).length > 0 &&
                        ` · ${[s.alt_positie_1, s.alt_positie_2].filter(Boolean).join("/")}`}
                    </p>
                  </div>
                  <div className="text-right text-xs text-neutral-500">
                    <span className="font-semibold text-neutral-800">{t?.goals ?? 0}</span> G
                    {" · "}
                    <span className="font-semibold text-neutral-800">{t?.assists ?? 0}</span> A
                  </div>
                </li>
              );
            })}
          </ul>
          {(!spelers || spelers.length === 0) && (
            <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
              Nog geen spelers.
            </p>
          )}
        </>
      )}
    </main>
  );
}
