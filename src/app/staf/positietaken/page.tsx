import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORMATIES } from "@/lib/formaties";
import { SITUATIES, situatieNaam } from "@/lib/positietaken";
import { PositieTaakVeld } from "@/components/PositieTaakVeld";
import type { PositieTaak } from "@/lib/types/database";

export default async function PositieTakenPage({
  searchParams,
}: {
  searchParams: Promise<{ situatie?: string }>;
}) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { situatie: situatieParam } = await searchParams;
  const situatie = SITUATIES.some((s) => s.key === situatieParam) ? situatieParam! : SITUATIES[0].key;

  const supabase = await createClient();
  const { data } = await supabase.from("positie_taken").select("*").eq("situatie", situatie);
  const takenPerPositie = new Map(((data ?? []) as PositieTaak[]).map((t) => [t.positie_code, t.taken ?? ""]));

  const posities = FORMATIES["4-3-3"];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar dashboard
      </Link>

      <div className="mt-4 mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sparta">Taken per positie</h1>
        <Link href={`/staf/positietaken/print?situatie=${situatie}`} className="text-sm font-semibold text-sparta hover:underline">
          🖨 Printbare kaartjes →
        </Link>
      </div>
      <p className="mb-5 text-sm text-neutral-500">
        Alleen voor het 4-3-3. Vul per positie de taken in voor de gekozen situatie.
      </p>

      {SITUATIES.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {SITUATIES.map((s) => (
            <Link
              key={s.key}
              href={`/staf/positietaken?situatie=${s.key}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                situatie === s.key ? "bg-sparta text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {s.naam}
            </Link>
          ))}
        </div>
      )}
      {SITUATIES.length <= 1 && (
        <p className="mb-5 text-sm font-semibold text-neutral-700">{situatieNaam(situatie)}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {posities.map((p) => (
          <PositieTaakVeld
            key={p.key}
            positieCode={p.key}
            positieLabel={p.label}
            situatie={situatie}
            begin={takenPerPositie.get(p.key) ?? ""}
          />
        ))}
      </div>
    </main>
  );
}
