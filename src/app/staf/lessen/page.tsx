import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { verwijderLes } from "@/app/staf/lesgenerator/actions";
import { VerwijderKnop } from "@/components/VerwijderKnop";
import type { OpgeslagenLes } from "@/lib/types/database";

export default async function LessenPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");
  if (!gebruiker.staf?.mag_conclusie) redirect("/staf");

  const supabase = await createClient();
  const { data: lessen } = await supabase
    .from("lessen")
    .select("id, titel, sport, onderwerp, datum, created_at")
    .order("created_at", { ascending: false });

  const lijst = (lessen ?? []) as Omit<OpgeslagenLes, "les">[];

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar dashboard
      </Link>

      <div className="mt-4 mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-sparta">Lessenarchief</h1>
          <p className="text-sm text-neutral-500">
            Bewaarde trainingen uit de AI-lesgenerator. Herhaling is goud: pak gerust een eerdere les erbij.
          </p>
        </div>
        <Link
          href="/staf/lesgenerator"
          className="shrink-0 rounded-lg bg-sparta px-3 py-2 text-sm font-semibold text-white hover:bg-sparta-dark"
        >
          Nieuwe les →
        </Link>
      </div>

      {lijst.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Nog geen bewaarde lessen. Genereer een les en klik op &quot;Les bewaren&quot;.
        </p>
      ) : (
        <ul className="space-y-2">
          {lijst.map((l) => (
            <li key={l.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
              <Link href={`/staf/lessen/${l.id}`} className="min-w-0 flex-1 group">
                <p className="truncate font-medium text-neutral-800 group-hover:text-sparta">{l.titel}</p>
                <p className="text-xs text-neutral-400">
                  <span className="capitalize">{l.sport}</span> · {l.onderwerp}
                  {l.datum ? ` · training ${l.datum}` : ""}
                </p>
              </Link>
              <VerwijderKnop
                action={verwijderLes}
                id={l.id}
                bevestig={`Les "${l.titel}" verwijderen uit het archief?`}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
