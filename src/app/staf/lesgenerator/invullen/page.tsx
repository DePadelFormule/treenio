import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { LesInvulFormulier } from "@/components/LesInvulFormulier";

// Digitaal lesvoorbereidingsformulier: zelfde opzet als het papieren A4
// (doel/vorm/minuten/uitleg per blok), handmatig in te vullen → archief.
export default async function LesInvullenPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");
  if (!gebruiker.staf?.mag_conclusie) redirect("/staf");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/staf/lesgenerator" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar lesvoorbereiding
      </Link>

      <h1 className="mb-1 mt-4 text-2xl font-bold text-sparta">Digitaal lesformulier</h1>
      <p className="mb-5 text-sm text-neutral-500">
        Zelfde formulier als op papier, maar dan typen: per blok het doel, de vorm, de minuten en
        de uitleg. Opslaan zet de les in het lessenarchief.
      </p>

      <LesInvulFormulier />
    </main>
  );
}
