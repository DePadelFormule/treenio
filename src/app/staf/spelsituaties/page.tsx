import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { nieuweSpelsituatie } from "./actions";
import type { Spelsituatie } from "@/lib/types/database";

export default async function SpelsituatiesPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const supabase = await createClient();
  const { data: situaties } = await supabase
    .from("spelsituaties")
    .select("id, titel, uitleg, half_veld, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar dashboard
      </Link>

      <h1 className="mt-4 mb-2 text-2xl font-bold text-sparta">Spelsituaties</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Tactisch tekenbord: zet magneetjes neer, maak met stappen een beweging en speel 'm af.
      </p>

      {/* Nieuwe situatie */}
      <form action={nieuweSpelsituatie} className="mb-8 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-[1fr_auto_auto]">
        <input type="text" name="titel" placeholder="Titel (bijv. Kantelen bij bal links)" required className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm" />
        <select name="half_veld" className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="heel">Heel veld</option>
          <option value="half">Half veld</option>
        </select>
        <button type="submit" className="rounded-lg bg-sparta px-4 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark">
          Maken →
        </button>
      </form>

      <ul className="space-y-2">
        {((situaties ?? []) as Spelsituatie[]).map((s) => (
          <li key={s.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
            <div>
              <p className="font-medium text-neutral-800">{s.titel}</p>
              <p className="text-xs text-neutral-400">{s.half_veld ? "half veld" : "heel veld"}{s.uitleg ? ` · ${s.uitleg}` : ""}</p>
            </div>
            <Link href={`/staf/spelsituaties/${s.id}`} className="rounded-lg bg-sparta px-3 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark">
              Openen →
            </Link>
          </li>
        ))}
      </ul>

      {(!situaties || situaties.length === 0) && (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Nog geen situaties. Maak er hierboven één aan.
        </p>
      )}
    </main>
  );
}
