import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LiveWedstrijd } from "@/components/LiveWedstrijd";
import type { Speler, Wedstrijd, WedstrijdOpstelling, WedstrijdEvent } from "@/lib/types/database";

export default async function LivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { id } = await params;
  const supabase = await createClient();

  const { data: wedstrijd } = await supabase
    .from("wedstrijden").select("*").eq("id", id).maybeSingle();
  if (!wedstrijd) notFound();
  const w = wedstrijd as Wedstrijd;

  const [{ data: spelers }, { data: opstelling }, { data: events }, { data: registraties }] = await Promise.all([
    supabase.from("spelers").select("id, naam, rugnummer").order("rugnummer", { ascending: true, nullsFirst: false }),
    supabase.from("wedstrijd_opstelling").select("veld, bank").eq("wedstrijd_id", id).maybeSingle(),
    supabase.from("wedstrijd_events").select("*").eq("wedstrijd_id", id).order("minuut", { ascending: true }),
    supabase.from("wedstrijd_registraties").select("speler_id, speelminuten"),
  ]);

  // Seizoenstotaal speelminuten per speler — voor eerlijk wisselen in de
  // spelerkiezer (wie het minst speelde staat bovenaan bij "wissel in").
  const minutenSeizoen: Record<string, number> = {};
  for (const r of (registraties ?? []) as { speler_id: string; speelminuten: number | null }[]) {
    minutenSeizoen[r.speler_id] = (minutenSeizoen[r.speler_id] ?? 0) + (r.speelminuten ?? 0);
  }

  const o = opstelling as Pick<WedstrijdOpstelling, "veld" | "bank"> | null;
  const basisIds = o ? Object.values(o.veld ?? {}).filter(Boolean) : [];
  const bankIds = o?.bank ?? [];

  const beginEvents = ((events ?? []) as WedstrijdEvent[]).map((e) => ({
    id: e.id, type: e.type, speler_id: e.speler_id, minuut: e.minuut,
  }));

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between">
        <Link href="/staf/wedstrijden" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
          ← Terug naar wedstrijden
        </Link>
        <Link href={`/staf/wedstrijd/${id}/opstelling`} className="text-sm font-semibold text-sparta hover:underline">
          Opstelling →
        </Link>
      </div>

      <h1 className="mt-3 mb-4 text-2xl font-bold text-sparta">Live · {w.tegenstander}</h1>

      <LiveWedstrijd
        wedstrijdId={id}
        kop={`${w.datum} · ${w.tegenstander}`}
        spelers={((spelers ?? []) as Pick<Speler, "id" | "naam" | "rugnummer">[]).map((s) => ({ id: s.id, naam: s.naam, rugnummer: s.rugnummer }))}
        basisIds={basisIds}
        bankIds={bankIds}
        beginEvents={beginEvents}
        minutenSeizoen={minutenSeizoen}
      />
    </main>
  );
}
