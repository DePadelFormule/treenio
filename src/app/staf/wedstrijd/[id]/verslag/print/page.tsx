import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PrintKnop } from "@/components/PrintKnop";
import type { Wedstrijd, WedstrijdVerslag, WedstrijdScouting } from "@/lib/types/database";

// Printbare A4-versie van het teamverslag + de tegenstander-scouting.
// Compact gezet zodat alles op één pagina past; via de printdialoog ook als
// PDF te bewaren.

const DRUK_LABEL: Record<string, string> = {
  hoog: "Hoog druk zetten",
  inzakken: "Inzakken",
  wisselend: "Wisselend",
};

function Blok({ titel, tekst }: { titel: string; tekst: string | null | undefined }) {
  return (
    <div className="mb-2 break-inside-avoid">
      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{titel}</p>
      <p className="whitespace-pre-wrap text-[13px] leading-snug text-neutral-800">{tekst?.trim() || "—"}</p>
    </div>
  );
}

export default async function VerslagPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { id } = await params;
  const supabase = await createClient();

  const { data: wedstrijd } = await supabase
    .from("wedstrijden").select("*").eq("id", id).maybeSingle();
  if (!wedstrijd) notFound();
  const w = wedstrijd as Wedstrijd;

  const [{ data: verslagRij }, { data: scoutingRij }] = await Promise.all([
    supabase.from("wedstrijd_verslag").select("*").eq("wedstrijd_id", id).maybeSingle(),
    supabase.from("wedstrijd_scouting").select("*").eq("wedstrijd_id", id).maybeSingle(),
  ]);
  const verslag = verslagRij as WedstrijdVerslag | null;
  const scouting = scoutingRij as WedstrijdScouting | null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/staf/wedstrijd/${id}/verslag`} className="text-sm text-neutral-500 hover:text-sparta hover:underline">
          ← Terug naar verslag
        </Link>
        <PrintKnop />
      </div>

      {/* Kop */}
      <header className="mb-4 border-b-2 border-sparta pb-2">
        <h1 className="text-xl font-bold text-sparta">
          Wedstrijdverslag · Nivo Sparta JO17-2 – {w.tegenstander}
        </h1>
        <p className="text-[13px] text-neutral-600">
          {w.datum}
          {w.tijd ? ` · ${w.tijd} uur` : ""}
          {w.type === "beker" ? " · Beker" : w.type === "vriendschappelijk" ? " · Vriendschappelijk" : ""}
          {w.uitslag ? ` · Uitslag: ${w.uitslag} (wij-tegen)` : ""}
        </p>
      </header>

      {/* Teamverslag */}
      <section className="mb-4 break-inside-avoid">
        <h2 className="mb-1.5 rounded bg-neutral-100 px-2 py-1 text-sm font-bold text-neutral-800 print:bg-neutral-100">
          Teamverslag
        </h2>
        <Blok titel="Wat ging goed" tekst={verslag?.ging_goed} />
        <Blok titel="Wat kan beter" tekst={verslag?.kan_beter} />
        <Blok titel="Meenemen naar de training" tekst={verslag?.voor_training} />
      </section>

      {/* Tegenstander */}
      <section className="break-inside-avoid">
        <h2 className="mb-1.5 rounded bg-neutral-100 px-2 py-1 text-sm font-bold text-neutral-800 print:bg-neutral-100">
          Tegenstander · {w.tegenstander}
        </h2>
        <div className="grid grid-cols-2 gap-x-6">
          <Blok titel="Systeem" tekst={scouting?.systeem_tegenstander} />
          <Blok titel="Druk zetten" tekst={scouting?.drukzetten ? DRUK_LABEL[scouting.drukzetten] : null} />
        </div>
        <Blok titel="Omschakeling & counter" tekst={scouting?.omschakeling} />
        <Blok titel="Vaste spelmomenten" tekst={scouting?.standaardsituaties} />
        <div className="grid grid-cols-2 gap-x-6">
          <Blok titel="Opvallend sterk" tekst={scouting?.uitblinkers} />
          <Blok titel="Opvallend zwak" tekst={scouting?.zwakke_schakel} />
        </div>
        <Blok titel="Overige opmerkingen" tekst={scouting?.eigen_opmerking} />
      </section>

      <p className="mt-6 text-[10px] text-neutral-400">
        Treenio · intern document voor de staf van Nivo Sparta JO17-2
      </p>
    </main>
  );
}
