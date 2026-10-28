import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORMATIES } from "@/lib/formaties";
import { SITUATIES } from "@/lib/positietaken";
import { PositieTakenTabs } from "@/components/PositieTakenTabs";
import type { PositieTaak } from "@/lib/types/database";

export default async function PositieTakenPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const supabase = await createClient();
  const { data } = await supabase.from("positie_taken").select("*");
  const takenPerSituatie: Record<string, Record<string, string>> = {};
  for (const t of (data ?? []) as PositieTaak[]) {
    (takenPerSituatie[t.situatie] ??= {})[t.positie_code] = t.taken ?? "";
  }

  const posities = FORMATIES["4-3-3"];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar dashboard
      </Link>

      <h1 className="mt-4 mb-1 text-2xl font-bold text-sparta">Taken per positie</h1>
      <p className="mb-5 text-sm text-neutral-500">
        Alleen voor het 4-3-3. Vul per positie de taken in en klik op "Opslaan". Wisselen van
        tabblad is veilig (nog niet opgeslagen tekst blijft staan), maar de pagina verlaten of
        verversen zonder op te slaan verliest je wijzigingen.
      </p>

      <PositieTakenTabs situaties={SITUATIES} posities={posities} takenPerSituatie={takenPerSituatie} />
    </main>
  );
}
