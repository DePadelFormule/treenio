import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { nieuweSpelsituatie } from "./actions";
import { CATEGORIEEN, alsCategorie } from "@/lib/tactiek/categorieen";
import type { Spelsituatie } from "@/lib/types/database";

type Rij = Pick<Spelsituatie, "id" | "titel" | "uitleg" | "half_veld" | "categorie" | "created_at">;

// Overzicht in twee lagen: tegels per categorie, en binnen een categorie de
// situaties met per situatie de twee paden: video (afspelen) of afbeelding
// (stilstaand storyboard). Beide komen uit dezelfde tekening.
export default async function SpelsituatiesPage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string }>;
}) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { categorie: gevraagd } = await searchParams;
  const gekozen = gevraagd ? alsCategorie(gevraagd) : null;

  const supabase = await createClient();
  const { data: rijen } = await supabase
    .from("spelsituaties")
    .select("id, titel, uitleg, half_veld, categorie, created_at")
    .order("created_at", { ascending: false });
  const situaties = ((rijen ?? []) as Rij[]).map((s) => ({ ...s, categorie: alsCategorie(s.categorie) }));

  const perCategorie = new Map<string, Rij[]>();
  for (const s of situaties) perCategorie.set(s.categorie, [...(perCategorie.get(s.categorie) ?? []), s]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar dashboard
      </Link>

      {gekozen === null ? (
        <>
          <h1 className="mt-4 mb-2 text-2xl font-bold text-sparta">Spelsituaties</h1>
          <p className="mb-6 text-sm text-neutral-500">
            Tactisch tekenbord per trainingsthema. Kies een categorie; elke situatie is af te spelen als video of te bekijken als afbeelding.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIEEN.map((c) => {
              const aantal = perCategorie.get(c.naam)?.length ?? 0;
              return (
                <Link
                  key={c.naam}
                  href={`/staf/spelsituaties?categorie=${encodeURIComponent(c.naam)}`}
                  className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:border-sparta hover:bg-red-50"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-neutral-800">{c.naam}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${aantal > 0 ? "bg-sparta text-white" : "bg-neutral-100 text-neutral-400"}`}>{aantal}</span>
                  </span>
                  <span className="mt-1 text-xs text-neutral-500">{c.uitleg}</span>
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 mb-1 flex flex-wrap items-baseline gap-x-3">
            <Link href="/staf/spelsituaties" className="text-sm text-neutral-500 hover:text-sparta hover:underline">Alle categorieën</Link>
            <span className="text-neutral-300">/</span>
            <h1 className="text-2xl font-bold text-sparta">{gekozen}</h1>
          </div>
          <p className="mb-5 text-sm text-neutral-500">{CATEGORIEEN.find((c) => c.naam === gekozen)?.uitleg}</p>

          {/* Nieuwe situatie in deze categorie */}
          <form action={nieuweSpelsituatie} className="mb-6 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-[1fr_auto_auto]">
            <input type="hidden" name="categorie" value={gekozen} />
            <input type="text" name="titel" placeholder="Titel (bijv. Kantelen bij bal links)" required className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm" />
            <select name="half_veld" className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm">
              <option value="heel">Heel veld</option>
              <option value="half">Half veld</option>
            </select>
            <button type="submit" className="rounded-lg bg-sparta px-4 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark">
              Maken →
            </button>
          </form>

          <ul className="space-y-2">
            {(perCategorie.get(gekozen) ?? []).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-800">{s.titel}</p>
                  <p className="text-xs text-neutral-400">{s.half_veld ? "half veld" : "heel veld"}{s.uitleg ? ` · ${s.uitleg}` : ""}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/staf/spelsituaties/${s.id}/bekijken`} className="rounded-lg bg-sparta px-3 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark">
                    ▶ Video
                  </Link>
                  <Link href={`/staf/spelsituaties/${s.id}/print`} className="rounded-lg border border-sparta px-3 py-1.5 text-sm font-semibold text-sparta hover:bg-red-50">
                    Afbeelding
                  </Link>
                  <Link href={`/staf/spelsituaties/${s.id}`} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-600 hover:border-neutral-500">
                    Bewerken
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          {(perCategorie.get(gekozen)?.length ?? 0) === 0 && (
            <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
              Nog geen situaties in {gekozen}. Maak er hierboven één aan.
            </p>
          )}
        </>
      )}
    </main>
  );
}
