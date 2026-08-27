import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { PrintKnop } from "@/components/PrintKnop";

// Leeg lesvoorbereidingsformulier (A4) om met pen in te vullen. Zonder datum
// voorgedrukt, dus in één keer een stapel te printen. Ingevuld? Foto maken op
// de Lesvoorbereiding-pagina → de AI zet de les in het archief.

const BLOKKEN = [
  { naam: "Warming-up", regelsOrganisatie: 2 },
  { naam: "Oefenvorm 1", regelsOrganisatie: 3 },
  { naam: "Oefenvorm 2", regelsOrganisatie: 3 },
  { naam: "Partijvorm / afsluiting", regelsOrganisatie: 2 },
];

function Regels({ n }: { n: number }) {
  return (
    <div>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="h-6 border-b border-neutral-300" />
      ))}
    </div>
  );
}

export default async function LesFormulierPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");
  if (!gebruiker.staf?.mag_conclusie) redirect("/staf");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/staf/lesgenerator" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
          ← Terug naar lesvoorbereiding
        </Link>
        <PrintKnop />
      </div>
      <p className="mb-4 text-xs text-neutral-400 print:hidden">
        Tip: kies in de printdialoog het aantal kopieën voor een stapel. Ingevuld formulier?
        Maak er een foto van op de Lesvoorbereiding-pagina; de les komt dan in het archief.
      </p>

      {/* Kop */}
      <header className="mb-3 border-b-2 border-sparta pb-2">
        <h1 className="text-lg font-bold text-sparta">Lesvoorbereiding · Nivo Sparta JO17-2</h1>
        <p className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-neutral-700">
          <span>Datum: __________</span>
          <span>Thema: ____________________</span>
          <span>Spelers: ____</span>
          <span>Duur: ____ min</span>
        </p>
        <p className="mt-1 text-[11px] text-neutral-400">Half veld · materiaal vrij te kiezen</p>
      </header>

      {/* Lesblokken */}
      {BLOKKEN.map((blok) => (
        <section key={blok.naam} className="mb-3 break-inside-avoid">
          <h2 className="mb-1 flex items-center justify-between rounded bg-neutral-100 px-2 py-1 text-sm font-bold text-neutral-800 print:bg-neutral-100">
            {blok.naam}
            <span className="text-[11px] font-semibold text-neutral-400">____ min</span>
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Doel</p>
          <Regels n={1} />
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-500">Organisatie &amp; uitleg</p>
          <Regels n={blok.regelsOrganisatie} />
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-500">Coachpunten</p>
          <Regels n={2} />
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-500">Materiaal</p>
          <Regels n={1} />
        </section>
      ))}

      <p className="mt-4 text-[10px] text-neutral-400">
        Treenio · schrijf duidelijk — na de training foto maken op de Lesvoorbereiding-pagina en
        de les staat in het archief.
      </p>
    </main>
  );
}
