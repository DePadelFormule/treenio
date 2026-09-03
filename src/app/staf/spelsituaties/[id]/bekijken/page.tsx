import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PlayViewer from "@/components/tactiek/PlayViewer";
import { naarPlayData } from "@/lib/tactiek/vanBordData";
import { alsCategorie } from "@/lib/tactiek/categorieen";
import type { Spelsituatie } from "@/lib/types/database";

// Het videopad: de situatie afspelen zonder tekenbord eromheen. Voor op het
// veld of in de kleedkamer, met de stappen ernaast.
export default async function SpelsituatieBekijkenPage({ params }: { params: Promise<{ id: string }> }) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { id } = await params;
  const supabase = await createClient();
  const { data: situatie } = await supabase.from("spelsituaties").select("*").eq("id", id).maybeSingle();
  if (!situatie) notFound();
  const s = situatie as Spelsituatie;
  const categorie = alsCategorie(s.categorie);
  const play = naarPlayData(s.data, s.half_veld, s.titel, s.uitleg ?? "");

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <Link href={`/staf/spelsituaties?categorie=${encodeURIComponent(categorie)}`} className="text-sm text-neutral-500 hover:text-sparta hover:underline">
            ← {categorie}
          </Link>
        </div>
        <div className="flex gap-2">
          <Link href={`/staf/spelsituaties/${id}/print`} className="rounded-lg border border-sparta px-3 py-1.5 text-sm font-semibold text-sparta hover:bg-red-50">Afbeelding</Link>
          <Link href={`/staf/spelsituaties/${id}`} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-600 hover:border-neutral-500">Bewerken</Link>
        </div>
      </div>

      <h1 className="mt-4 text-2xl font-bold text-sparta">{s.titel || "Spelsituatie"}</h1>
      {s.uitleg && <p className="mt-1 mb-4 text-sm text-neutral-600">{s.uitleg}</p>}

      <div className="mt-4">
        <PlayViewer play={play} veld={s.half_veld ? "half" : "heel"} />
      </div>
    </main>
  );
}
