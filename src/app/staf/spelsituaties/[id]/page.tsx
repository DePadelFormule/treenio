import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TekenBord } from "@/components/TekenBord";
import { verwijderSpelsituatie } from "../actions";
import { alsCategorie } from "@/lib/tactiek/categorieen";
import type { Spelsituatie } from "@/lib/types/database";

export default async function SpelsituatiePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { id } = await params;
  const supabase = await createClient();
  const { data: situatie } = await supabase
    .from("spelsituaties")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!situatie) notFound();
  const s = situatie as Spelsituatie;
  const categorie = alsCategorie(s.categorie);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-baseline gap-x-3 text-sm">
          <Link href={`/staf/spelsituaties?categorie=${encodeURIComponent(categorie)}`} className="text-neutral-500 hover:text-sparta hover:underline">
            ← {categorie}
          </Link>
          <Link href={`/staf/spelsituaties/${s.id}/bekijken`} className="text-sparta hover:underline">▶ Video</Link>
        </div>
        <form action={verwijderSpelsituatie}>
          <input type="hidden" name="id" value={s.id} />
          <button type="submit" className="text-sm text-neutral-400 hover:text-red-600">Verwijderen</button>
        </form>
      </div>

      <div className="mt-4">
        <TekenBord
          id={s.id}
          beginTitel={s.titel}
          beginUitleg={s.uitleg}
          beginHalfVeld={s.half_veld}
          beginCategorie={categorie}
          beginData={s.data}
        />
      </div>
    </main>
  );
}
