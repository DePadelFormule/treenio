import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AcademyTekst } from "@/components/AcademyTekst";
import type { AcademyHoofdstuk, AcademySectie, AcademyVraagPubliek } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function AcademyHoofdstukPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: hoofdstuk }, { data: secties }, { data: vragen }] = await Promise.all([
    supabase.from("academy_hoofdstukken").select("*").eq("id", id).maybeSingle(),
    supabase.from("academy_secties").select("*").eq("hoofdstuk_id", id).order("volgorde", { ascending: true }),
    supabase.rpc("academy_quiz_vragen", { p_hoofdstuk: id } as never),
  ]);
  if (!hoofdstuk) notFound();
  const h = hoofdstuk as AcademyHoofdstuk;
  const sectieLijst = (secties ?? []) as AcademySectie[];
  const heeftQuiz = ((vragen ?? []) as AcademyVraagPubliek[]).length > 0;

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <Link href="/academy" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar Academy
      </Link>

      <h1 className="mt-4 mb-5 text-xl font-bold text-sparta">{h.titel}</h1>

      {sectieLijst.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Dit hoofdstuk heeft nog geen inhoud.
        </p>
      ) : (
        <div className="space-y-4">
          {sectieLijst.map((s) => (
            <section key={s.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              {s.titel && <h2 className="mb-2 font-semibold text-neutral-800">{s.titel}</h2>}
              <AcademyTekst tekst={s.tekst} />
            </section>
          ))}
        </div>
      )}

      {heeftQuiz && (
        <Link
          href={`/academy/${id}/quiz`}
          className="mt-6 block rounded-xl bg-sparta px-4 py-3 text-center text-base font-semibold text-white hover:bg-sparta-dark"
        >
          🎯 Doe de quiz
        </Link>
      )}
    </main>
  );
}
