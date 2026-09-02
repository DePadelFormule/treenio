import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TekenBord } from "@/components/TekenBord";
import { verwijderSpelsituatie } from "../actions";
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between">
        <Link href="/staf/spelsituaties" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
          ← Terug naar situaties
        </Link>
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
          beginData={s.data}
        />
      </div>
    </main>
  );
}
