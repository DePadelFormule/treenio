import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { LesGenerator } from "@/components/LesGenerator";

// De AI-aanroep kan tot ~30s duren; geef de serverless-functie ruimte.
export const maxDuration = 60;

export default async function LesGeneratorPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");
  // Alleen de hoofdtrainer: elke gegenereerde les kost geld (API-tegoed).
  if (!gebruiker.staf?.mag_conclusie) redirect("/staf");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline print:hidden">
        ← Terug naar dashboard
      </Link>

      <h1 className="mb-1 mt-4 text-2xl font-bold text-sparta print:hidden">AI-lesgenerator</h1>
      <p className="mb-5 text-sm text-neutral-500 print:hidden">
        Kies sport en onderwerp; de AI maakt een complete, direct uitvoerbare training met blokken,
        coachpunten en een leeskaart. Maak er daarna een uitdraai van.
      </p>

      <LesGenerator />
    </main>
  );
}
