import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import type { Speler, WedstrijdTotalenView } from "@/lib/types/database";

// Staf-dashboard: overzicht van de selectie met goals/assists per speler.
export default async function StafPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const supabase = await createClient();
  const [{ data: spelers }, { data: totalen }] = await Promise.all([
    supabase.from("spelers").select("*").order("rugnummer", { ascending: true, nullsFirst: false }),
    supabase.from("v_wedstrijd_totalen").select("*"),
  ]);

  const totaalMap = new Map<string, WedstrijdTotalenView>();
  for (const t of (totalen ?? []) as WedstrijdTotalenView[]) totaalMap.set(t.speler_id, t);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-pitch">Stafdashboard</h1>
          <p className="text-sm text-neutral-500">
            {gebruiker.staf?.naam} · {gebruiker.staf?.rol}
          </p>
        </div>
        <SignOutButton />
      </header>

      <nav className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/staf/wedstrijden"
          className="rounded-lg bg-pitch px-3 py-1.5 text-sm font-semibold text-white hover:bg-pitch-dark"
        >
          Wedstrijden →
        </Link>
        <Link
          href="/staf/trainingen"
          className="rounded-lg bg-pitch px-3 py-1.5 text-sm font-semibold text-white hover:bg-pitch-dark"
        >
          Trainingen (presentie) →
        </Link>
      </nav>

      <h2 className="mb-3 text-lg font-semibold text-neutral-800">Selectie</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {((spelers ?? []) as Speler[]).map((s) => {
          const tot = totaalMap.get(s.id);
          return (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pitch/10 font-bold text-pitch">
                {s.rugnummer ?? "–"}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/staf/speler/${s.id}`}
                  className="font-medium text-neutral-800 hover:text-pitch hover:underline"
                >
                  {s.naam}
                </Link>
                <p className="text-xs text-neutral-400">
                  {s.hoofdpositie ?? "positie onbekend"}
                  {[s.alt_positie_1, s.alt_positie_2].filter(Boolean).length > 0 &&
                    ` · ${[s.alt_positie_1, s.alt_positie_2].filter(Boolean).join("/")}`}
                </p>
              </div>
              <div className="text-right text-xs text-neutral-500">
                <span className="font-semibold text-neutral-800">{tot?.goals ?? 0}</span> G
                {" · "}
                <span className="font-semibold text-neutral-800">{tot?.assists ?? 0}</span> A
              </div>
            </li>
          );
        })}
      </ul>

      {(!spelers || spelers.length === 0) && (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Nog geen spelers. Voeg ze toe in Supabase of via een latere beheer-flow.
        </p>
      )}
    </main>
  );
}
