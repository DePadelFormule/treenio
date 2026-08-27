import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AcademyQuizFormulier } from "@/components/AcademyQuizFormulier";
import type { AcademyHoofdstuk, AcademyVraagPubliek } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function AcademyQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: hoofdstuk }, { data: vragenData }, { data: spelersData }] = await Promise.all([
    supabase.from("academy_hoofdstukken").select("*").eq("id", id).maybeSingle(),
    supabase.rpc("academy_quiz_vragen", { p_hoofdstuk: id } as never),
    supabase.rpc("academy_spelers_voor_quiz", { p_hoofdstuk: id } as never),
  ]);
  if (!hoofdstuk) notFound();
  const h = hoofdstuk as AcademyHoofdstuk;
  const vragen = (vragenData ?? []) as AcademyVraagPubliek[];
  const spelers = (spelersData ?? []) as { id: string; naam: string; rugnummer: number | null }[];

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <Link href={`/academy/${id}`} className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar {h.titel}
      </Link>

      <h1 className="mt-4 mb-1 text-xl font-bold text-sparta">Quiz · {h.titel}</h1>
      <p className="mb-5 text-sm text-neutral-500">
        Voor de fun — je kunt de quiz maar één keer doen. Alleen trainers zien de uitslag, en gaan
        daar discreet mee om.
      </p>

      {vragen.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Deze quiz heeft nog geen vragen.
        </p>
      ) : spelers.length === 0 ? (
        <p className="rounded-xl bg-green-50 p-6 text-center text-sm text-green-700">
          Iedereen heeft deze quiz al gedaan. Top! ⚽
        </p>
      ) : (
        <AcademyQuizFormulier hoofdstukId={id} vragen={vragen} spelers={spelers} />
      )}
    </main>
  );
}
