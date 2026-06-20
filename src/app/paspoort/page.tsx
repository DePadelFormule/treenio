import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PlayerCard } from "@/components/PlayerCard";
import { SignOutButton } from "@/components/SignOutButton";
import type {
  Badge,
  Ontwikkeldoel,
  SeizoenAward,
  SpelerRecord,
} from "@/lib/types/database";

// Speler-paspoort: het eigen kaartje + de eigen ontwikkeldoelen (Laag 2).
// Staf-only Laag 3 verschijnt hier bewust NIET — die tabel geeft via RLS
// sowieso geen rij terug aan een speler.
export default async function PaspoortPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol === "staf") redirect("/staf");
  if (gebruiker.rol !== "speler" || !gebruiker.speler) redirect("/geen-koppeling");

  const speler = gebruiker.speler;
  const supabase = await createClient();

  const [{ data: badges }, { data: records }, { data: doelen }, { data: awards }] =
    await Promise.all([
      supabase.from("badges").select("*").eq("speler_id", speler.id).order("behaald_op", { ascending: false }),
      supabase.from("records").select("*").eq("speler_id", speler.id).order("behaald_op", { ascending: false }),
      supabase.from("ontwikkeldoelen").select("*").eq("speler_id", speler.id).order("afgesproken_op", { ascending: false }),
      supabase.from("seizoen_awards").select("*").eq("speler_id", speler.id).order("toegekend_op", { ascending: false }),
    ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-pitch">Mijn paspoort</h1>
          <p className="text-sm text-neutral-500">Hoi {speler.naam.split(" ")[0]} 👋</p>
        </div>
        <SignOutButton />
      </header>

      <div className="grid gap-8 md:grid-cols-[auto_1fr]">
        <div className="flex justify-center">
          <PlayerCard
            speler={speler}
            badges={(badges ?? []) as Badge[]}
            records={(records ?? []) as SpelerRecord[]}
          />
        </div>

        <div className="space-y-8">
          {awards && awards.length > 0 ? (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-neutral-800">
                Mijn prijzen 🏆
              </h2>
              <ul className="flex flex-wrap gap-2">
                {(awards as SeizoenAward[]).map((a) => (
                  <li
                    key={a.id}
                    className="rounded-xl border border-gold/60 bg-gold/10 px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-amber-700">
                      {a.categorie.replaceAll("_", " ")}
                    </span>
                    <span className="ml-1 text-xs text-neutral-500">{a.seizoen}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
          <h2 className="mb-3 text-lg font-semibold text-neutral-800">
            Mijn ontwikkeldoelen
          </h2>
          {doelen && doelen.length > 0 ? (
            <ul className="space-y-2">
              {(doelen as Ontwikkeldoel[]).map((d) => (
                <li
                  key={d.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-neutral-800">{d.doel}</p>
                    <span className="rounded-full bg-pitch/10 px-2.5 py-0.5 text-xs font-semibold text-pitch">
                      {d.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-400">
                    Afgesproken op {d.afgesproken_op}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
              Nog geen doelen afgesproken. Die zet je samen met je coach.
            </p>
          )}
          </section>
        </div>
      </div>
    </main>
  );
}
