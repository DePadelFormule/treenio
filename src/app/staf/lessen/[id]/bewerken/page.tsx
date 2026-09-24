import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LesBewerkFormulier } from "@/components/LesBewerkFormulier";
import type { OpgeslagenLes } from "@/lib/types/database";
import type { Les } from "@/lib/lesgenerator/schema";

export default async function LesBewerkenPage({ params }: { params: Promise<{ id: string }> }) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");
  if (!gebruiker.staf?.mag_conclusie) redirect("/staf");

  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("lessen").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  const rij = data as OpgeslagenLes;
  const les = rij.les as Les;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/staf/lessen/${id}`} className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar de les
      </Link>

      <h1 className="mt-4 mb-1 text-2xl font-bold text-sparta">Les bewerken</h1>
      <p className="mb-5 text-sm text-neutral-500">
        Tekeningen per blok worden hier niet aangepast — de rest van de inhoud wel.
      </p>

      <LesBewerkFormulier lesId={id} begin={les} beginDatum={rij.datum} />
    </main>
  );
}
