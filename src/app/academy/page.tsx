import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { AcademyHoofdstuk } from "@/lib/types/database";

// Publieke pagina (geen inlog): overzicht van alle Academy-hoofdstukken.
export const dynamic = "force-dynamic";

export default async function AcademyPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("academy_hoofdstukken").select("*").order("volgorde", { ascending: true });
  const hoofdstukken = (data ?? []) as AcademyHoofdstuk[];

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6 text-center">
        <Image src="/logo.png" alt="Treenio" width={800} height={635} priority className="mx-auto mb-2 h-auto w-36" />
        <h1 className="text-xl font-bold text-sparta">Academy</h1>
        <p className="text-sm font-semibold text-neutral-700">Nivo Sparta JO17-2</p>
      </div>

      <p className="mb-6 rounded-xl bg-neutral-100 p-4 text-sm text-neutral-600">
        Het handboek van ons team: begrippen, afspraken en meer. Lees rustig terug wat je nodig hebt,
        en doe voor de fun de quiz per hoofdstuk.
      </p>

      {hoofdstukken.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Er staat nog niets in de Academy. Kom later terug.
        </p>
      ) : (
        <ul className="space-y-2">
          {hoofdstukken.map((h) => (
            <li key={h.id}>
              <Link
                href={`/academy/${h.id}`}
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
