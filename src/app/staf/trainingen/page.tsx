import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PresentieRooster } from "@/components/PresentieRooster";
import { verwijderTraining } from "./actions";
import type { Speler, Training, TrainingRegistratie } from "@/lib/types/database";

export default async function TrainingenPage({
  searchParams,
}: {
  searchParams: Promise<{ maand?: string }>;
}) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { maand } = await searchParams;

  const supabase = await createClient();
  const [{ data: spelers }, { data: trainingen }, { data: regs }] = await Promise.all([
    supabase.from("spelers").select("*").order("rugnummer", { ascending: true, nullsFirst: false }),
    supabase.from("trainingen").select("id, datum").order("datum", { ascending: true }),
    supabase.from("training_registraties").select("training_id, speler_id, status, materiaal_ontbreekt"),
  ]);

  const trainLijst = ((trainingen ?? []) as { id: string; datum: string }[]);

  // Startmaand: uit de URL, anders de maand van vandaag (Nederlandse tijd),
  // zodat je in september meteen september ziet. Nooit vóór augustus, de
  // start van het seizoen.
  const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }); // YYYY-MM-DD
  let startMaand = maand ?? vandaag.slice(0, 7);
  if (startMaand < "2026-08") startMaand = "2026-08";

  const begin: Record<string, string> = {};
  const beginMateriaal: Record<string, boolean> = {};
  for (const r of (regs ?? []) as Pick<TrainingRegistratie, "training_id" | "speler_id" | "status" | "materiaal_ontbreekt">[]) {
    if (r.status) begin[`${r.training_id}:${r.speler_id}`] = r.status;
    if (r.materiaal_ontbreekt) beginMateriaal[`${r.training_id}:${r.speler_id}`] = true;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar dashboard
      </Link>

      <h1 className="mt-4 mb-1 text-2xl font-bold text-sparta">Trainingspresentie</h1>
      <p className="mb-5 text-sm text-neutral-500">
        Kies een maand, genereer de di/do-trainingen en tik per speler de status aan.
      </p>

      <PresentieRooster
        spelers={((spelers ?? []) as Speler[])
          .filter((s) => !s.gast)
          .map((s) => ({ id: s.id, naam: s.naam, rugnummer: s.rugnummer }))}
        trainingen={trainLijst}
        begin={begin}
        beginMateriaal={beginMateriaal}
        startMaand={startMaand}
        vandaag={vandaag}
        onVerwijder={verwijderTraining}
      />
    </main>
  );
}
