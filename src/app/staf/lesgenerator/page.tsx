import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { LesGenerator } from "@/components/LesGenerator";
import { LesFotoVoorlezen } from "@/components/LesFotoVoorlezen";

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
      <div className="flex items-center justify-between print:hidden">
        <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
          ← Terug naar dashboard
        </Link>
        <span className="flex gap-4">
          <Link href="/staf/lesgenerator/invullen" className="text-sm font-semibold text-sparta hover:underline">
            ✍️ Digitaal formulier
          </Link>
          <Link href="/staf/lesgenerator/formulier" className="text-sm font-semibold text-sparta hover:underline">
            📝 Leeg formulier (print)
          </Link>
        </span>
      </div>

      <h1 className="mb-1 mt-4 text-2xl font-bold text-sparta print:hidden">Lesvoorbereiding</h1>
      <p className="mb-5 text-sm text-neutral-500 print:hidden">
        Zelf op papier voorbereiden (leeg formulier printen, invullen, foto maken) of de AI een
        complete training laten schrijven. Alles komt in het lessenarchief.
      </p>

      <LesFotoVoorlezen />

      <h2 className="mb-2 text-sm font-semibold text-neutral-700 print:hidden">Of laat de AI een les schrijven</h2>
      <LesGenerator />
    </main>
  );
}
