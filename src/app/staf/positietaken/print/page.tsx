import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SITUATIES, situatieNaam, POSITIE_VOLGORDE } from "@/lib/positietaken";
import { PrintKnop } from "@/components/PrintKnop";
import { PositieKaartVeld } from "@/components/PositieKaartVeld";
import type { PositieTaak } from "@/lib/types/database";

// Printbare kaartjes: één per positie. Op scherm direct bewerkbaar (volledige
// tekst zichtbaar, vak groeit mee) zodat je nog kunt schrappen/aanvullen
// voordat je print. Via de printdialoog ("Bewaar als PDF") te downloaden of
// direct te printen en uit te delen.
export default async function PositieTakenPrintPage({
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

  const posities = POSITIE_VOLGORDE.map((p) => ({ key: p.code, label: `${p.nummer}. ${p.naam}` }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/staf/positietaken" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
          ← Terug naar taken per positie
        </Link>
        <PrintKnop />
      </div>

      <header className="mb-4 border-b-2 border-sparta pb-2">
        <h1 className="text-lg font-bold text-sparta">Taken per positie — {situatieNaam(situatie)}</h1>
        <p className="mt-1 text-[11px] text-neutral-400">Nivo Sparta JO17-2 · 4-3-3</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {posities.map((p) => (
          <PositieKaartVeld
            key={p.key}
            positieCode={p.key}
            positieLabel={p.label}
            situatie={situatie}
            begin={takenPerPositie.get(p.key) ?? ""}
          />
        ))}
      </div>

      <p className="mt-4 text-[10px] text-neutral-400">Treenio · uitgeprint vanuit Taken per positie</p>
    </main>
  );
}
