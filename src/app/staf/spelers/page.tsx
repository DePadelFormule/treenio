import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Speler, WedstrijdTotalenView } from "@/lib/types/database";

// Spelerskaarten: lijst van alle spelers, elk naar de volledige kaart.
export default async function SpelersPage() {
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
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar dashboard
      </Link>

      <h1 className="mt-4 mb-6 text-2xl font-bold text-sparta">Spelerskaarten</h1>

      <ul className="grid gap-3 sm:grid-cols-2">
        {((spelers ?? []) as Speler[]).map((s) => {
          const tot = totaalMap.get(s.id);
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
          Nog geen spelers.
        </p>
      )}
    </main>
  );
}
