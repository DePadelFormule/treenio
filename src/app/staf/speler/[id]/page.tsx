import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PlayerCard } from "@/components/PlayerCard";
import type {
  Badge,
  Ontwikkeldoel,
  Speler,
  SpelerRecord,
  StafNotitie,
} from "@/lib/types/database";

// Staf-only speler-detail. Toont alle drie de lagen READ-ONLY:
//   Laag 1 (kaartje), Laag 2 (ontwikkeldoelen), Laag 3 (staf-notities).
// De schrijf-flows (post-wedstrijd, functioneringsgesprek-split) volgen.
export default async function StafSpelerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { id } = await params;
  const supabase = await createClient();

  const { data: speler } = await supabase
    .from("spelers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!speler) notFound();

  const [{ data: badges }, { data: records }, { data: doelen }, { data: notities }] =
    await Promise.all([
      supabase.from("badges").select("*").eq("speler_id", id),
      supabase.from("records").select("*").eq("speler_id", id),
      supabase.from("ontwikkeldoelen").select("*").eq("speler_id", id),
      supabase.from("staf_notities").select("*").eq("speler_id", id),
    ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-pitch hover:underline">
        ← Terug naar selectie
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-[auto_1fr]">
        <div className="flex justify-center">
          <PlayerCard
            speler={speler as Speler}
            badges={(badges ?? []) as Badge[]}
            records={(records ?? []) as SpelerRecord[]}
          />
        </div>

        <div className="space-y-6">
          {/* Laag 2 */}
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-pitch">
              Laag 2 · Ontwikkeldoelen (speler ziet dit)
            </h2>
            {doelen && doelen.length ? (
              <ul className="space-y-2">
                {(doelen as Ontwikkeldoel[]).map((d) => (
                  <li key={d.id} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
                    <span className="font-medium">{d.doel}</span>
                    <span className="ml-2 text-xs text-neutral-400">({d.status})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-400">Nog geen doelen.</p>
            )}
          </section>

          {/* Laag 3 */}
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-red-600">
              Laag 3 · Staf-only (NOOIT zichtbaar voor speler)
            </h2>
            {notities && notities.length ? (
              <ul className="space-y-2">
                {(notities as StafNotitie[]).map((n) => (
                  <li key={n.id} className="rounded-lg border border-red-200 bg-red-50/50 p-3 text-sm">
                    {n.inschatting && <p><strong>Inschatting:</strong> {n.inschatting}</p>}
                    {n.verwachting && <p><strong>Verwachting:</strong> {n.verwachting}</p>}
                    {n.positie_inschatting && (
                      <p><strong>Positie:</strong> {n.positie_inschatting}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-400">Nog geen staf-notities.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
