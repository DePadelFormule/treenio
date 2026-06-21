import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { nieuweTraining } from "./actions";
import type { Training } from "@/lib/types/database";

export default async function TrainingenPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const supabase = await createClient();
  const { data: trainingen } = await supabase
    .from("trainingen")
    .select("*")
    .order("datum", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-pitch hover:underline">
        ← Terug naar dashboard
      </Link>

      <h1 className="mt-4 mb-6 text-2xl font-bold text-pitch">Trainingen</h1>

      {/* Nieuwe training */}
      <form action={nieuweTraining} className="mb-8 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-[auto_1fr_auto]">
        <input type="date" name="datum" required className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        <input type="text" name="type" placeholder="Type (bijv. veldtraining)" className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        <button type="submit" className="rounded-lg bg-pitch px-4 py-1.5 text-sm font-semibold text-white hover:bg-pitch-dark">
          Toevoegen
        </button>
      </form>

      <ul className="space-y-2">
        {((trainingen ?? []) as Training[]).map((t) => (
          <li key={t.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
            <div>
              <p className="font-medium text-neutral-800">{t.datum}</p>
              <p className="text-xs text-neutral-400">{t.type ?? "training"}</p>
            </div>
            <Link
              href={`/staf/training/${t.id}`}
              className="rounded-lg bg-pitch px-3 py-1.5 text-sm font-semibold text-white hover:bg-pitch-dark"
            >
              Presentie →
            </Link>
          </li>
        ))}
      </ul>

      {(!trainingen || trainingen.length === 0) && (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Nog geen trainingen. Voeg er hierboven één toe.
        </p>
      )}
    </main>
  );
}
