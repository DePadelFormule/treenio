import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { PrintKnop } from "@/components/PrintKnop";

// Leeg lesvoorbereidingsformulier om met pen in te vullen. Per blok een half
// veld om de oefening op te tekenen + schrijfregels voor de uitleg. De
// warming-up is standaard en staat er bewust niet op. Zonder datum
// voorgedrukt, dus in één keer een stapel te printen. Ingevuld? Foto maken op
// de Lesvoorbereiding-pagina → de AI zet de les in het archief.

// Vijf gelijke blokken (2× kern 1, 2× kern 2, afsluitingsvorm) — in de balk
// schrijft de trainer zelf het doel en de vorm.
const AANTAL_BLOKKEN = 5;

// Half speelveld (doel boven, middellijn onder) in lichtgrijs zodat pen en
// potlood goed leesbaar blijven.
function HalfVeld() {
  return (
    <svg viewBox="0 0 100 70" className="w-full" role="img" aria-label="Half speelveld">
      {/* doel */}
      <rect x="44" y="0.5" width="12" height="2.5" fill="none" stroke="#b3b3b3" strokeWidth="0.8" />
      {/* veldranden; onderkant = middellijn */}
      <rect x="2" y="3" width="96" height="64" fill="none" stroke="#999" strokeWidth="1" />
      {/* zestienmetergebied + doelgebied */}
      <rect x="28" y="3" width="44" height="17" fill="none" stroke="#b3b3b3" strokeWidth="0.8" />
      <rect x="40" y="3" width="20" height="7" fill="none" stroke="#b3b3b3" strokeWidth="0.8" />
      {/* strafschopstip + boog */}
      <circle cx="50" cy="15" r="0.9" fill="#b3b3b3" />
      <path d="M 42 20 A 9 9 0 0 0 58 20" fill="none" stroke="#b3b3b3" strokeWidth="0.8" />
      {/* halve middencirkel op de middellijn */}
      <path d="M 41 67 A 9 9 0 0 1 59 67" fill="none" stroke="#b3b3b3" strokeWidth="0.8" />
    </svg>
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
      <header className="mb-3 border-b-2 border-sparta pb-2 break-inside-avoid">
        <h1 className="text-lg font-bold text-sparta">Lesvoorbereiding · Nivo Sparta JO17-2</h1>
        <p className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-neutral-700">
          <span>Datum: __________</span>
          <span>Thema: ____________________</span>
          <span>Spelers: ____</span>
          <span>Duur: ____ min</span>
        </p>
        <p className="mt-1 flex gap-6 text-[13px] text-neutral-700">
          <span>Doelstelling: ______________________________________________</span>
        </p>
        <p className="mt-1 text-[11px] text-neutral-400">
          Half veld · materiaal vrij te kiezen · warming-up is standaard (niet noteren)
        </p>
      </header>

      {/* Vijf blokken: tekenveld + uitlegregels; doel en vorm in de balk */}
      {Array.from({ length: AANTAL_BLOKKEN }, (_, i) => (
        <section key={i} className="mb-3 break-inside-avoid">
          <h2 className="mb-1.5 flex flex-wrap items-center gap-x-4 rounded bg-neutral-100 px-2 py-1 text-[13px] font-bold text-neutral-800 print:bg-neutral-100">
            <span>Doel: ________________________</span>
            <span>Vorm: ______________________</span>
            <span className="ml-auto text-[11px] font-semibold text-neutral-400">____ min</span>
          </h2>
          <div className="flex gap-4">
            <div className="w-[44%] shrink-0">
              <HalfVeld />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Uitleg &amp; organisatie</p>
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="h-[1.35rem] border-b border-neutral-300" />
              ))}
            </div>
          </div>
        </section>
      ))}

      <p className="mt-4 text-[10px] text-neutral-400">
        Treenio · teken de oefening op het halve veld en schrijf de uitleg ernaast — na afloop
        foto maken op de Lesvoorbereiding-pagina en de les staat in het archief.
      </p>
    </main>
  );
}
