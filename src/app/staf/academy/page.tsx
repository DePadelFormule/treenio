import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { nieuwHoofdstuk } from "./actions";
import type { AcademyHoofdstuk } from "@/lib/types/database";

export default async function AcademyBeheerPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const supabase = await createClient();
  const { data } = await supabase.from("academy_hoofdstukken").select("*").order("volgorde", { ascending: true });
  const hoofdstukken = (data ?? []) as AcademyHoofdstuk[];

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
          ← Terug naar dashboard
        </Link>
        <Link href="/academy" target="_blank" className="text-sm font-semibold text-sparta hover:underline">
          Bekijk publiek →
        </Link>
      </div>

      <h1 className="mt-4 mb-1 text-2xl font-bold text-sparta">Academy beheren</h1>
      <p className="mb-5 text-sm text-neutral-500">
        Hoofdstukken met tekst en een optionele quiz. Spelers lezen en doen de quiz zonder inlog via{" "}
        <span className="font-mono">/academy</span>.
      </p>

      <form action={nieuwHoofdstuk} className="mb-6 flex gap-2 rounded-xl border border-neutral-200 bg-white p-4">
        <input
          type="text" name="titel" required placeholder="Naam van het nieuwe hoofdstuk (bijv. Begrippenlijst)"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-sparta px-4 py-2 text-sm font-semibold text-white hover:bg-sparta-dark">
          + Hoofdstuk
        </button>
      </form>

      {hoofdstukken.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Nog geen hoofdstukken. Voeg er hierboven één toe.
        </p>
      ) : (
        <ul className="space-y-2">
          {hoofdstukken.map((h) => (
            <li key={h.id}>
              <Link
                href={`/staf/academy/${h.id}`}
                className="block rounded-xl border border-neutral-200 bg-white p-4 font-semibold text-neutral-800 hover:border-sparta hover:text-sparta"
              >
                {h.titel} <span className="text-sparta">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
