import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AcademyHoofdstukKop } from "@/components/AcademyHoofdstukKop";
import { AcademySectiesBeheer } from "@/components/AcademySectiesBeheer";
import { AcademyVragenBeheer } from "@/components/AcademyVragenBeheer";
import type { AcademyHoofdstuk, AcademySectie, AcademyQuizvraag } from "@/lib/types/database";

export default async function AcademyHoofdstukBeheerPage({ params }: { params: Promise<{ id: string }> }) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { id } = await params;
  const supabase = await createClient();

  const [{ data: hoofdstuk }, { data: secties }, { data: vragen }, { data: resultaten }] = await Promise.all([
    supabase.from("academy_hoofdstukken").select("*").eq("id", id).maybeSingle(),
    supabase.from("academy_secties").select("*").eq("hoofdstuk_id", id).order("volgorde", { ascending: true }),
    supabase.from("academy_quizvragen").select("*").eq("hoofdstuk_id", id).order("volgorde", { ascending: true }),
    supabase.from("academy_quiz_resultaten").select("score, totaal").eq("hoofdstuk_id", id),
  ]);
  if (!hoofdstuk) notFound();
  const h = hoofdstuk as AcademyHoofdstuk;
  const sectieLijst = (secties ?? []) as AcademySectie[];
  const vraagLijst = ((vragen ?? []) as (Omit<AcademyQuizvraag, "opties"> & { opties: unknown })[]).map((v) => ({
    ...v, opties: Array.isArray(v.opties) ? (v.opties as string[]) : [],
  })) as AcademyQuizvraag[];
  const aantalGedaan = (resultaten ?? []).length;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <Link href="/staf/academy" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
          ← Terug naar Academy
        </Link>
        <Link href={`/academy/${id}`} target="_blank" className="text-sm font-semibold text-sparta hover:underline">
          Bekijk publiek →
        </Link>
      </div>

      <div className="mt-4">
        <AcademyHoofdstukKop id={id} beginTitel={h.titel} beginVolgorde={h.volgorde} />
      </div>

      <h2 className="mb-2 text-lg font-bold text-neutral-800">Inhoud</h2>
      <div className="mb-8">
        <AcademySectiesBeheer hoofdstukId={id} secties={sectieLijst} />
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold text-neutral-800">Quiz</h2>
        {aantalGedaan > 0 && (
          <span className="text-sm text-neutral-500">{aantalGedaan} speler{aantalGedaan === 1 ? "" : "s"} heeft dit al gedaan</span>
        )}
      </div>
      <p className="mb-3 text-xs text-neutral-400">
        Optioneel: zodra er minstens 1 vraag staat, krijgt de publieke pagina een "Doe de quiz"-knop.
      </p>
      <AcademyVragenBeheer hoofdstukId={id} vragen={vraagLijst} />
    </main>
  );
}
